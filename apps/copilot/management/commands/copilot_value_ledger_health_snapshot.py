import json
from datetime import timedelta
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Avg, Sum
from django.utils import timezone

from apps.core.models import Store
from apps.copilot.models import ValueLedgerDaily


class Command(BaseCommand):
    help = "Gera snapshot de saúde do Value Ledger por loja (SLO, cobertura e gap financeiro)."

    def add_arguments(self, parser):
        parser.add_argument("--store-id", type=str, default=None, help="UUID de loja para auditoria única.")
        parser.add_argument("--days", type=int, default=7, help="Janela de dias para consolidação do ledger.")
        parser.add_argument("--max-stores", type=int, default=500, help="Limite de lojas no modo rede.")
        parser.add_argument(
            "--slo-target-seconds",
            type=int,
            default=900,
            help="SLO alvo de atualização do ledger em segundos (default: 900).",
        )
        parser.add_argument(
            "--json-output",
            type=str,
            default=None,
            help="Caminho opcional para salvar JSON do snapshot.",
        )

    def handle(self, *args, **options):
        store_id = options["store_id"]
        days = min(max(int(options["days"] or 7), 1), 180)
        max_stores = max(int(options["max_stores"] or 1), 1)
        slo_target_seconds = max(int(options["slo_target_seconds"] or 900), 60)
        from_date = timezone.localdate() - timedelta(days=days - 1)
        now = timezone.now()

        if store_id:
            stores = Store.objects.filter(id=store_id)[:1]
        else:
            stores = Store.objects.order_by("-updated_at")[:max_stores]

        items = []
        counts = {"healthy": 0, "stale": 0, "no_data": 0}
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
            value_net_gap_brl = max(0.0, round(value_at_risk_brl - value_recovered_brl, 2))
            actions_dispatched = int(totals.get("actions_dispatched") or 0)
            actions_completed = int(totals.get("actions_completed") or 0)
            completion_rate = round((actions_completed / actions_dispatched) * 100, 1) if actions_dispatched > 0 else 0.0
            recovery_rate = round((value_recovered_brl / value_at_risk_brl) * 100, 1) if value_at_risk_brl > 0 else 0.0

            if latest and latest.updated_at:
                freshness_seconds = max(0, int((now - latest.updated_at).total_seconds()))
                status = "healthy" if freshness_seconds <= slo_target_seconds else "stale"
            else:
                freshness_seconds = None
                status = "no_data"

            counts[status] += 1
            items.append(
                {
                    "store_id": str(store.id),
                    "store_name": getattr(store, "name", None),
                    "status": status,
                    "freshness_seconds": freshness_seconds,
                    "last_updated_at": latest.updated_at.isoformat() if latest and latest.updated_at else None,
                    "value_recovered_brl": value_recovered_brl,
                    "value_at_risk_brl": value_at_risk_brl,
                    "value_net_gap_brl": value_net_gap_brl,
                    "actions_dispatched": actions_dispatched,
                    "actions_completed": actions_completed,
                    "completion_rate": completion_rate,
                    "recovery_rate": recovery_rate,
                    "confidence_score_avg": float(totals.get("confidence_avg") or 0),
                }
            )

        stores_total = len(items)
        stores_with_ledger = sum(1 for item in items if item["status"] != "no_data")
        coverage_rate = int(round((stores_with_ledger / stores_total) * 100)) if stores_total > 0 else 0
        snapshot = {
            "generated_at": now.isoformat(),
            "days": days,
            "slo_target_seconds": slo_target_seconds,
            "stores_total": stores_total,
            "stores_with_ledger": stores_with_ledger,
            "coverage_rate": coverage_rate,
            "counts": counts,
            "items": items,
        }

        if options.get("json_output"):
            output_path = Path(options["json_output"])
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"[ledger_snapshot] JSON salvo em {output_path}"))

        self.stdout.write(
            self.style.SUCCESS(
                "copilot_value_ledger_health_snapshot concluído: "
                f"stores={stores_total} "
                f"with_ledger={stores_with_ledger} "
                f"coverage={coverage_rate}% "
                f"healthy={counts['healthy']} "
                f"stale={counts['stale']} "
                f"no_data={counts['no_data']}"
            )
        )
