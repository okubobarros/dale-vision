from datetime import timedelta
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Avg, Sum
from django.utils import timezone

from apps.core.models import Store
from apps.copilot.models import ValueLedgerDaily


class Command(BaseCommand):
    help = "Gera relatório de aceite GO/NO-GO da Sprint 2 com base na saúde do Value Ledger."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="Janela de dias para consolidação do ledger.")
        parser.add_argument("--max-stores", type=int, default=500, help="Limite de lojas auditadas.")
        parser.add_argument("--slo-target-seconds", type=int, default=900, help="SLO alvo do ledger em segundos.")
        parser.add_argument("--coverage-min", type=int, default=80, help="Cobertura mínima (%) para GO.")
        parser.add_argument("--stale-rate-max", type=int, default=20, help="Taxa máxima de lojas stale (%) para GO.")
        parser.add_argument("--no-data-rate-max", type=int, default=20, help="Taxa máxima de lojas no_data (%) para GO.")
        parser.add_argument(
            "--output",
            type=str,
            default=None,
            help="Arquivo Markdown de saída. Default: dalevision-specs/70_ops/Sprint2_Acceptance_Report_YYYY-MM-DD.md",
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
                    "store_name": getattr(store, "name", None) or str(store.id),
                    "status": status,
                    "freshness_seconds": freshness_seconds,
                    "value_net_gap_brl": value_net_gap_brl,
                    "completion_rate": completion_rate,
                    "recovery_rate": recovery_rate,
                    "confidence_score_avg": float(totals.get("confidence_avg") or 0),
                }
            )

        stores_total = len(items)
        stores_with_ledger = sum(1 for item in items if item["status"] != "no_data")
        coverage_rate = int(round((stores_with_ledger / stores_total) * 100)) if stores_total > 0 else 0
        stale_rate = int(round((counts["stale"] / stores_total) * 100)) if stores_total > 0 else 0
        no_data_rate = int(round((counts["no_data"] / stores_total) * 100)) if stores_total > 0 else 0

        go = (
            stores_total > 0
            and coverage_rate >= coverage_min
            and stale_rate <= stale_rate_max
            and no_data_rate <= no_data_rate_max
        )
        decision = "GO" if go else "NO-GO"
        top_risk = sorted(items, key=lambda item: item["value_net_gap_brl"], reverse=True)[:5]
        report_date = timezone.localdate().isoformat()
        generated_at = now.isoformat()

        lines = [
            f"# Sprint 2 - Acceptance Report ({report_date})",
            "",
            "## Decisão",
            f"- Status: `{decision}`",
            f"- Gerado em: `{generated_at}`",
            "",
            "## Critérios e Resultado",
            f"- Cobertura de lojas com ledger: `{coverage_rate}%` (mínimo `{coverage_min}%`)",
            f"- Taxa de lojas stale: `{stale_rate}%` (máximo `{stale_rate_max}%`)",
            f"- Taxa de lojas sem dados: `{no_data_rate}%` (máximo `{no_data_rate_max}%`)",
            f"- Lojas auditadas: `{stores_total}`",
            f"- Lojas com ledger: `{stores_with_ledger}`",
            "",
            "## Distribuição de Saúde do Ledger",
            f"- healthy: `{counts['healthy']}`",
            f"- stale: `{counts['stale']}`",
            f"- no_data: `{counts['no_data']}`",
            "",
            "## Top 5 lojas por saldo em risco",
            "| Loja | Status | Saldo em risco (R$) | Conclusão (%) | Recuperação (%) | Confiança |",
            "|---|---|---:|---:|---:|---:|",
        ]

        for item in top_risk:
            lines.append(
                f"| {item['store_name']} | {item['status']} | {item['value_net_gap_brl']:.2f} | "
                f"{item['completion_rate']:.1f} | {item['recovery_rate']:.1f} | {item['confidence_score_avg']:.1f} |"
            )

        lines.extend(
            [
                "",
                "## Próximas ações",
                "- Se `NO-GO`: tratar lojas stale/no_data primeiro e reexecutar relatório após estabilização.",
                "- Se `GO`: seguir com fechamento formal da Sprint 2 e manter monitoramento diário.",
            ]
        )

        default_output = Path(f"dalevision-specs/70_ops/Sprint2_Acceptance_Report_{report_date}.md")
        output_path = Path(options["output"]) if options.get("output") else default_output
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        self.stdout.write(self.style.SUCCESS(f"[acceptance_report] markdown salvo em {output_path}"))
        self.stdout.write(
            self.style.SUCCESS(
                "copilot_value_ledger_acceptance_report concluído: "
                f"decision={decision} coverage={coverage_rate}% stale={stale_rate}% no_data={no_data_rate}%"
            )
        )
