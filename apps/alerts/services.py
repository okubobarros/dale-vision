# apps/alerts/services.py
import requests
from typing import Optional, Dict, Any
from django.conf import settings
from django.utils import timezone


DEFAULT_TIMEOUT = 8


def _get_webhook() -> Optional[str]:
    """
    Webhook único para eventos (leads, calendly, alerts, billing, etc.)
    """
    return getattr(settings, "N8N_EVENTS_WEBHOOK", None)


def send_event_to_n8n(
    *,
    event_name: str,
    data: Dict[str, Any],
    event_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    org_id: Optional[str] = None,
    source: str = "backend",
    event_version: int = 1,
    meta: Optional[Dict[str, Any]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """
    Envia um evento padronizado para o n8n.
    - event_name: "lead_created", "alert_triggered", "invoice_overdue", etc.
    - data: payload específico do evento
    - event_id: idealmente o UUID do JourneyEvent (idempotência)
    - lead_id/org_id: usados para roteamento e auditoria
    - meta: extras úteis (ip, user_agent, request_id, etc.)
    """
    webhook = _get_webhook()
    if not webhook:
        return {"ok": False, "error": "N8N_EVENTS_WEBHOOK not configured"}

    payload = {
        "event_id": str(event_id) if event_id else None,
        "event_name": event_name,
        "event_version": event_version,
        "source": source,
        "ts": timezone.now().isoformat(),
        "lead_id": str(lead_id) if lead_id else None,
        "org_id": str(org_id) if org_id else None,
        "data": data or {},
        "meta": meta or {},
    }

    try:
        r = requests.post(webhook, json=payload, timeout=timeout)
        if r.ok:
            try:
                return {"ok": True, "status": r.status_code, "data": r.json()}
            except Exception:
                return {"ok": True, "status": r.status_code, "data": {"text": r.text}}
        return {"ok": False, "status": r.status_code, "error": r.text}
    except Exception as e:
        return {"ok": False, "error": str(e)}
