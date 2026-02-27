from __future__ import annotations

import json
from typing import Any, Dict, Optional

from django.db import connection
from django.utils import timezone
from django.utils.dateparse import parse_datetime


def _parse_ts(raw: Optional[str]):
    if not raw:
        return timezone.now()
    ts_str = str(raw).replace("Z", "+00:00")
    dt = parse_datetime(ts_str)
    if dt is None:
        return timezone.now()
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.utc)
    return dt


def insert_event_receipt_if_new(*, event_id: str, event_name: str, payload: dict, source: str = "edge") -> bool:
    raw = json.dumps(payload, ensure_ascii=False)
    meta = {
        "store_id": (payload.get("data") or {}).get("store_id") or payload.get("store_id"),
        "camera_id": (payload.get("data") or {}).get("camera_id") or payload.get("camera_id"),
    }
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO public.event_receipts (event_id, event_name, event_version, ts, source, raw, meta)
            VALUES (%s, %s, %s, now(), %s, %s::jsonb, %s::jsonb)
            ON CONFLICT (event_id) DO NOTHING
            """,
            [event_id, event_name, 1, source, raw, json.dumps(meta)],
        )
        return cursor.rowcount == 1


def _upsert_traffic_metrics(store_id: str, ts_bucket, traffic: dict, zone_id: Optional[str] = None):
    footfall = int(traffic.get("footfall") or 0)
    engaged = int(traffic.get("engaged") or 0)
    dwell = int(traffic.get("dwell_seconds_avg") or 0)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id
            FROM public.traffic_metrics
            WHERE store_id = %s AND ts_bucket = %s AND zone_id IS NOT DISTINCT FROM %s
            """,
            [store_id, ts_bucket, zone_id],
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                """
                UPDATE public.traffic_metrics
                SET footfall = %s, engaged = %s, dwell_seconds_avg = %s
                WHERE id = %s
                """,
                [footfall, engaged, dwell, row[0]],
            )
        else:
            cursor.execute(
                """
                INSERT INTO public.traffic_metrics (store_id, zone_id, ts_bucket, footfall, engaged, dwell_seconds_avg)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                [store_id, zone_id, ts_bucket, footfall, engaged, dwell],
            )


def _upsert_conversion_metrics(store_id: str, ts_bucket, conversion: dict):
    queue_avg = int(conversion.get("queue_avg_seconds") or 0)
    staff_active = int(conversion.get("staff_active_est") or 0)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id
            FROM public.conversion_metrics
            WHERE store_id = %s AND ts_bucket = %s
            """,
            [store_id, ts_bucket],
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                """
                UPDATE public.conversion_metrics
                SET queue_avg_seconds = %s, staff_active_est = %s
                WHERE id = %s
                """,
                [queue_avg, staff_active, row[0]],
            )
        else:
            cursor.execute(
                """
                INSERT INTO public.conversion_metrics (store_id, ts_bucket, queue_avg_seconds, staff_active_est)
                VALUES (%s, %s, %s, %s)
                """,
                [store_id, ts_bucket, queue_avg, staff_active],
            )


def apply_vision_metrics(payload: Dict[str, Any]) -> None:
    data = payload.get("data") or {}
    store_id = data.get("store_id")
    bucket = data.get("bucket") or {}
    ts_bucket = _parse_ts(bucket.get("start"))
    if not store_id:
        return
    traffic = data.get("traffic") or {}
    conversion = data.get("conversion") or {}
    _upsert_traffic_metrics(store_id, ts_bucket, traffic, zone_id=None)
    _upsert_conversion_metrics(store_id, ts_bucket, conversion)

