# apps/alerts/services.py
import requests
from django.conf import settings

def send_event_to_n8n(payload: dict) -> dict:
    webhook = getattr(settings, "N8N_ALERTS_WEBHOOK", None)
    if not webhook:
        return {"ok": False, "error": "N8N_ALERTS_WEBHOOK not configured"}

    try:
        r = requests.post(webhook, json=payload, timeout=8)
        if r.ok:
            data = None
            try:
                data = r.json()
            except Exception:
                data = {"text": r.text}
            return {"ok": True, "status": r.status_code, "data": data}
        return {"ok": False, "status": r.status_code, "error": r.text}
    except Exception as e:
        return {"ok": False, "error": str(e)}
