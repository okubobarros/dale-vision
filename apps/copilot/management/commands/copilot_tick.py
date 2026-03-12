from django.core.management.base import BaseCommand

from apps.core.models import Store
from apps.copilot.services import (
    materialize_dashboard_context,
    materialize_operational_insights,
    materialize_report_72h,
)


class Command(BaseCommand):
    help = "Materializa contexto e insights operacionais do Copiloto por loja."

    def add_arguments(self, parser):
        parser.add_argument("--store-id", type=str, default=None, help="UUID da loja para processamento único.")
        parser.add_argument("--max-stores", type=int, default=100, help="Limite de lojas quando processamento em lote.")
        parser.add_argument("--window-hours", type=int, default=24, help="Janela em horas para geração de insights.")
        parser.add_argument("--skip-context", action="store_true", help="Não gerar snapshot de contexto.")
        parser.add_argument("--skip-insights", action="store_true", help="Não gerar insights.")
        parser.add_argument("--skip-report", action="store_true", help="Não gerar/materializar relatório 72h.")

    def handle(self, *args, **options):
        store_id = options["store_id"]
        max_stores = max(int(options["max_stores"] or 1), 1)
        window_hours = max(int(options["window_hours"] or 24), 1)
        skip_context = bool(options["skip_context"])
        skip_insights = bool(options["skip_insights"])
        skip_report = bool(options["skip_report"])

        if store_id:
            stores = Store.objects.filter(id=store_id)[:1]
        else:
            stores = Store.objects.order_by("-updated_at")[:max_stores]

        processed = 0
        insights_count = 0
        reports_ready = 0
        reports_pending = 0
        reports_failed = 0
        for store in stores:
            processed += 1
            if not skip_context:
                snapshot = materialize_dashboard_context(store.id)
                if snapshot:
                    self.stdout.write(self.style.SUCCESS(f"[context] {store.id} ok"))
                else:
                    self.stdout.write(self.style.WARNING(f"[context] {store.id} skip"))
            if not skip_insights:
                created = materialize_operational_insights(store.id, window_hours=window_hours)
                insights_count += created
                self.stdout.write(self.style.SUCCESS(f"[insights] {store.id} +{created}"))
            if not skip_report:
                report = materialize_report_72h(store.id)
                status_value = getattr(report, "status", "failed")
                if status_value == "ready":
                    reports_ready += 1
                elif status_value == "pending":
                    reports_pending += 1
                else:
                    reports_failed += 1
                self.stdout.write(self.style.SUCCESS(f"[report72h] {store.id} status={status_value}"))

        self.stdout.write(
            self.style.SUCCESS(
                "copilot_tick concluído: "
                f"stores={processed} "
                f"insights_criados={insights_count} "
                f"reports_ready={reports_ready} "
                f"reports_pending={reports_pending} "
                f"reports_failed={reports_failed}"
            )
        )
