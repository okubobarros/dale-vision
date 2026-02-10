import logging
from typing import Optional

from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException

from apps.core.models import AuditLog, Store, Subscription

logger = logging.getLogger(__name__)

PAYWALL_TRIAL_CODE = "PAYWALL_TRIAL_LIMIT"
PAYWALL_TRIAL_MESSAGE = "Limite do trial atingido."
TRIAL_STORE_LIMIT = 1


class PaywallError(APIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_code = PAYWALL_TRIAL_CODE

    def __init__(self, *, message: Optional[str] = None, meta: Optional[dict] = None):
        payload = {
            "ok": False,
            "code": PAYWALL_TRIAL_CODE,
            "message": message or PAYWALL_TRIAL_MESSAGE,
            "meta": meta or {},
        }
        self.detail = payload


def is_trial(org_id: Optional[str]) -> bool:
    if not org_id:
        return False

    try:
        sub = Subscription.objects.filter(org_id=org_id).order_by("-created_at").first()
    except Exception:
        logger.exception("is_trial lookup failed; defaulting to trial")
        return True

    if not sub:
        return True

    plan_code = (sub.plan_code or "").lower()
    status = (sub.status or "").lower()
    if status == "trialing" or plan_code == "trial":
        return True

    return False


def log_paywall_block(
    *,
    org_id: Optional[str],
    store_id: Optional[str],
    actor_user_id: Optional[str],
    entity: str,
    limit: int,
    reason: str = PAYWALL_TRIAL_CODE,
) -> None:
    try:
        AuditLog.objects.create(
            org_id=org_id,
            store_id=store_id,
            actor_user_id=actor_user_id,
            action="paywall_blocked",
            payload={
                "code": PAYWALL_TRIAL_CODE,
                "reason": reason,
                "entity": entity,
                "limit": limit,
            },
            created_at=timezone.now(),
        )
    except Exception:
        logger.exception("Failed to write paywall audit log")


def enforce_trial_store_limit(
    *,
    org_id: str,
    actor_user_id: Optional[str] = None,
    limit: int = TRIAL_STORE_LIMIT,
) -> None:
    if not is_trial(org_id):
        return

    count = Store.objects.filter(org_id=org_id).count()
    if count >= limit:
        log_paywall_block(
            org_id=org_id,
            store_id=None,
            actor_user_id=actor_user_id,
            entity="store",
            limit=limit,
        )
        raise PaywallError(meta={"limit": limit, "entity": "store"})
