from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.copilot.models import OperationalWindowHourly


class Command(BaseCommand):
    help = "Aplica retenção em operational_window_hourly removendo buckets antigos."

    def add_arguments(self, parser):
        parser.add_argument(
            "--retention-days",
            type=int,
            default=30,
            help="Quantidade de dias para manter em operational_window_hourly.",
        )
        parser.add_argument(
            "--store-id",
            type=str,
            default=None,
            help="UUID da loja para limpeza pontual.",
        )
        parser.add_argument(
            "--window-minutes",
            type=int,
            default=None,
            help="Filtra apenas uma janela específica (5 ou 10).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Somente mostra quantas linhas seriam removidas.",
        )

    def handle(self, *args, **options):
        retention_days = max(int(options["retention_days"] or 1), 1)
        cutoff = timezone.now() - timedelta(days=retention_days)
        dry_run = bool(options.get("dry_run"))

        queryset = OperationalWindowHourly.objects.filter(ts_bucket__lt=cutoff)
        if options.get("store_id"):
            queryset = queryset.filter(store_id=options["store_id"])
        if options.get("window_minutes") is not None:
            queryset = queryset.filter(window_minutes=int(options["window_minutes"]))

        target_count = queryset.count()
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "copilot_operational_window_cleanup dry-run: "
                    f"retention_days={retention_days} cutoff={cutoff.isoformat()} "
                    f"would_delete={target_count}"
                )
            )
            return

        deleted_count, _ = queryset.delete()
        self.stdout.write(
            self.style.SUCCESS(
                "copilot_operational_window_cleanup concluído: "
                f"retention_days={retention_days} cutoff={cutoff.isoformat()} "
                f"deleted={deleted_count} matched={target_count}"
            )
        )
