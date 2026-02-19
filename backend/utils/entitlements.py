from __future__ import annotations

import logging
from typing import Optional

from django.db.models import Max
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException

from apps.core.models import AuditLog, Organization, Store, Subscription

logger = logging.getLogger(__name__)

TRIAL_EXPIRED_CODE = "TRIAL_EXPIRED"


class TrialExpiredError(APIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_code = TRIAL_EXPIRED_CODE

    def __init__(self, *, message: Optional[str] = None):
        payload = {
            "code": TRIAL_EXPIRED_CODE,
            "action": "UPGRADE_REQUIRED",
            "message": message or "Trial expired. Subscription required.",
        }
        self.detail = payload


def _get_org_trial_ends_at(org_id: Optional[str]):
    if not org_id:
        return None
    org_row = Organization.objects.filter(id=org_id).values("trial_ends_at").first()
    if not org_row:
        return None
    if org_row.get("trial_ends_at"):
        return org_row["trial_ends_at"]
    derived = (
        Store.objects.filter(org_id=org_id, trial_ends_at__isnull=False)
        .order_by("-trial_ends_at")
        .values_list("trial_ends_at", flat=True)
        .first()
    )
    if derived:
        try:
            Organization.objects.filter(id=org_id).update(trial_ends_at=derived)
        except Exception:
            logger.exception("[ENTITLEMENTS] failed to persist org trial_ends_at org_id=%s", org_id)
    return derived


def is_trial_active(org_id: Optional[str]) -> bool:
    if not org_id:
        return False
    trial_ends_at = _get_org_trial_ends_at(org_id)
    if not trial_ends_at:
        return False
    return timezone.now() < trial_ends_at


def is_subscription_active(org_id: Optional[str]) -> bool:
    if not org_id:
        return False
    try:
        sub = Subscription.objects.filter(org_id=org_id).order_by("-created_at").first()
    except Exception:
        logger.exception("[ENTITLEMENTS] subscription lookup failed org_id=%s", org_id)
        return False
    if not sub:
        return False
    status_value = (sub.status or "").lower()
    return status_value == "active"


def is_trial_expired(org_id: Optional[str]) -> bool:
    if not org_id:
        return False
    if not Organization.objects.filter(id=org_id).exists():
        return False
    if is_subscription_active(org_id):
        return False

    blocked_exists = Store.objects.filter(
        org_id=org_id,
        status="blocked",
        blocked_reason="trial_expired",
    ).exists()
    if blocked_exists:
        return True

    trial_ends_at = _get_org_trial_ends_at(org_id)
    if trial_ends_at and timezone.now() > trial_ends_at:
        return True

    latest_trial = (
        Store.objects.filter(org_id=org_id, trial_ends_at__isnull=False)
        .aggregate(latest=Max("trial_ends_at"))
        .get("latest")
    )
    return bool(latest_trial and timezone.now() > latest_trial)


def can_use_product(org_id: Optional[str]) -> bool:
    return not is_trial_expired(org_id)


def log_trial_block(
    *,
    org_id: Optional[str],
    actor_user_id: Optional[str],
    action: str,
    endpoint: str,
) -> None:
    try:
        AuditLog.objects.create(
            org_id=org_id,
            store_id=None,
            actor_user_id=actor_user_id,
            action="trial_expired_blocked",
            payload={
                "code": TRIAL_EXPIRED_CODE,
                "action": action,
                "endpoint": endpoint,
            },
            created_at=timezone.now(),
        )
    except Exception:
        logger.exception("[ENTITLEMENTS] failed to write trial block audit log")


def require_trial_active(
    *,
    org_id: Optional[str],
    actor_user_id: Optional[str],
    action: str,
    endpoint: str,
) -> None:
    if not is_trial_expired(org_id):
        return
    log_trial_block(
        org_id=org_id,
        actor_user_id=actor_user_id,
        action=action,
        endpoint=endpoint,
    )
    raise TrialExpiredError()


def enforce_can_use_product(
    *,
    org_id: Optional[str],
    actor_user_id: Optional[str],
    action: str,
    endpoint: str,
) -> None:
    require_trial_active(
        org_id=org_id,
        actor_user_id=actor_user_id,
        action=action,
        endpoint=endpoint,
    )


SubscriptionRequiredError = TrialExpiredError


def require_active_subscription(
    *,
    org_id: Optional[str],
    actor_user_id: Optional[str],
    action: str,
    endpoint: str,
) -> None:
    require_trial_active(
        org_id=org_id,
        actor_user_id=actor_user_id,
        action=action,
        endpoint=endpoint,
    )
