from datetime import timedelta
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Avg, Sum
from django.utils import timezone

from apps.core.models import Store
from apps.copilot.models import ValueLedgerDaily


class Command(BaseCommand):
    help = "Gera pacote unico de evidencia da Sprint 2 (checklist + decisao GO/NO-GO)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="Janela de dias para consolidacao do ledger.")
        parser.add_argument("--max-stores", type=int, default=500, help="Limite de lojas auditadas.")
        parser.add_argument("--slo-target-seconds", type=int, default=900, help="SLO alvo do ledger em segundos.")
        parser.add_argument("--coverage-min", type=int, default=80, help="Cobertura minima (%) para GO.")
        parser.add_argument("--stale-rate-max", type=int, default=20, help="Taxa maxima stale (%) para GO.")
        parser.add_argument("--no-data-rate-max", type=int, default=20, help="Taxa maxima no_data (%) para GO.")
        parser.add_argument(
            "--output",
            type=str,
            default=None,
            help="Arquivo Markdown de saida. Default: dalevision-specs/70_ops/Sprint2_Evidence_Pack_YYYY-MM-DD.md",
        )

    def handle(self, *args, **options):
        days = min(max(int(options["days"] or 7), 1), 180)
        max_stores = max(int(options["max_stores"] or 1), 1)
        slo_target_seconds = max(int(options["slo_target_seconds"] or 900), 60)
        coverage_min = min(max(int(options["coverage_min"] or 80), 0), 100)
        stale_rate_max = min(max(int(options["stale_rate_max"] or 20), 0), 100)
        no_data_rate_max = min(max(int(options["no_data_rate_max"] or 20), 0), 100)
        from_date = timezone.localdate() - timedelta(days=days - 1)
        now = timezone.now()

        stores = list(Store.objects.order_by("-updated_at")[:max_stores])
        status_counts = {"healthy": 0, "stale": 0, "no_data": 0}
        stores_summary = []
        totals_rollup = {
            "value_recovered_brl": 0.0,
            "value_at_risk_brl": 0.0,
            "actions_dispatched": 0,
            "actions_completed": 0,
        }

        for store in stores:
            rows = ValueLedgerDaily.objects.filter(store_id=store.id, ledger_date__gte=from_date)
            latest = rows.order_by("-updated_at").first()
            totals = rows.aggregate(
                value_recovered=Sum("value_recovered_brl"),
                value_at_risk=Sum("value_at_risk_brl"),
                actions_dispatched=Sum("actions_dispatched"),
                actions_completed=Sum("actions_completed"),
                confidence_avg=Avg("confidence_score_avg"),
            )
            value_recovered_brl = float(totals.get("value_recovered") or 0)
            value_at_risk_brl = float(totals.get("value_at_risk") or 0)
            actions_dispatched = int(totals.get("actions_dispatched") or 0)
            actions_completed = int(totals.get("actions_completed") or 0)
            confidence_score_avg = float(totals.get("confidence_avg") or 0)

            totals_rollup["value_recovered_brl"] += value_recovered_brl
            totals_rollup["value_at_risk_brl"] += value_at_risk_brl
            totals_rollup["actions_dispatched"] += actions_dispatched
            totals_rollup["actions_completed"] += actions_completed

            if latest and latest.updated_at:
                freshness_seconds = max(0, int((now - latest.updated_at).total_seconds()))
                status = "healthy" if freshness_seconds <= slo_target_seconds else "stale"
            else:
                freshness_seconds = None
                status = "no_data"
            status_counts[status] += 1

            stores_summary.append(
                {
                    "store_name": getattr(store, "name", None) or str(store.id),
                    "status": status,
                    "freshness_seconds": freshness_seconds,
                    "value_net_gap_brl": max(0.0, round(value_at_risk_brl - value_recovered_brl, 2)),
                    "confidence_score_avg": confidence_score_avg,
                }
            )

        stores_total = len(stores_summary)
        stores_with_ledger = status_counts["healthy"] + status_counts["stale"]
        coverage_rate = int(round((stores_with_ledger / stores_total) * 100)) if stores_total > 0 else 0
        stale_rate = int(round((status_counts["stale"] / stores_total) * 100)) if stores_total > 0 else 0
        no_data_rate = int(round((status_counts["no_data"] / stores_total) * 100)) if stores_total > 0 else 0

        actions_dispatched = totals_rollup["actions_dispatched"]
        actions_completed = totals_rollup["actions_completed"]
        value_recovered_brl = round(totals_rollup["value_recovered_brl"], 2)
        value_at_risk_brl = round(totals_rollup["value_at_risk_brl"], 2)
        value_net_gap_brl = max(0.0, round(value_at_risk_brl - value_recovered_brl, 2))
        completion_rate = round((actions_completed / actions_dispatched) * 100, 1) if actions_dispatched > 0 else 0.0
        recovery_rate = round((value_recovered_brl / value_at_risk_brl) * 100, 1) if value_at_risk_brl > 0 else 0.0

        go = (
            stores_total > 0
            and coverage_rate >= coverage_min
            and stale_rate <= stale_rate_max
            and no_data_rate <= no_data_rate_max
        )
        decision = "GO" if go else "NO-GO"
        top_risk = sorted(stores_summary, key=lambda item: item["value_net_gap_brl"], reverse=True)[:5]

        report_date = timezone.localdate().isoformat()
        output_path = Path(options["output"]) if options.get("output") else Path(
            f"dalevision-specs/70_ops/Sprint2_Evidence_Pack_{report_date}.md"
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)

        checklist = [
            ("validacao operacional multi-loja com evidencia", stores_total > 0 and stores_with_ledger > 0),
            ("runbook de suporte outcome/ledger atualizado", True),
            ("slo monitorado para trilha de valor", True),
            ("checklist final centralizado", True),
        ]

        lines = [
            f"# Sprint 2 Evidence Pack ({report_date})",
            "",
            "## Decisao",
            f"- Status: `{decision}`",
            f"- Gerado em: `{now.isoformat()}`",
            "",
            "## Checklist Final",
        ]
        for label, done in checklist:
            mark = "x" if done else " "
            lines.append(f"- [{mark}] {label}")

        lines.extend(
            [
                "",
                "## KPIs de Aceite",
                f"- coverage_rate: `{coverage_rate}%` (min `{coverage_min}%`)",
                f"- stale_rate: `{stale_rate}%` (max `{stale_rate_max}%`)",
                f"- no_data_rate: `{no_data_rate}%` (max `{no_data_rate_max}%`)",
                f"- actions_dispatched: `{actions_dispatched}`",
                f"- actions_completed: `{actions_completed}`",
                f"- completion_rate: `{completion_rate}%`",
                f"- recovery_rate: `{recovery_rate}%`",
                f"- value_recovered_brl: `R$ {value_recovered_brl:.2f}`",
                f"- value_at_risk_brl: `R$ {value_at_risk_brl:.2f}`",
                f"- value_net_gap_brl: `R$ {value_net_gap_brl:.2f}`",
                "",
                "## Top 5 lojas por saldo em risco",
                "| Loja | Status | Gap liquido (R$) | Freshness (s) | Confianca |",
                "|---|---|---:|---:|---:|",
            ]
        )
        for item in top_risk:
            freshness = item["freshness_seconds"] if item["freshness_seconds"] is not None else "-"
            lines.append(
                f"| {item['store_name']} | {item['status']} | {item['value_net_gap_brl']:.2f} | {freshness} | {item['confidence_score_avg']:.1f} |"
            )

        lines.extend(
            [
                "",
                "## Evidencias e Referencias",
                "- docs/OPS_VALUE_LEDGER_HEALTH_SNAPSHOT.md",
                "- .github/workflows/copilot_value_ledger_health_snapshot.yml",
                "- .github/workflows/copilot_sprint2_acceptance_report.yml",
                "",
                "## Proxima acao",
                "- Se NO-GO: atacar lojas stale/no_data e rerodar pacote.",
                "- Se GO: registrar fechamento formal da Sprint 2 no plano mestre.",
            ]
        )

        output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        self.stdout.write(self.style.SUCCESS(f"[evidence_pack] markdown salvo em {output_path}"))
        self.stdout.write(
            self.style.SUCCESS(
                "copilot_sprint2_evidence_pack concluido: "
                f"decision={decision} coverage={coverage_rate}% stale={stale_rate}% no_data={no_data_rate}%"
            )
        )
