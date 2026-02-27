import re
from typing import Optional

from django.http import JsonResponse
from django.core.cache import cache
from apps.core.models import Store, Camera
from apps.stores.services.user_orgs import get_user_org_ids
from backend.utils.entitlements import (
    is_trial_expired,
    get_org_trial_ends_at,
    is_subscription_active,
)
from apps.core.services.journey_events import log_journey_event


STORE_PATH_RE = re.compile(r"/stores/(?P<store_id>[0-9a-fA-F-]+)/")
CAMERA_PATH_RE = re.compile(r"/cameras/(?P<camera_id>[0-9a-fA-F-]+)/")


class TrialEnforcementMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path or ""
        if not path.startswith("/api/"):
            return self.get_response(request)

        if self._is_whitelisted(path):
            return self.get_response(request)

        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return self.get_response(request)
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            return self.get_response(request)

        org_id = self._resolve_org_id(request)
        if not org_id:
            return self.get_response(request)

        if not is_trial_expired(org_id):
            return self.get_response(request)

        trial_ends_at = get_org_trial_ends_at(org_id)
        payload = {
            "code": "TRIAL_EXPIRED",
            "message": "Trial expirado. Assinatura necessária.",
            "trial_ended_at": trial_ends_at.isoformat() if trial_ends_at else None,
            "upgrade_url": "/app/upgrade",
        }
        try:
            cache_key = f"trial-expired-shown:{org_id}"
            if not cache.get(cache_key):
                log_journey_event(
                    org_id=str(org_id),
                    event_name="trial_expired_shown",
                    payload={
                        "path": request.path,
                        "trial_ended_at": payload.get("trial_ended_at"),
                    },
                    source="app",
                )
                cache.set(cache_key, True, 900)
        except Exception:
            pass
        return JsonResponse(payload, status=402)

    def _is_whitelisted(self, path: str) -> bool:
        whitelist = (
            "/api/v1/report/summary",
            "/api/v1/report/export",
            "/api/v1/billing/plans",
            "/api/v1/me/status",
            "/api/accounts/",
            "/api/me/setup-state/",
            "/api/health/",
            "/api/edge/",
            "/health",
            "/swagger",
            "/redoc",
        )
        return any(path.startswith(prefix) for prefix in whitelist)

    def _resolve_org_id(self, request) -> Optional[str]:
        store_id = request.GET.get("store_id") or request.GET.get("store")
        org_id = request.GET.get("org_id") or request.GET.get("org")
        if store_id:
            row = Store.objects.filter(id=store_id).values("org_id").first()
            if row:
                return str(row["org_id"])
        if org_id:
            return str(org_id)

        match = STORE_PATH_RE.search(request.path or "")
        if match:
            row = Store.objects.filter(id=match.group("store_id")).values("org_id").first()
            if row:
                return str(row["org_id"])

        match = CAMERA_PATH_RE.search(request.path or "")
        if match:
            row = (
                Camera.objects.filter(id=match.group("camera_id"))
                .values("store__org_id")
                .first()
            )
            if row and row.get("store__org_id"):
                return str(row["store__org_id"])

        org_ids = get_user_org_ids(request.user)
        if len(org_ids) == 1:
            return str(org_ids[0])
        return None
