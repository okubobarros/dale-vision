from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

from apps.core.services.journey_events import log_journey_event


class Command(BaseCommand):
    help = (
        "Diagnostica gap de reconciliação quando há eventos de visão recentes, "
        "mas a loja não possui journey_event first_metrics_received."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--window-hours",
            type=int,
            default=24,
            help="Janela para inspecionar eventos de visão recentes (default: 24h).",
        )
        parser.add_argument("--store-id", help="Filtrar por store_id específico.")
        parser.add_argument(
            "--limit",
            type=int,
            default=200,
            help="Limite de lojas retornadas (default: 200).",
        )
        parser.add_argument(
            "--repair",
            action="store_true",
            help="Insere first_metrics_received para lojas em gap.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Somente listar diagnóstico (forçado quando --repair não é informado).",
        )

    def handle(self, *args, **options):
        window_hours = max(1, min(24 * 14, int(options.get("window_hours") or 24)))
        store_id_filter = (options.get("store_id") or "").strip() or None
        limit = max(1, min(5000, int(options.get("limit") or 200)))
        repair = bool(options.get("repair"))
        dry_run = bool(options.get("dry_run")) or not repair
        end = timezone.now()
        start = end - timedelta(hours=window_hours)

        rows = self._load_gap_rows(start=start, end=end, store_id=store_id_filter, limit=limit)
        if not rows:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Sem gap detectado (window_hours={window_hours}, store_filter={store_id_filter or 'all'})."
                )
            )
            return

        self.stdout.write(
            self.style.WARNING(
                f"Gap detectado em {len(rows)} loja(s) (window_hours={window_hours}, repair={repair and not dry_run})."
            )
        )
        inserted = 0
        for row in rows:
            store_id = str(row["store_id"])
            org_id = str(row["org_id"]) if row["org_id"] else None
            store_name = row["store_name"] or "-"
            vision_events = int(row["vision_events"] or 0)
            last_vision_ts = row["last_vision_ts"]
            self.stdout.write(
                f"store_id={store_id} store_name={store_name} org_id={org_id} "
                f"vision_events={vision_events} last_vision_ts={last_vision_ts.isoformat() if last_vision_ts else None}"
            )
            if dry_run:
                continue
            event = log_journey_event(
                org_id=org_id,
                event_name="first_metrics_received",
                payload={
                    "store_id": store_id,
                    "ts_bucket": last_vision_ts.isoformat() if last_vision_ts else None,
                    "source": "diagnose_ingestion_funnel_gap_repair",
                    "window_hours": window_hours,
                },
                source="app",
            )
            if event:
                inserted += 1

        if dry_run:
            self.stdout.write(self.style.WARNING(f"[DRY-RUN] lojas_em_gap={len(rows)}"))
            return
        self.stdout.write(self.style.SUCCESS(f"Repair concluído. eventos_inseridos={inserted}"))

    def _load_gap_rows(self, *, start, end, store_id: str | None, limit: int):
        query = """
            WITH vision_recent AS (
                SELECT
                    vae.store_id::text AS store_id,
                    COUNT(*) AS vision_events,
                    MAX(vae.ts) AS last_vision_ts
                FROM public.vision_atomic_events vae
                WHERE vae.ts >= %s
                  AND vae.ts < %s
                GROUP BY 1
            ),
            first_metrics AS (
                SELECT DISTINCT je.payload->>'store_id' AS store_id
                FROM public.journey_events je
                WHERE je.event_name = 'first_metrics_received'
                  AND je.payload ? 'store_id'
            )
            SELECT
                s.id::text AS store_id,
                s.org_id::text AS org_id,
                s.name AS store_name,
                vr.vision_events AS vision_events,
                vr.last_vision_ts AS last_vision_ts
            FROM vision_recent vr
            JOIN public.stores s ON s.id::text = vr.store_id
            LEFT JOIN first_metrics fm ON fm.store_id = vr.store_id
            WHERE fm.store_id IS NULL
        """
        params: list[object] = [start, end]
        if store_id:
            query += " AND s.id::text = %s"
            params.append(store_id)
        query += " ORDER BY vr.vision_events DESC, vr.last_vision_ts DESC LIMIT %s"
        params.append(limit)

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            cols = [col[0] for col in cursor.description]
            return [dict(zip(cols, row)) for row in cursor.fetchall()]
