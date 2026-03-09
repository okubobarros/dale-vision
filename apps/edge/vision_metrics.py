from __future__ import annotations

import json
from datetime import datetime, timezone as dt_timezone
from typing import Any, Dict, Optional

from django.db import connection
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from apps.core.models import Store
from apps.core.services.journey_events import log_journey_event


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


def _normalize_camera_role(
    *,
    camera_id: Optional[str],
    declared_role: Optional[str],
    traffic: dict,
    conversion: dict,
) -> Optional[str]:
    role = str(declared_role or "").strip().lower()
    if role in {"entrada", "balcao", "salao"}:
        return role

    checkout_events = int(conversion.get("checkout_events") or 0)
    queue_avg = int(conversion.get("queue_avg_seconds") or 0)
    staff_active = int(conversion.get("staff_active_est") or 0)
    footfall = int(traffic.get("footfall") or 0)
    dwell = int(traffic.get("dwell_seconds_avg") or 0)

    if checkout_events > 0 or queue_avg > 0 or staff_active > 0:
        return "balcao"
    if footfall > 0:
        return "entrada"
    if camera_id:
        if dwell > 0:
            return "salao"
        return "unknown"
    return None


def insert_event_receipt_if_new(*, event_id: str, event_name: str, payload: dict, source: str = "edge") -> bool:
    raw = json.dumps(payload, ensure_ascii=False)
    data = (payload.get("data") or {}) if isinstance(payload, dict) else {}
    traffic = data.get("traffic") or {}
    conversion = data.get("conversion") or {}
    meta = {
        "store_id": data.get("store_id") or payload.get("store_id"),
        "camera_id": data.get("camera_id") or payload.get("camera_id"),
        "zone_id": traffic.get("zone_id") or conversion.get("zone_id") or data.get("zone_id"),
        "roi_entity_id": traffic.get("roi_entity_id")
        or conversion.get("roi_entity_id")
        or data.get("roi_entity_id"),
        "metric_type": traffic.get("metric_type")
        or conversion.get("metric_type")
        or data.get("metric_type"),
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


def insert_vision_atomic_event_if_new(*, receipt_id: str, payload: dict) -> bool:
    data = (payload.get("data") or {}) if isinstance(payload, dict) else {}
    raw = json.dumps(payload, ensure_ascii=False)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO public.vision_atomic_events (
                receipt_id,
                event_type,
                store_id,
                camera_id,
                camera_role,
                zone_id,
                roi_entity_id,
                roi_version,
                metric_type,
                ownership,
                direction,
                count_value,
                staff_active_est,
                duration_seconds,
                confidence,
                track_id_hash,
                ts,
                raw_payload
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb
            )
            ON CONFLICT (receipt_id) DO NOTHING
            """,
            [
                receipt_id,
                data.get("event_type") or payload.get("event_name"),
                data.get("store_id"),
                data.get("camera_id"),
                data.get("camera_role"),
                data.get("zone_id"),
                data.get("roi_entity_id"),
                str(data.get("roi_version")) if data.get("roi_version") is not None else None,
                data.get("metric_type"),
                data.get("ownership"),
                data.get("direction"),
                int(data.get("count_value") or 1),
                int(data.get("staff_active_est")) if data.get("staff_active_est") is not None else None,
                int(data.get("duration_seconds")) if data.get("duration_seconds") is not None else None,
                data.get("confidence"),
                data.get("track_id_hash"),
                _parse_ts(data.get("ts") or payload.get("ts")),
                raw,
            ],
        )
        return cursor.rowcount == 1


def _upsert_traffic_metrics(
    store_id: str,
    ts_bucket,
    traffic: dict,
    *,
    zone_id: Optional[str] = None,
    camera_id: Optional[str] = None,
    camera_role: Optional[str] = None,
    accumulate: bool = False,
):
    footfall = int(traffic.get("footfall") or 0)
    engaged = int(traffic.get("engaged") or 0)
    dwell = int(traffic.get("dwell_seconds_avg") or 0)
    ownership = str(traffic.get("ownership") or "primary").strip().lower() or "primary"
    metric_type = str(traffic.get("metric_type") or "").strip() or None
    roi_entity_id = str(traffic.get("roi_entity_id") or "").strip() or None
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id
            FROM public.traffic_metrics
            WHERE store_id = %s
              AND ts_bucket = %s
              AND zone_id IS NOT DISTINCT FROM %s
              AND camera_id IS NOT DISTINCT FROM %s
            """,
            [store_id, ts_bucket, zone_id, camera_id],
        )
        row = cursor.fetchone()
        if row:
            next_footfall = footfall
            next_engaged = engaged
            next_dwell = dwell
            if accumulate:
                cursor.execute(
                    """
                    SELECT COALESCE(footfall, 0), COALESCE(engaged, 0), COALESCE(dwell_seconds_avg, 0)
                    FROM public.traffic_metrics
                    WHERE id = %s
                    """,
                    [row[0]],
                )
                current = cursor.fetchone() or (0, 0, 0)
                next_footfall = int(current[0] or 0) + footfall
                next_engaged = int(current[1] or 0) + engaged
                next_dwell = int(current[2] or 0)
            cursor.execute(
                """
                UPDATE public.traffic_metrics
                SET footfall = %s,
                    engaged = %s,
                    dwell_seconds_avg = %s,
                    camera_role = %s,
                    ownership = %s,
                    metric_type = %s,
                    roi_entity_id = %s
                WHERE id = %s
                """,
                [next_footfall, next_engaged, next_dwell, camera_role, ownership, metric_type, roi_entity_id, row[0]],
            )
        else:
            cursor.execute(
                """
                INSERT INTO public.traffic_metrics (
                    store_id,
                    zone_id,
                    camera_id,
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    ts_bucket,
                    footfall,
                    engaged,
                    dwell_seconds_avg
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    store_id,
                    zone_id,
                    camera_id,
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    ts_bucket,
                    footfall,
                    engaged,
                    dwell,
                ],
            )


def _upsert_conversion_metrics(
    store_id: str,
    ts_bucket,
    conversion: dict,
    *,
    camera_id: Optional[str] = None,
    camera_role: Optional[str] = None,
):
    queue_avg = int(conversion.get("queue_avg_seconds") or 0)
    staff_active = int(conversion.get("staff_active_est") or 0)
    checkout_events = int(conversion.get("checkout_events") or 0)
    conversion_rate = float(conversion.get("conversion_rate") or 0)
    ownership = str(conversion.get("ownership") or "primary").strip().lower() or "primary"
    metric_type = str(conversion.get("metric_type") or "").strip() or None
    roi_entity_id = str(conversion.get("roi_entity_id") or "").strip() or None
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id
            FROM public.conversion_metrics
            WHERE store_id = %s
              AND ts_bucket = %s
              AND camera_id IS NOT DISTINCT FROM %s
            """,
            [store_id, ts_bucket, camera_id],
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                """
                UPDATE public.conversion_metrics
                SET camera_role = %s,
                    ownership = %s,
                    metric_type = %s,
                    roi_entity_id = %s,
                    conversion_rate = %s,
                    queue_avg_seconds = %s,
                    staff_active_est = %s,
                    checkout_events = %s
                WHERE id = %s
                """,
                [
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    conversion_rate,
                    queue_avg,
                    staff_active,
                    checkout_events,
                    row[0],
                ],
            )
        else:
            cursor.execute(
                """
                INSERT INTO public.conversion_metrics (
                    store_id,
                    camera_id,
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    ts_bucket,
                    conversion_rate,
                    queue_avg_seconds,
                    staff_active_est,
                    checkout_events
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    store_id,
                    camera_id,
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    ts_bucket,
                    conversion_rate,
                    queue_avg,
                    staff_active,
                    checkout_events,
                ],
            )


def apply_vision_metrics(payload: Dict[str, Any]) -> None:
    data = payload.get("data") or {}
    store_id = data.get("store_id")
    camera_id = data.get("camera_id")
    bucket = data.get("bucket") or {}
    ts_bucket = _parse_ts(bucket.get("start"))
    if not store_id:
        return
    should_log_first = False
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM public.traffic_metrics WHERE store_id = %s LIMIT 1",
                [store_id],
            )
            has_traffic = cursor.fetchone() is not None
            cursor.execute(
                "SELECT 1 FROM public.conversion_metrics WHERE store_id = %s LIMIT 1",
                [store_id],
            )
            has_conversion = cursor.fetchone() is not None
        should_log_first = not (has_traffic or has_conversion)
    except Exception:
        should_log_first = False
    traffic = data.get("traffic") or {}
    conversion = data.get("conversion") or {}
    ownership = (data.get("ownership") or {}) if isinstance(data.get("ownership"), dict) else {}
    ownership_value = str(ownership.get("ownership") or ownership.get("mode") or "primary").strip().lower()
    if ownership_value == "single_camera_owner":
        ownership_value = "primary"
    traffic = {
        **traffic,
        "ownership": traffic.get("ownership") or ownership_value or "primary",
    }
    conversion = {
        **conversion,
        "ownership": conversion.get("ownership") or ownership_value or "primary",
    }
    traffic_zone_id = traffic.get("zone_id") or data.get("zone_id")
    camera_role = _normalize_camera_role(
        camera_id=str(camera_id).strip() if camera_id else None,
        declared_role=data.get("camera_role") or data.get("role"),
        traffic=traffic,
        conversion=conversion,
    )
    _upsert_traffic_metrics(
        store_id,
        ts_bucket,
        traffic,
        zone_id=str(traffic_zone_id).strip() if traffic_zone_id else None,
        camera_id=str(camera_id).strip() if camera_id else None,
        camera_role=camera_role,
    )
    _upsert_conversion_metrics(
        store_id,
        ts_bucket,
        conversion,
        camera_id=str(camera_id).strip() if camera_id else None,
        camera_role=camera_role,
    )
    if should_log_first:
        try:
            org_id = (
                Store.objects.filter(id=store_id).values_list("org_id", flat=True).first()
            )
            log_journey_event(
                org_id=str(org_id) if org_id else None,
                event_name="first_metrics_received",
                payload={
                    "store_id": str(store_id),
                    "ts_bucket": ts_bucket.isoformat() if ts_bucket else None,
                },
                source="app",
            )
        except Exception:
            pass


def apply_vision_crossing(payload: Dict[str, Any]) -> None:
    data = payload.get("data") or {}
    store_id = data.get("store_id")
    if not store_id:
        return

    ts_bucket = _parse_ts(data.get("ts"))
    camera_id = str(data.get("camera_id") or "").strip() or None
    camera_role = str(data.get("camera_role") or "entrada").strip().lower() or "entrada"
    zone_id = str(data.get("zone_id") or "").strip() or None
    direction = str(data.get("direction") or "").strip().lower()
    count_value = int(data.get("count_value") or 1)
    metric_type = str(data.get("metric_type") or "entry_exit").strip() or "entry_exit"
    roi_entity_id = str(data.get("roi_entity_id") or "").strip() or None
    ownership = str(data.get("ownership") or "primary").strip().lower() or "primary"

    traffic_payload = {
        "footfall": count_value if direction == "entry" else 0,
        "engaged": 0,
        "dwell_seconds_avg": 0,
        "metric_type": metric_type,
        "roi_entity_id": roi_entity_id,
        "ownership": ownership,
    }
    _upsert_traffic_metrics(
        str(store_id),
        ts_bucket,
        traffic_payload,
        zone_id=zone_id,
        camera_id=camera_id,
        camera_role=camera_role,
        accumulate=True,
    )


def apply_vision_queue_state(payload: Dict[str, Any]) -> None:
    data = payload.get("data") or {}
    store_id = data.get("store_id")
    if not store_id:
        return

    event_ts = _parse_ts(data.get("ts"))
    bucket_seconds = 30
    bucket_epoch = int(event_ts.timestamp() // bucket_seconds) * bucket_seconds
    ts_bucket = datetime.fromtimestamp(bucket_epoch, tz=dt_timezone.utc)
    camera_id = str(data.get("camera_id") or "").strip() or None
    camera_role = str(data.get("camera_role") or "balcao").strip().lower() or "balcao"
    zone_id = str(data.get("zone_id") or "").strip() or None
    roi_entity_id = str(data.get("roi_entity_id") or "").strip() or None
    ownership = str(data.get("ownership") or "primary").strip().lower() or "primary"
    metric_type = str(data.get("metric_type") or "queue").strip() or "queue"

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COALESCE(AVG(count_value), 0),
                COALESCE(MAX(staff_active_est), 0)
            FROM public.vision_atomic_events
            WHERE store_id = %s
              AND event_type = 'vision.queue_state.v1'
              AND ts >= %s
              AND ts < %s + interval '30 seconds'
              AND camera_id IS NOT DISTINCT FROM %s
              AND zone_id IS NOT DISTINCT FROM %s
              AND roi_entity_id IS NOT DISTINCT FROM %s
            """,
            [store_id, ts_bucket, ts_bucket, camera_id, zone_id, roi_entity_id],
        )
        row = cursor.fetchone() or (0, 0)
        queue_length_avg = float(row[0] or 0)
        staff_active_est = int(row[1] or 0)

        cursor.execute(
            """
            SELECT id
            FROM public.conversion_metrics
            WHERE store_id = %s
              AND ts_bucket = %s
              AND camera_id IS NOT DISTINCT FROM %s
            """,
            [store_id, ts_bucket, camera_id],
        )
        existing = cursor.fetchone()
        queue_avg_seconds = int(round(queue_length_avg * bucket_seconds))
        if existing:
            cursor.execute(
                """
                UPDATE public.conversion_metrics
                SET camera_role = %s,
                    ownership = %s,
                    metric_type = %s,
                    roi_entity_id = %s,
                    queue_avg_seconds = %s,
                    staff_active_est = GREATEST(COALESCE(staff_active_est, 0), %s)
                WHERE id = %s
                """,
                [
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    queue_avg_seconds,
                    staff_active_est,
                    existing[0],
                ],
            )
        else:
            cursor.execute(
                """
                INSERT INTO public.conversion_metrics (
                    store_id,
                    camera_id,
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    ts_bucket,
                    conversion_rate,
                    queue_avg_seconds,
                    staff_active_est,
                    checkout_events
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s, %s, 0)
                """,
                [
                    store_id,
                    camera_id,
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    ts_bucket,
                    queue_avg_seconds,
                    staff_active_est,
                ],
            )


def apply_vision_checkout_proxy(payload: Dict[str, Any]) -> None:
    data = payload.get("data") or {}
    store_id = data.get("store_id")
    if not store_id:
        return

    event_ts = _parse_ts(data.get("ts"))
    bucket_seconds = 30
    bucket_epoch = int(event_ts.timestamp() // bucket_seconds) * bucket_seconds
    ts_bucket = datetime.fromtimestamp(bucket_epoch, tz=dt_timezone.utc)
    camera_id = str(data.get("camera_id") or "").strip() or None
    camera_role = str(data.get("camera_role") or "balcao").strip().lower() or "balcao"
    zone_id = str(data.get("zone_id") or "").strip() or None
    roi_entity_id = str(data.get("roi_entity_id") or "").strip() or None
    ownership = str(data.get("ownership") or "primary").strip().lower() or "primary"
    metric_type = str(data.get("metric_type") or "checkout_proxy").strip() or "checkout_proxy"

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COALESCE(SUM(count_value), 0)
            FROM public.vision_atomic_events
            WHERE store_id = %s
              AND event_type = 'vision.checkout_proxy.v1'
              AND ts >= %s
              AND ts < %s + interval '30 seconds'
              AND camera_id IS NOT DISTINCT FROM %s
              AND zone_id IS NOT DISTINCT FROM %s
              AND roi_entity_id IS NOT DISTINCT FROM %s
            """,
            [store_id, ts_bucket, ts_bucket, camera_id, zone_id, roi_entity_id],
        )
        row = cursor.fetchone() or (0,)
        checkout_events = int(row[0] or 0)

        cursor.execute(
            """
            SELECT id
            FROM public.conversion_metrics
            WHERE store_id = %s
              AND ts_bucket = %s
              AND camera_id IS NOT DISTINCT FROM %s
            """,
            [store_id, ts_bucket, camera_id],
        )
        existing = cursor.fetchone()
        if existing:
            cursor.execute(
                """
                UPDATE public.conversion_metrics
                SET camera_role = %s,
                    ownership = %s,
                    metric_type = %s,
                    roi_entity_id = %s,
                    checkout_events = %s
                WHERE id = %s
                """,
                [
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    checkout_events,
                    existing[0],
                ],
            )
        else:
            cursor.execute(
                """
                INSERT INTO public.conversion_metrics (
                    store_id,
                    camera_id,
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    ts_bucket,
                    conversion_rate,
                    queue_avg_seconds,
                    staff_active_est,
                    checkout_events
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, 0, 0, 0, %s)
                """,
                [
                    store_id,
                    camera_id,
                    camera_role,
                    ownership,
                    metric_type,
                    roi_entity_id,
                    ts_bucket,
                    checkout_events,
                ],
            )


def apply_vision_zone_occupancy(payload: Dict[str, Any]) -> None:
    data = payload.get("data") or {}
    store_id = data.get("store_id")
    if not store_id:
        return

    event_ts = _parse_ts(data.get("ts"))
    bucket_seconds = 30
    bucket_epoch = int(event_ts.timestamp() // bucket_seconds) * bucket_seconds
    ts_bucket = datetime.fromtimestamp(bucket_epoch, tz=dt_timezone.utc)
    camera_id = str(data.get("camera_id") or "").strip() or None
    camera_role = str(data.get("camera_role") or "salao").strip().lower() or "salao"
    zone_id = str(data.get("zone_id") or "").strip() or None
    roi_entity_id = str(data.get("roi_entity_id") or "").strip() or None
    ownership = str(data.get("ownership") or "primary").strip().lower() or "primary"
    metric_type = str(data.get("metric_type") or "occupancy").strip() or "occupancy"

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COALESCE(AVG(count_value), 0),
                COALESCE(AVG(duration_seconds), 0)
            FROM public.vision_atomic_events
            WHERE store_id = %s
              AND event_type = 'vision.zone_occupancy.v1'
              AND ts >= %s
              AND ts < %s + interval '30 seconds'
              AND camera_id IS NOT DISTINCT FROM %s
              AND zone_id IS NOT DISTINCT FROM %s
              AND roi_entity_id IS NOT DISTINCT FROM %s
            """,
            [store_id, ts_bucket, ts_bucket, camera_id, zone_id, roi_entity_id],
        )
        row = cursor.fetchone() or (0, 0)
        occupancy_avg = int(round(float(row[0] or 0)))
        dwell_avg = int(round(float(row[1] or 0)))

    traffic_payload = {
        "footfall": 0,
        "engaged": occupancy_avg,
        "dwell_seconds_avg": dwell_avg,
        "metric_type": metric_type,
        "roi_entity_id": roi_entity_id,
        "ownership": ownership,
    }
    _upsert_traffic_metrics(
        str(store_id),
        ts_bucket,
        traffic_payload,
        zone_id=zone_id,
        camera_id=camera_id,
        camera_role=camera_role,
    )
