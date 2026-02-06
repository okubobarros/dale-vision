import os
import json
import logging
from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, Optional, Tuple

import requests
from django.conf import settings
from django.db import connection

logger = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_envelope(
    *,
    event_name: str,
    source: str,
    data: Dict[str, Any],
    meta: Optional[Dict[str, Any]] = None,
    event_version: int = 1,
    lead_id=None,
    org_id=None,
) -> Dict[str, Any]:
    # Compatível com edge-agent/src/events/builder.py
    return {
        "event_id": data.get("receipt_id") or data.get("event_id") or None,
        "event_name": str(event_name),
        "event_version": event_version,
        "ts": data.get("occurred_at") or data.get("ts") or now_iso(),
        "source": source,
        "lead_id": lead_id,
        "org_id": org_id,
        "data": data,
        "meta": meta or {},
    }


def _webhook_url() -> Optional[str]:
    return getattr(settings, "N8N_EVENTS_WEBHOOK", None) or os.getenv("N8N_EVENTS_WEBHOOK")


def _cooldowns() -> Tuple[int, int]:
    degraded = int(getattr(settings, "STATUS_COOLDOWN_DEGRADED_SECONDS", 600) or 600)
    offline = int(getattr(settings, "STATUS_COOLDOWN_OFFLINE_SECONDS", 1800) or 1800)
    return degraded, offline


def _should_cooldown(current_status: str) -> int:
    degraded_cd, offline_cd = _cooldowns()
    if current_status == "offline":
        return offline_cd
    if current_status == "degraded":
        return degraded_cd
    return 0


def _event_receipt_exists(event_id: str) -> bool:
    # event_receipts.event_id tem UNIQUE no Supabase (você colou schema)
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM public.event_receipts WHERE event_id = %s LIMIT 1", [event_id])
        return cursor.fetchone() is not None


def _insert_event_receipt_if_new(event_id: str, event_name: str, envelope: dict) -> bool:
    """
    Idempotência do outgoing:
    - tenta inserir event_receipts com event_id = receipt_id
    - se já existir, retorna False (não reenviar)
    """
    raw = json.dumps(envelope, ensure_ascii=False)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO public.event_receipts (event_id, event_name, event_version, ts, source, raw, meta)
            VALUES (%s, %s, %s, now(), %s, %s::jsonb, %s::jsonb)
            ON CONFLICT (event_id) DO NOTHING
            """,
            [event_id, event_name, 1, envelope.get("source", "backend"), raw, json.dumps(envelope.get("meta") or {})],
        )
        return cursor.rowcount == 1


def _latest_status_event_for_store(store_id: str) -> Optional[dict]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT raw
            FROM public.event_receipts
            WHERE event_name = 'store_status_changed'
              AND raw->'data'->>'store_id' = %s
            ORDER BY received_at DESC
            LIMIT 1
            """,
            [store_id],
        )
        row = cursor.fetchone()
        if not row:
            return None
        return row[0]


def _latest_status_event_for_camera(camera_id: str) -> Optional[dict]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT raw
            FROM public.event_receipts
            WHERE event_name = 'camera_status_changed'
              AND raw->'data'->>'camera_id' = %s
            ORDER BY received_at DESC
            LIMIT 1
            """,
            [camera_id],
        )
        row = cursor.fetchone()
        if not row:
            return None
        return row[0]


def _cooldown_ok(scope_key: str, current_status: str) -> bool:
    """
    Scope cooldown by (scope_key, current_status).
    Uses last sent event timestamp from event_receipts (received_at).
    """
    cd = _should_cooldown(current_status)
    if cd <= 0:
        return True
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT received_at
            FROM public.event_receipts
            WHERE raw->'data'->>'cooldown_scope' = %s
              AND raw->'data'->>'current_status' = %s
            ORDER BY received_at DESC
            LIMIT 1
            """,
            [scope_key, current_status],
        )
        row = cursor.fetchone()
        if not row:
            return True
        last_sent = row[0]
    age = (datetime.now(timezone.utc) - last_sent).total_seconds()
    return age >= cd


def emit_enveloped_status_event(event_name: str, data: dict, meta: Optional[dict] = None) -> None:
    url = _webhook_url()
    if not url:
        logger.info("[STATUS_EVENTS] N8N_EVENTS_WEBHOOK not set; skipping emit for %s", event_name)
        return

    # Idempotência: event_id = receipt_id
    event_id = data.get("receipt_id")
    if not event_id:
        logger.warning("[STATUS_EVENTS] missing receipt_id, skipping")
        return

    envelope = build_envelope(
        event_name=event_name,
        source="backend",
        data=data,
        meta=meta or {},
        event_version=1,
        org_id=data.get("org_id"),
        lead_id=None,
    )

    # Cooldown gating
    scope = data.get("cooldown_scope")
    if scope and not _cooldown_ok(scope, data.get("current_status")):
        logger.info("[STATUS_EVENTS] cooldown active (%s, %s) skip", scope, data.get("current_status"))
        return

    # Insert outgoing receipt (dedupe hard)
    is_new = _insert_event_receipt_if_new(event_id=event_id, event_name=event_name, envelope=envelope)
    if not is_new:
        logger.info("[STATUS_EVENTS] dedup outgoing event_id=%s (skip)", event_id)
        return

    try:
        resp = requests.post(url, json=envelope, timeout=10)
        if resp.status_code >= 300:
            logger.warning("[STATUS_EVENTS] webhook failed %s %s", resp.status_code, resp.text[:300])
    except Exception:
        logger.exception("[STATUS_EVENTS] webhook exception")


def _stable_occurred_at(*, heartbeat_iso: Optional[str]) -> str:
    """Return a stable ISO timestamp for idempotent transition receipts.

    - Prefer the heartbeat timestamp that caused the status classification (stable across retries).
    - If missing (e.g., tick-based offline without ingest), bucket 'now' to the current minute.
    """
    if heartbeat_iso:
        return heartbeat_iso
    dt = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    return dt.isoformat()


def make_receipt_id(prefix: str, entity_id: str, prev: str, curr: str, occurred_at_iso: str) -> str:
    """Deterministic and compact receipt id (safe for retries).

    Uses a short hash suffix to avoid extremely long IDs while preserving human readability.
    """
    base = f"{prefix}:{entity_id}:{prev}->{curr}:{occurred_at_iso}"
    h = hashlib.sha1(base.encode("utf-8")).hexdigest()[:10]
    return f"{prefix}:{entity_id}:{prev}->{curr}:{occurred_at_iso}:{h}"


def emit_store_status_changed(*, store, prev_status: str, new_status: str, snapshot: dict, meta: Optional[dict] = None) -> None:
    occurred_at = _stable_occurred_at(heartbeat_iso=snapshot.get('last_heartbeat'))
    receipt_id = make_receipt_id("store", str(store.id), prev_status, new_status, occurred_at)

    counts = snapshot.get("counts") or {
        "online": snapshot.get("cameras_online"),
        "total": snapshot.get("cameras_total"),
    }

    data = {
        "event_type": "store_status_changed",
        "entity_type": "store",
        "cameras_online": int(counts.get("online") or 0),
        "cameras_total": int(counts.get("total") or 0),
        "schema_version": 1,
        "occurred_at": occurred_at,
        "receipt_id": receipt_id,
        "cooldown_scope": f"store:{store.id}",

        "store_id": str(store.id),
        "camera_id": None,
        "external_id": None,

        "previous_status": prev_status,
        "current_status": new_status,
        "reason": snapshot.get("store_status_reason") or "status_changed",
        "age_seconds": snapshot.get("store_status_age_seconds"),
        "counts": {"online": int(counts.get("online") or 0), "total": int(counts.get("total") or 0)},
        "store_name": getattr(store, "name", None),
        "last_heartbeat": snapshot.get("last_heartbeat"),
        "org_id": str(store.org_id) if getattr(store, "org_id", None) else None,
    }

    emit_enveloped_status_event("store_status_changed", data, meta=meta)


def emit_camera_status_changed(
    *,
    store,
    camera,
    prev_status: str,
    new_status: str,
    reason: str,
    age_seconds: Optional[int],
    last_heartbeat_ts: Optional[str],
    meta: Optional[dict] = None,
) -> None:
    occurred_at = _stable_occurred_at(heartbeat_iso=last_heartbeat_ts)
    receipt_id = make_receipt_id("camera", str(camera.id), prev_status, new_status, occurred_at)

    data = {
        "event_type": "camera_status_changed",
        "entity_type": "camera",
        "schema_version": 1,
        "occurred_at": occurred_at,
        "receipt_id": receipt_id,
        "cooldown_scope": f"camera:{camera.id}",

        "store_id": str(store.id) if store else None,
        "camera_id": str(camera.id),
        "external_id": getattr(camera, "external_id", None),

        "previous_status": prev_status,
        "current_status": new_status,
        "reason": reason or "status_changed",
        "age_seconds": age_seconds,
        "counts": None,
        "last_heartbeat": last_heartbeat_ts,
        "org_id": str(store.org_id) if store and getattr(store, "org_id", None) else None,
        "store_name": getattr(store, "name", None) if store else None,
        "camera_name": getattr(camera, "name", None),
    }

    emit_enveloped_status_event("camera_status_changed", data, meta=meta)