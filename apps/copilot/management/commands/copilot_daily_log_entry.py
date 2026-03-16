from datetime import timedelta
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Sum
from django.utils import timezone

from apps.core.models import Store
from apps.copilot.models import ValueLedgerDaily


class Command(BaseCommand):
    help = "Gera entrada diaria GO/NO-GO para Daily_Log.md com base no Value Ledger."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="Janela de dias para consolidacao.")
        parser.add_argument("--max-stores", type=int, default=500, help="Limite de lojas auditadas.")
        parser.add_argument("--slo-target-seconds", type=int, default=900, help="SLO alvo do ledger em segundos.")
        parser.add_argument("--coverage-min", type=int, default=80, help="Cobertura minima (%) para GO.")
        parser.add_argument("--stale-rate-max", type=int, default=20, help="Taxa maxima stale (%) para GO.")
        parser.add_argument("--no-data-rate-max", type=int, default=20, help="Taxa maxima no_data (%) para GO.")
        parser.add_argument(
            "--output",
            type=str,
            default=None,
            help="Arquivo da entrada gerada. Default: dalevision-specs/70_ops/Daily_Log_Entry_YYYY-MM-DD.md",
        )
        parser.add_argument(
            "--append-to",
            type=str,
            default=None,
            help="Arquivo alvo para append idempotente (ex.: dalevision-specs/70_ops/Daily_Log.md).",
        )

    def handle(self, *args, **options):
        days = min(max(int(options["days"] or 7), 1), 180)
        max_stores = max(int(options["max_stores"] or 1), 1)
        slo_target_seconds = max(int(options["slo_target_seconds"] or 900), 60)
        coverage_min = min(max(int(options["coverage_min"] or 80), 0), 100)
        stale_rate_max = min(max(int(options["stale_rate_max"] or 20), 0), 100)
        no_data_rate_max = min(max(int(options["no_data_rate_max"] or 20), 0), 100)
        report_date = timezone.localdate().isoformat()
        from_date = timezone.localdate() - timedelta(days=days - 1)
        now = timezone.now().isoformat()

        stores = list(Store.objects.order_by("-updated_at")[:max_stores])
        total = len(stores)
        healthy = 0
        stale = 0
        no_data = 0
        value_recovered = 0.0
        value_at_risk = 0.0
        actions_dispatched = 0
        actions_completed = 0

        for store in stores:
            rows = ValueLedgerDaily.objects.filter(store_id=store.id, ledger_date__gte=from_date)
            latest = rows.order_by("-updated_at").first()
            totals = rows.aggregate(
                value_recovered=Sum("value_recovered_brl"),
                value_at_risk=Sum("value_at_risk_brl"),
                actions_dispatched=Sum("actions_dispatched"),
                actions_completed=Sum("actions_completed"),
            )
            value_recovered += float(totals.get("value_recovered") or 0)
            value_at_risk += float(totals.get("value_at_risk") or 0)
            actions_dispatched += int(totals.get("actions_dispatched") or 0)
            actions_completed += int(totals.get("actions_completed") or 0)

            if latest and latest.updated_at:
                freshness_seconds = max(0, int((timezone.now() - latest.updated_at).total_seconds()))
                if freshness_seconds <= slo_target_seconds:
                    healthy += 1
                else:
                    stale += 1
            else:
                no_data += 1

        coverage_rate = int(round(((healthy + stale) / total) * 100)) if total > 0 else 0
        stale_rate = int(round((stale / total) * 100)) if total > 0 else 0
        no_data_rate = int(round((no_data / total) * 100)) if total > 0 else 0
        completion_rate = round((actions_completed / actions_dispatched) * 100, 1) if actions_dispatched > 0 else 0.0
        recovery_rate = round((value_recovered / value_at_risk) * 100, 1) if value_at_risk > 0 else 0.0
        value_net_gap = max(0.0, round(value_at_risk - value_recovered, 2))
        decision = (
            "GO"
            if total > 0 and coverage_rate >= coverage_min and stale_rate <= stale_rate_max and no_data_rate <= no_data_rate_max
            else "NO-GO"
        )

        entry = "\n".join(
            [
                f"## {report_date}",
                f"- Data: {report_date}",
                "- Highlights:",
                f"  - Sprint 2 acceptance automático: decisão `{decision}` com base no Value Ledger.",
                f"  - Cobertura `{coverage_rate}%` ({healthy + stale}/{total} lojas), stale `{stale_rate}%`, no_data `{no_data_rate}%`.",
                f"  - Conclusão de ações `{completion_rate}%` e recuperação `{recovery_rate}%` no período de {days} dias.",
                "- Bloqueios:",
                f"  - {'Sem bloqueio crítico automático.' if decision == 'GO' else 'Existe bloqueio de qualidade de dados (NO-GO).'}",
                "- Decisões:",
                f"  - {decision}: manter/revisar rollout com base nos thresholds de aceite.",
                f"  - Gap líquido estimado no período: R$ {value_net_gap:.2f}.",
                "- Próximos passos:",
                "  - Revisar artifact `sprint2-evidence-pack` e confirmar plano de ação por loja.",
                f"  - Gerado automaticamente em {now}.",
                "",
            ]
        )

        output_path = Path(options["output"]) if options.get("output") else Path(
            f"dalevision-specs/70_ops/Daily_Log_Entry_{report_date}.md"
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(entry, encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"[daily_log] entrada gerada em {output_path}"))

        append_to = options.get("append_to")
        if append_to:
            target = Path(append_to)
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                content = target.read_text(encoding="utf-8")
            else:
                content = "# Daily Log\n\n"
            if f"## {report_date}" not in content:
                sep = "" if content.endswith("\n") else "\n"
                target.write_text(content + sep + entry, encoding="utf-8")
                self.stdout.write(self.style.SUCCESS(f"[daily_log] entrada appended em {target}"))
            else:
                self.stdout.write(self.style.WARNING(f"[daily_log] entrada de {report_date} já existe em {target}, skip"))

        self.stdout.write(
            self.style.SUCCESS(
                "copilot_daily_log_entry concluido: "
                f"decision={decision} coverage={coverage_rate}% stale={stale_rate}% no_data={no_data_rate}%"
            )
        )
