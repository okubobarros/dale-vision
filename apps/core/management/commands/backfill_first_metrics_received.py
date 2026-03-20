from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import connection

from apps.core.services.journey_events import log_journey_event


class Command(BaseCommand):
    help = "Backfill do evento journey first_metrics_received para lojas que ja possuem metricas."

    def add_arguments(self, parser):
        parser.add_argument("--store-id", help="Filtrar por store_id especifico")
        parser.add_argument("--dry-run", action="store_true", help="Somente listar, sem inserir eventos")

    def handle(self, *args, **options):
        store_id_filter = (options.get("store_id") or "").strip() or None
        dry_run = bool(options.get("dry_run"))
        rows = self._load_missing_rows(store_id=store_id_filter)
        if not rows:
            self.stdout.write("Nenhuma loja elegivel para backfill.")
            return

        inserted = 0
        for row in rows:
            store_id = str(row["store_id"])
            org_id = str(row["org_id"]) if row["org_id"] else None
            first_ts = row["first_ts"]
            self.stdout.write(
                f"store_id={store_id} org_id={org_id} first_ts={first_ts.isoformat() if first_ts else None}"
            )
            if dry_run:
                continue
            event = log_journey_event(
                org_id=org_id,
                event_name="first_metrics_received",
                payload={
                    "store_id": store_id,
                    "ts_bucket": first_ts.isoformat() if first_ts else None,
                    "source": "backfill_first_metrics_received",
                },
                source="app",
            )
            if event:
                inserted += 1

        if dry_run:
            self.stdout.write(self.style.WARNING(f"[DRY-RUN] lojas elegiveis={len(rows)}"))
            return
        self.stdout.write(self.style.SUCCESS(f"Backfill concluido. eventos_inseridos={inserted}"))

    def _load_missing_rows(self, *, store_id: str | None):
        query = """
            WITH traffic_first AS (
                SELECT store_id, MIN(ts_bucket) AS first_ts
                FROM public.traffic_metrics
                GROUP BY store_id
            ),
            conversion_first AS (
                SELECT store_id, MIN(ts_bucket) AS first_ts
                FROM public.conversion_metrics
                GROUP BY store_id
            )
            SELECT
                s.id AS store_id,
                s.org_id AS org_id,
                COALESCE(LEAST(tf.first_ts, cf.first_ts), tf.first_ts, cf.first_ts) AS first_ts
            FROM public.stores s
            LEFT JOIN traffic_first tf ON tf.store_id = s.id
            LEFT JOIN conversion_first cf ON cf.store_id = s.id
            WHERE (tf.first_ts IS NOT NULL OR cf.first_ts IS NOT NULL)
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.journey_events je
                  WHERE je.event_name = 'first_metrics_received'
                    AND je.payload->>'store_id' = s.id::text
              )
        """
        params: list[str] = []
        if store_id:
            query += " AND s.id::text = %s"
            params.append(store_id)
        query += " ORDER BY first_ts ASC NULLS LAST"

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            cols = [col[0] for col in cursor.description]
            result = [dict(zip(cols, row)) for row in cursor.fetchall()]
        return result
