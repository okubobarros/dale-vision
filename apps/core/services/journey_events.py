import json
import logging
import uuid
from typing import Any, Dict, Optional

from django.db import connection
from django.utils import timezone

from apps.core.models import JourneyEvent

logger = logging.getLogger(__name__)

CONTRACT_VERSION = "journey_event_contract_v1_2026-03-20"
CRITICAL_EVENT_REQUIRED_FIELDS: Dict[str, list[str]] = {
    "signup_completed": ["user_id"],
    "store_created": ["store_id"],
    "camera_added": ["store_id", "camera_id"],
    "roi_saved": ["store_id", "camera_id", "roi_version"],
    "first_metrics_received": ["store_id"],
}


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
            INSERT INTO public.event_receipts (event_id, event_name, event_version, ts, source, raw, meta, processed_at, attempt_count)
            VALUES (%s, %s, %s, now(), %s, %s::jsonb, %s::jsonb, now(), 1)
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


def _missing_required_fields(*, event_name: str, payload: Dict[str, Any]) -> list[str]:
    required = CRITICAL_EVENT_REQUIRED_FIELDS.get(str(event_name or "").strip(), [])
    missing: list[str] = []
    for field in required:
        value = payload.get(field)
        if value is None:
            missing.append(field)
            continue
        if isinstance(value, str) and value.strip() == "":
            missing.append(field)
    return missing


def _record_contract_rejection(
    *,
    org_id: Optional[str],
    lead_id: Optional[str],
    event_name: str,
    payload: Dict[str, Any],
    source: str,
    event_version: int,
    meta: Optional[Dict[str, Any]],
    missing_fields: list[str],
) -> None:
    raw = json.dumps(
        {
            "event_name": event_name,
            "org_id": org_id,
            "lead_id": lead_id,
            "payload": payload,
            "contract_status": "rejected",
            "contract_error_code": "JOURNEY_EVENT_PAYLOAD_REQUIRED_MISSING",
            "missing_fields": missing_fields,
        },
        ensure_ascii=False,
    )
    meta_out = _build_meta(org_id=org_id, lead_id=lead_id, payload=payload, meta=meta)
    meta_out.update(
        {
            "contract_status": "rejected",
            "contract_blocked": True,
            "contract_version": CONTRACT_VERSION,
            "contract_error_code": "JOURNEY_EVENT_PAYLOAD_REQUIRED_MISSING",
            "missing_fields": missing_fields,
        }
    )
    _insert_event_receipt(
        event_id=f"journey-contract-reject-{uuid.uuid4()}",
        event_name=event_name,
        event_version=int(event_version or 1),
        source=source or "app",
        raw=raw,
        meta_out=meta_out,
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
    missing_fields = _missing_required_fields(event_name=event_name, payload=payload)
    if missing_fields:
        logger.warning(
            "[JOURNEY] contract blocked event_name=%s org_id=%s lead_id=%s missing=%s",
            event_name,
            org_id,
            lead_id,
            ",".join(missing_fields),
        )
        try:
            _record_contract_rejection(
                org_id=org_id,
                lead_id=lead_id,
                event_name=event_name,
                payload=payload,
                source=source,
                event_version=event_version,
                meta=meta,
                missing_fields=missing_fields,
            )
        except Exception:
            logger.exception(
                "[JOURNEY] failed to persist contract rejection event_name=%s org_id=%s",
                event_name,
                org_id,
            )
        return None

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
