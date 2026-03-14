from django.core.management.base import BaseCommand

from apps.core.models import Store
from apps.copilot.services import materialize_operational_window


class Command(BaseCommand):
    help = "Materializa janela operacional (5/10 min) para aderência de staff por loja."

    def add_arguments(self, parser):
        parser.add_argument("--store-id", type=str, default=None, help="UUID da loja para processamento único.")
        parser.add_argument("--max-stores", type=int, default=200, help="Limite de lojas quando processamento em lote.")
        parser.add_argument("--window-minutes", type=int, default=5, help="Janela operacional (5 ou 10 min).")

    def handle(self, *args, **options):
        store_id = options["store_id"]
        max_stores = max(int(options["max_stores"] or 1), 1)
        window_minutes = int(options["window_minutes"] or 5)

        if store_id:
            stores = Store.objects.filter(id=store_id)[:1]
        else:
            stores = Store.objects.order_by("-updated_at")[:max_stores]

        processed = 0
        created = 0
        skipped = 0
        for store in stores:
            processed += 1
            row = materialize_operational_window(store.id, window_minutes=window_minutes)
            if row:
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"[op_window] {store.id} bucket={row.ts_bucket.isoformat()} window={row.window_minutes}m confidence={row.confidence_score}"
                    )
                )
            else:
                skipped += 1
                self.stdout.write(self.style.WARNING(f"[op_window] {store.id} skip"))

        self.stdout.write(
            self.style.SUCCESS(
                "copilot_operational_window_tick concluído: "
                f"stores={processed} "
                f"materializadas={created} "
                f"skip={skipped} "
                f"window_minutes={window_minutes}"
            )
        )
