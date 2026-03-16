from __future__ import annotations

import json
from collections import defaultdict
from datetime import timedelta
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.edge.models import EdgeUpdateEvent


TERMINAL_ATTEMPT_STATUSES = {"healthy", "failed", "rolled_back"}


def _iso(dt):
    if not dt:
        return None
    return dt.isoformat()


def _classify_attempt(status_set: set[str], event_set: set[str]) -> str:
    if "failed" in status_set or "edge_update_failed" in event_set:
        return "failed"
    if "rolled_back" in status_set or "edge_update_rolled_back" in event_set:
        return "rolled_back"
    if "healthy" in status_set or "edge_update_healthy" in event_set:
        return "healthy"
    return "incomplete"


class Command(BaseCommand):
    help = "Gera pacote operacional de validacao S4 (auto-update) com timeline por tentativa e decisao GO/NO-GO."

    def add_arguments(self, parser):
        parser.add_argument("--store-id", type=str, default=None, help="Store UUID especifica (opcional).")
        parser.add_argument("--hours", type=int, default=72, help="Janela de analise em horas.")
        parser.add_argument(
            "--channel",
            type=str,
            default="all",
            choices=["all", "stable", "canary"],
            help="Filtro de canal de rollout.",
        )
        parser.add_argument("--max-events", type=int, default=10000, help="Limite maximo de eventos lidos.")
        parser.add_argument(
            "--output",
            type=str,
            default=None,
            help="Arquivo markdown de saida. Default: dalevision-specs/70_ops/S4_Field_Validation_Pack_YYYY-MM-DD.md",
        )
        parser.add_argument(
            "--json-output",
            type=str,
            default=None,
            help="Arquivo JSON opcional para auditoria/automacao.",
        )

    def handle(self, *args, **options):
        store_id = options.get("store_id")
        hours = max(int(options.get("hours") or 72), 1)
        channel = str(options.get("channel") or "all")
        max_events = max(int(options.get("max_events") or 10000), 100)
        now = timezone.now()
        cutoff = now - timedelta(hours=hours)

        qs = EdgeUpdateEvent.objects.filter(timestamp__gte=cutoff)
        if store_id:
            qs = qs.filter(store_id=store_id)
        if channel in {"stable", "canary"}:
            qs = qs.filter(channel=channel)

        rows = list(
            qs.order_by("store_id", "attempt", "timestamp").values(
                "id",
                "store_id",
                "agent_id",
                "from_version",
                "to_version",
                "channel",
                "status",
                "phase",
                "event",
                "attempt",
                "reason_code",
                "reason_detail",
                "timestamp",
            )[:max_events]
        )

        grouped: dict[str, dict[tuple, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
        for row in rows:
            key = (
                int(row.get("attempt") or 1),
                str(row.get("to_version") or ""),
                str(row.get("agent_id") or ""),
            )
            grouped[str(row["store_id"])][key].append(row)

        stores_summary = []
        attempts_table = []
        total_attempts = 0
        healthy_attempts = 0
        failed_attempts = 0
        rollback_attempts = 0
        incomplete_attempts = 0
        terminal_durations: list[int] = []

        for store_key, attempts in grouped.items():
            store_attempts = []
            store_has_healthy = False
            store_has_failure = False
            store_has_rollback = False

            for attempt_key, events in attempts.items():
                total_attempts += 1
                attempt_no, to_version, agent_id = attempt_key
                event_names = [str(item.get("event") or "") for item in events]
                event_set = set(event_names)
                status_set = {str(item.get("status") or "") for item in events}
                reason_codes = sorted(
                    {str(item.get("reason_code")) for item in events if item.get("reason_code")}
                )

                final_status = _classify_attempt(status_set, event_set)
                is_healthy = final_status == "healthy"
                is_failed = final_status == "failed"
                has_rollback = final_status == "rolled_back"

                if is_healthy:
                    healthy_attempts += 1
                    store_has_healthy = True
                elif is_failed:
                    failed_attempts += 1
                    store_has_failure = True
                elif has_rollback:
                    rollback_attempts += 1
                    store_has_rollback = True
                else:
                    incomplete_attempts += 1

                first_ts = events[0].get("timestamp")
                last_ts = events[-1].get("timestamp")
                duration_seconds = None
                if first_ts and last_ts:
                    duration_seconds = max(0, int((last_ts - first_ts).total_seconds()))
                    if final_status in TERMINAL_ATTEMPT_STATUSES:
                        terminal_durations.append(duration_seconds)

                item = {
                    "store_id": store_key,
                    "attempt": attempt_no,
                    "agent_id": agent_id or None,
                    "channel": str(events[-1].get("channel") or ""),
                    "from_version": str(events[-1].get("from_version") or ""),
                    "to_version": to_version or None,
                    "first_event_at": _iso(first_ts),
                    "last_event_at": _iso(last_ts),
                    "duration_seconds": duration_seconds,
                    "event_count": len(events),
                    "final_status": final_status,
                    "is_healthy_flow": is_healthy,
                    "is_failed_flow": is_failed,
                    "has_rollback_event": has_rollback,
                    "reason_codes": reason_codes,
                }
                attempts_table.append(item)
                store_attempts.append(item)

            stores_summary.append(
                {
                    "store_id": store_key,
                    "attempts_total": len(store_attempts),
                    "healthy_attempts": sum(1 for item in store_attempts if item["is_healthy_flow"]),
                    "failed_attempts": sum(1 for item in store_attempts if item["is_failed_flow"]),
                    "rollback_attempts": sum(1 for item in store_attempts if item["has_rollback_event"]),
                    "has_healthy_attempt": store_has_healthy,
                    "has_failure_attempt": store_has_failure,
                    "has_rollback_attempt": store_has_rollback,
                }
            )

        stores_total = len(stores_summary)
        stores_with_healthy = sum(1 for item in stores_summary if item["has_healthy_attempt"])
        stores_with_failure = sum(1 for item in stores_summary if item["has_failure_attempt"])
        stores_with_rollback = sum(1 for item in stores_summary if item["has_rollback_attempt"])

        canary_ready = stores_with_healthy >= 1
        rollback_ready = stores_with_rollback >= 1 or stores_with_failure >= 1
        telemetry_ready = total_attempts > 0
        go = canary_ready and rollback_ready and telemetry_ready
        decision = "GO" if go else "NO-GO"
        success_rate_pct = round((healthy_attempts / total_attempts) * 100, 2) if total_attempts else 0.0
        failure_rate_pct = round((failed_attempts / total_attempts) * 100, 2) if total_attempts else 0.0
        rollback_rate_pct = round((rollback_attempts / total_attempts) * 100, 2) if total_attempts else 0.0
        avg_duration_seconds = (
            round(sum(terminal_durations) / len(terminal_durations), 2) if terminal_durations else None
        )

        payload = {
            "generated_at": now.isoformat(),
            "window_hours": hours,
            "filters": {
                "store_id": store_id,
                "channel": channel,
            },
            "summary": {
                "stores_total": stores_total,
                "stores_with_healthy_attempt": stores_with_healthy,
                "stores_with_failure_attempt": stores_with_failure,
                "stores_with_rollback_attempt": stores_with_rollback,
                "attempts_total": total_attempts,
                "healthy_attempts": healthy_attempts,
                "failed_attempts": failed_attempts,
                "rollback_attempts": rollback_attempts,
                "incomplete_attempts": incomplete_attempts,
                "success_rate_pct": success_rate_pct,
                "failure_rate_pct": failure_rate_pct,
                "rollback_rate_pct": rollback_rate_pct,
                "avg_duration_seconds": avg_duration_seconds,
                "decision": decision,
            },
            "stores": stores_summary,
            "attempts": attempts_table,
        }

        report_date = timezone.localdate().isoformat()
        output_path = Path(options["output"]) if options.get("output") else Path(
            f"dalevision-specs/70_ops/S4_Field_Validation_Pack_{report_date}.md"
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)

        lines = [
            f"# S4 Field Validation Pack ({report_date})",
            "",
            "## Decisao",
            f"- Status: `{decision}`",
            f"- Gerado em: `{now.isoformat()}`",
            "",
            "## Escopo",
            f"- Janela: `{hours}h`",
            f"- Filtro loja: `{store_id or 'all'}`",
            f"- Filtro canal: `{channel}`",
            "",
            "## Checklist operacional rapido",
            f"- [{'x' if canary_ready else ' '}] Canary real com pelo menos 1 fluxo completo (`started -> healthy`)",
            f"- [{'x' if rollback_ready else ' '}] Evidencia de falha/rollback registrada para validacao de recuperacao",
            f"- [{'x' if telemetry_ready else ' '}] Telemetria de update presente no periodo",
            "",
            "## KPIs de validacao",
            f"- stores_total: `{stores_total}`",
            f"- stores_with_healthy_attempt: `{stores_with_healthy}`",
            f"- stores_with_failure_attempt: `{stores_with_failure}`",
            f"- stores_with_rollback_attempt: `{stores_with_rollback}`",
            f"- attempts_total: `{total_attempts}`",
            f"- healthy_attempts: `{healthy_attempts}`",
            f"- failed_attempts: `{failed_attempts}`",
            f"- rollback_attempts: `{rollback_attempts}`",
            f"- incomplete_attempts: `{incomplete_attempts}`",
            f"- success_rate_pct: `{success_rate_pct}`",
            f"- failure_rate_pct: `{failure_rate_pct}`",
            f"- rollback_rate_pct: `{rollback_rate_pct}`",
            f"- avg_duration_seconds: `{avg_duration_seconds if avg_duration_seconds is not None else '-'}`",
            "",
            "## Resumo por loja",
            "| store_id | attempts | healthy | failed | rollback |",
            "|---|---:|---:|---:|---:|",
        ]

        for item in sorted(stores_summary, key=lambda row: row["store_id"]):
            lines.append(
                f"| {item['store_id']} | {item['attempts_total']} | {item['healthy_attempts']} | {item['failed_attempts']} | {item['rollback_attempts']} |"
            )

        lines.extend(
            [
                "",
                "## Timeline por tentativa",
                "| store_id | attempt | channel | to_version | final_status | healthy_flow | failed_flow | rollback | duration_s | reason_codes |",
                "|---|---:|---|---|---|---|---|---|---:|---|",
            ]
        )

        for item in sorted(
            attempts_table,
            key=lambda row: (row["store_id"], row["attempt"], row.get("last_event_at") or ""),
        ):
            lines.append(
                f"| {item['store_id']} | {item['attempt']} | {item['channel'] or '-'} | "
                f"{item['to_version'] or '-'} | {item['final_status']} | "
                f"{'yes' if item['is_healthy_flow'] else 'no'} | "
                f"{'yes' if item['is_failed_flow'] else 'no'} | "
                f"{'yes' if item['has_rollback_event'] else 'no'} | "
                f"{item['duration_seconds'] if item['duration_seconds'] is not None else '-'} | "
                f"{', '.join(item['reason_codes']) if item['reason_codes'] else '-'} |"
            )

        lines.extend(
            [
                "",
                "## Proxima acao",
                "- Se `NO-GO`: executar canary controlado + simular falha para validar rollback e rerodar pacote.",
                "- Se `GO`: consolidar evidencia da loja e seguir para lote de 5 lojas.",
            ]
        )

        output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        json_output = options.get("json_output")
        if json_output:
            json_path = Path(json_output)
            json_path.parent.mkdir(parents=True, exist_ok=True)
            json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"[s4_validation_pack] json salvo em {json_path}"))

        self.stdout.write(self.style.SUCCESS(f"[s4_validation_pack] markdown salvo em {output_path}"))
        self.stdout.write(
            self.style.SUCCESS(
                "edge_s4_validation_pack concluido: "
                f"decision={decision} stores={stores_total} attempts={total_attempts}"
            )
        )
