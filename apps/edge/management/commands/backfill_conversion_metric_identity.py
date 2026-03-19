from __future__ import annotations

from typing import Optional, Tuple

from django.core.management.base import BaseCommand
from django.db import connection


def _infer_from_atomic(
    *,
    store_id: str,
    camera_id: Optional[str],
    ts_bucket,
    queue_avg_seconds: int,
    checkout_events: int,
) -> Tuple[Optional[str], Optional[str]]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                event_type,
                COALESCE(roi_entity_id, '') AS roi_entity_id,
                COUNT(*) AS qty
            FROM public.vision_atomic_events
            WHERE store_id = %s
              AND camera_id IS NOT DISTINCT FROM %s
              AND ts >= %s
              AND ts < %s + interval '30 seconds'
              AND event_type IN ('vision.queue_state.v1', 'vision.checkout_proxy.v1')
            GROUP BY event_type, COALESCE(roi_entity_id, '')
            ORDER BY qty DESC
            """,
            [store_id, camera_id, ts_bucket, ts_bucket],
        )
        rows = cursor.fetchall()

    best_metric_type = None
    best_roi = None
    best_score = -1
    for event_type, roi_raw, qty in rows:
        metric_type = "queue" if event_type == "vision.queue_state.v1" else "checkout_proxy"
        score = int(qty or 0)
        if metric_type == "queue" and queue_avg_seconds > 0:
            score += 100
        if metric_type == "checkout_proxy" and checkout_events > 0:
            score += 100
        if score > best_score:
            best_score = score
            best_metric_type = metric_type
            best_roi = str(roi_raw or "").strip() or None

    if best_metric_type:
        return best_metric_type, best_roi

    if checkout_events > 0 and queue_avg_seconds <= 0:
        return "checkout_proxy", None
    if queue_avg_seconds > 0:
        return "queue", None
    return None, None


def _infer_roi_fallback(
    *,
    store_id: str,
    camera_id: Optional[str],
    metric_type: str,
    ts_bucket,
) -> Optional[str]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT roi_entity_id
            FROM public.conversion_metrics
            WHERE store_id = %s
              AND camera_id IS NOT DISTINCT FROM %s
              AND metric_type = %s
              AND roi_entity_id IS NOT NULL
              AND roi_entity_id <> ''
            ORDER BY ABS(EXTRACT(EPOCH FROM (ts_bucket - %s))) ASC
            LIMIT 1
            """,
            [store_id, camera_id, metric_type, ts_bucket],
        )
        row = cursor.fetchone()
        if row and row[0]:
            return str(row[0]).strip()

        cursor.execute(
            """
            SELECT roi_entity_id
            FROM public.traffic_metrics
            WHERE store_id = %s
              AND camera_id IS NOT DISTINCT FROM %s
              AND metric_type = %s
              AND roi_entity_id IS NOT NULL
              AND roi_entity_id <> ''
            ORDER BY ABS(EXTRACT(EPOCH FROM (ts_bucket - %s))) ASC
            LIMIT 1
            """,
            [store_id, camera_id, metric_type, ts_bucket],
        )
        row = cursor.fetchone()
        if row and row[0]:
            return str(row[0]).strip()

    event_type = "vision.queue_state.v1" if metric_type == "queue" else "vision.checkout_proxy.v1"
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT roi_entity_id
            FROM public.vision_atomic_events
            WHERE store_id = %s
              AND camera_id IS NOT DISTINCT FROM %s
              AND event_type = %s
              AND ts >= %s - interval '24 hours'
              AND ts <= %s + interval '24 hours'
              AND roi_entity_id IS NOT NULL
              AND roi_entity_id <> ''
            ORDER BY ABS(EXTRACT(EPOCH FROM (ts - %s))) ASC
            LIMIT 1
            """,
            [store_id, camera_id, event_type, ts_bucket, ts_bucket, ts_bucket],
        )
        row = cursor.fetchone()
    return str(row[0]).strip() if row and row[0] else None


def _infer_metric_fallback(*, store_id: str, camera_id: Optional[str], ts_bucket) -> Optional[str]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT metric_type
            FROM public.conversion_metrics
            WHERE store_id = %s
              AND camera_id IS NOT DISTINCT FROM %s
              AND metric_type IS NOT NULL
              AND metric_type <> ''
            ORDER BY ABS(EXTRACT(EPOCH FROM (ts_bucket - %s))) ASC
            LIMIT 1
            """,
            [store_id, camera_id, ts_bucket],
        )
        row = cursor.fetchone()
        if row and row[0]:
            return str(row[0]).strip()

        cursor.execute(
            """
            SELECT metric_type
            FROM public.traffic_metrics
            WHERE store_id = %s
              AND camera_id IS NOT DISTINCT FROM %s
              AND metric_type IS NOT NULL
              AND metric_type <> ''
            ORDER BY ABS(EXTRACT(EPOCH FROM (ts_bucket - %s))) ASC
            LIMIT 1
            """,
            [store_id, camera_id, ts_bucket],
        )
        row = cursor.fetchone()
        return str(row[0]).strip() if row and row[0] else None


class Command(BaseCommand):
    help = "Backfill de metric_type/roi_entity_id nulos em conversion_metrics (compat legado)."

    def add_arguments(self, parser):
        parser.add_argument("--store-id", type=str, default=None)
        parser.add_argument("--from", dest="from_date", type=str, default=None, help="YYYY-MM-DD")
        parser.add_argument("--to", dest="to_date", type=str, default=None, help="YYYY-MM-DD")
        parser.add_argument("--limit", type=int, default=5000)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        store_id = (options.get("store_id") or "").strip() or None
        from_date = (options.get("from_date") or "").strip() or None
        to_date = (options.get("to_date") or "").strip() or None
        limit = int(options.get("limit") or 5000)
        dry_run = bool(options.get("dry_run"))

        where = ["(metric_type IS NULL OR metric_type = '' OR roi_entity_id IS NULL OR roi_entity_id = '')"]
        params = []
        if store_id:
            where.append("store_id = %s")
            params.append(store_id)
        if from_date:
            where.append("ts_bucket >= %s::date")
            params.append(from_date)
        if to_date:
            where.append("ts_bucket < (%s::date + interval '1 day')")
            params.append(to_date)

        query = f"""
            SELECT id, store_id, camera_id, ts_bucket, queue_avg_seconds, checkout_events, metric_type, roi_entity_id
            FROM public.conversion_metrics
            WHERE {' AND '.join(where)}
            ORDER BY ts_bucket DESC
            LIMIT %s
        """
        params.append(limit)

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()

        scanned = len(rows)
        updated = 0
        unresolved = 0
        for row in rows:
            rec_id, row_store_id, row_camera_id, row_ts_bucket, row_queue_avg, row_checkout_events, row_metric, row_roi = row
            queue_avg = int(row_queue_avg or 0)
            checkout_events = int(row_checkout_events or 0)
            metric_type = str(row_metric or "").strip() or None
            roi_entity_id = str(row_roi or "").strip() or None

            inferred_metric, inferred_roi = _infer_from_atomic(
                store_id=str(row_store_id),
                camera_id=str(row_camera_id) if row_camera_id else None,
                ts_bucket=row_ts_bucket,
                queue_avg_seconds=queue_avg,
                checkout_events=checkout_events,
            )
            final_metric = metric_type or inferred_metric
            if not final_metric:
                final_metric = _infer_metric_fallback(
                    store_id=str(row_store_id),
                    camera_id=str(row_camera_id) if row_camera_id else None,
                    ts_bucket=row_ts_bucket,
                )
            final_roi = roi_entity_id or inferred_roi
            if final_metric and not final_roi:
                final_roi = _infer_roi_fallback(
                    store_id=str(row_store_id),
                    camera_id=str(row_camera_id) if row_camera_id else None,
                    metric_type=final_metric,
                    ts_bucket=row_ts_bucket,
                )

            if not final_metric or not final_roi:
                unresolved += 1
                continue

            if dry_run:
                updated += 1
                continue

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE public.conversion_metrics
                    SET metric_type = %s,
                        roi_entity_id = %s
                    WHERE id = %s
                    """,
                    [final_metric, final_roi, rec_id],
                )
            updated += 1

        mode = "dry-run" if dry_run else "apply"
        self.stdout.write(
            self.style.SUCCESS(
                f"backfill_conversion_metric_identity {mode}: scanned={scanned} updated={updated} unresolved={unresolved}"
            )
        )
