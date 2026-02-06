import hashlib
from datetime import timedelta
from typing import Dict, Any, Optional

from django.conf import settings
from django.utils import timezone

from apps.alerts.services import send_event_to_n8n
from apps.core.models import JourneyEvent, NotificationLog


DEFAULT_COOLDOWN_SECONDS = 300


def _cooldown_seconds() -> int:
    return int(getattr(settings, "EDGE_STATUS_EVENT_COOLDOWN_SECONDS", DEFAULT_COOLDOWN_SECONDS))


def _dedupe_key(scope: str, entity_id: str, status: str, now) -> str:
    bucket = int(now.timestamp() // _cooldown_seconds())
    return f"{scope}:{entity_id}:{status}:{bucket}"


def _already_sent(store_id, dedupe_key: str) -> bool:
    try:
        return NotificationLog.objects.filter(
            store_id=store_id,
            provider="n8n",
            channel="webhook",
            provider_message_id=dedupe_key,
        ).exists()
    except Exception:
        return False


def _emit_event(
    *,
    event_name: str,
    store,
    data: Dict[str, Any],
    meta: Optional[Dict[str, Any]] = None,
    dedupe_key: str,
) -> Dict[str, Any]:
    now = timezone.now()
    if _already_sent(store.id, dedupe_key):
        return {"ok": False, "skipped": True, "reason": "cooldown"}

    event_id = None
    try:
        journey_event = JourneyEvent.objects.create(
            lead_id=None,
            org_id=store.org_id,
            event_name=event_name,
            payload=data or {},
            created_at=now,
        )
        event_id = str(journey_event.id)
    except Exception:
        event_id = hashlib.sha256(dedupe_key.encode("utf-8")).hexdigest()

    result = send_event_to_n8n(
        event_name=event_name,
        event_id=event_id,
        org_id=store.org_id,
        data=data or {},
        meta=meta or {},
    )

    try:
        NotificationLog.objects.create(
            org_id=store.org_id,
            store_id=store.id,
            channel="webhook",
            destination=None,
            provider="n8n",
            status="sent" if result.get("ok") else "failed",
            provider_message_id=dedupe_key,
            error=None if result.get("ok") else str(result),
            sent_at=now,
        )
    except Exception:
        pass

    return result


def emit_store_status_changed(
    *,
    store,
    prev_status: str,
    new_status: str,
    snapshot: Dict[str, Any],
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    now = timezone.now()
    dedupe_key = _dedupe_key("store_status_changed", str(store.id), new_status, now)
    payload = {
        "store_id": str(store.id),
        "store_name": getattr(store, "name", None),
        "previous_status": prev_status,
        "status": new_status,
        "reason": snapshot.get("store_status_reason"),
        "age_seconds": snapshot.get("store_status_age_seconds"),
        "last_heartbeat": snapshot.get("last_heartbeat"),
        "cameras_total": snapshot.get("cameras_total"),
        "cameras_online": snapshot.get("cameras_online"),
        "cameras_degraded": snapshot.get("cameras_degraded"),
        "cameras_offline": snapshot.get("cameras_offline"),
        "cameras_unknown": snapshot.get("cameras_unknown"),
    }
    return _emit_event(
        event_name="store_status_changed",
        store=store,
        data=payload,
        meta=meta,
        dedupe_key=dedupe_key,
    )


def emit_camera_status_changed(
    *,
    store,
    camera,
    prev_status: str,
    new_status: str,
    reason: str,
    age_seconds: Optional[int],
    last_heartbeat_ts: Optional[str],
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    now = timezone.now()
    dedupe_key = _dedupe_key("camera_status_changed", str(camera.id), new_status, now)
    payload = {
        "store_id": str(store.id),
        "store_name": getattr(store, "name", None),
        "camera_id": str(camera.id),
        "external_id": getattr(camera, "external_id", None),
        "name": getattr(camera, "name", None),
        "previous_status": prev_status,
        "status": new_status,
        "reason": reason,
        "age_seconds": age_seconds,
        "last_heartbeat": last_heartbeat_ts,
    }
    return _emit_event(
        event_name="camera_status_changed",
        store=store,
        data=payload,
        meta=meta,
        dedupe_key=dedupe_key,
    )
