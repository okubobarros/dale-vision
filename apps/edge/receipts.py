import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def _parse_iso(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        # Python 3.11+: fromisoformat aceita "+00:00"
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def _minute_bucket_iso(ts: Optional[str]) -> str:
    dt = _parse_iso(ts) or datetime.now(timezone.utc)
    dt = dt.replace(second=0, microsecond=0)
    return dt.isoformat().replace("+00:00", "Z")


def compute_receipt_id(envelope: Dict[str, Any]) -> str:
    """
    Idempotência (v1):
    - Se envelope.meta.receipt_id já existir, respeita (source de verdade).
    - Para status events (store/camera), gera receipt_id determinístico por transição + bucket de minuto
      (evita spam em retries e mantém 1 evento por transição na janela).
    - Fallback: hash de campos principais.
    """
    meta = envelope.get("meta") or {}
    if isinstance(meta, dict) and meta.get("receipt_id"):
        return str(meta["receipt_id"])

    event_name = str(envelope.get("event_name") or "")
    data = envelope.get("data") or {}
    if not isinstance(data, dict):
        data = {}

    # Preferir o timestamp de transição (ocorreu) e não o "momento do envio"
    occurred_at = data.get("occurred_at") or data.get("ts") or envelope.get("ts")
    bucket_ts = _minute_bucket_iso(str(occurred_at) if occurred_at else None)

    if event_name in ("store_status_changed", "camera_status_changed"):
        store_id = data.get("store_id") or ""
        camera_id = data.get("camera_id") or "-"
        prev_s = data.get("previous_status") or "-"
        curr_s = data.get("current_status") or "-"
        base_str = f"v1:{event_name}:{store_id}:{camera_id}:{prev_s}:{curr_s}:{bucket_ts}"
        return hashlib.sha256(base_str.encode("utf-8")).hexdigest()

    # fallback genérico (mantém compat com outros eventos)
    base = {
        "event_name": event_name,
        "event_version": envelope.get("event_version", 1),
        "store_id": data.get("store_id"),
        "camera_id": data.get("camera_id"),
        "bucket_ts": bucket_ts,
    }
    raw = json.dumps(base, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
