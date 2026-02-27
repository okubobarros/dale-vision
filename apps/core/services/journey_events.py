import json
import logging
from typing import Any, Dict, Optional

from django.db import connection
from django.utils import timezone

from apps.core.models import JourneyEvent

logger = logging.getLogger(__name__)


def _build_meta(
    *,
    org_id: Optional[str],
    lead_id: Optional[str],
    payload: Dict[str, Any],
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    meta_out: Dict[str, Any] = dict(meta or {})
    if org_id:
        meta_out.setdefault("org_id", str(org_id))
    if lead_id:
        meta_out.setdefault("lead_id", str(lead_id))

    for key in ("store_id", "camera_id", "user_id"):
        value = payload.get(key)
        if value is not None and value != "":
            meta_out.setdefault(key, str(value))

    return meta_out


def _insert_event_receipt(
    *,
    event_id: str,
    event_name: str,
    event_version: int,
    source: str,
    raw: str,
    meta_out: Dict[str, Any],
) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO public.event_receipts (event_id, event_name, event_version, ts, source, raw, meta)
            VALUES (%s, %s, %s, now(), %s, %s::jsonb, %s::jsonb)
            ON CONFLICT (event_id) DO NOTHING
            """,
            [
                str(event_id),
                event_name,
                int(event_version or 1),
                source or "app",
                raw,
                json.dumps(meta_out),
            ],
        )


def log_journey_event(
    *,
    org_id: Optional[str],
    lead_id: Optional[str] = None,
    event_name: str,
    payload: Optional[Dict[str, Any]] = None,
    source: str = "app",
    event_version: int = 1,
    meta: Optional[Dict[str, Any]] = None,
) -> Optional[JourneyEvent]:
    payload = payload or {}
    now = timezone.now()
    try:
        journey_event = JourneyEvent.objects.create(
            lead_id=lead_id,
            org_id=org_id,
            event_name=event_name,
            payload=payload,
            created_at=now,
        )
    except Exception:
        logger.exception(
            "[JOURNEY] failed to create journey event event_name=%s org_id=%s lead_id=%s",
            event_name,
            org_id,
            lead_id,
        )
        return None

    try:
        raw = json.dumps(
            {
                "event_name": event_name,
                "org_id": org_id,
                "lead_id": lead_id,
                "payload": payload,
            },
            ensure_ascii=False,
        )
        meta_out = _build_meta(org_id=org_id, lead_id=lead_id, payload=payload, meta=meta)
        _insert_event_receipt(
            event_id=str(journey_event.id),
            event_name=event_name,
            event_version=int(event_version or 1),
            source=source or "app",
            raw=raw,
            meta_out=meta_out,
        )
    except Exception:
        logger.exception(
            "[JOURNEY] failed to insert event_receipt event_name=%s event_id=%s",
            event_name,
            getattr(journey_event, "id", None),
        )

    return journey_event
