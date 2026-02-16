from __future__ import annotations

import logging
from typing import Optional

from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException

from apps.core.models import AuditLog, Organization, Store, Subscription

logger = logging.getLogger(__name__)

SUBSCRIPTION_REQUIRED_CODE = "SUBSCRIPTION_REQUIRED"


class SubscriptionRequiredError(APIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_code = SUBSCRIPTION_REQUIRED_CODE

    def __init__(self, *, message: Optional[str] = None):
        payload = {
            "code": SUBSCRIPTION_REQUIRED_CODE,
            "message": message or "Trial expired. Subscription required.",
        }
        self.detail = payload


def _get_org_trial_ends_at(org_id: Optional[str]):
    if not org_id:
        return None
    org_row = Organization.objects.filter(id=org_id).values("trial_ends_at").first()
    if org_row and org_row.get("trial_ends_at"):
        return org_row["trial_ends_at"]

    derived = (
        Store.objects.filter(org_id=org_id, trial_ends_at__isnull=False)
        .order_by("trial_ends_at")
        .values_list("trial_ends_at", flat=True)
        .first()
    )
    if derived and org_row is not None:
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
    if status_value not in ("active", "trialing"):
        return False
    if status_value == "trialing":
        period_end = getattr(sub, "current_period_end", None)
        if period_end:
            if timezone.is_naive(period_end):
                period_end = timezone.make_aware(period_end)
            if period_end < timezone.now():
                return False
    return True


def can_use_product(org_id: Optional[str]) -> bool:
    return is_subscription_active(org_id)


def log_subscription_block(
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
            action="subscription_required_blocked",
            payload={
                "code": SUBSCRIPTION_REQUIRED_CODE,
                "action": action,
                "endpoint": endpoint,
            },
            created_at=timezone.now(),
        )
    except Exception:
        logger.exception("[ENTITLEMENTS] failed to write subscription block audit log")


def require_active_subscription(
    *,
    org_id: Optional[str],
    actor_user_id: Optional[str],
    action: str,
    endpoint: str,
) -> None:
    if is_subscription_active(org_id):
        return
    log_subscription_block(
        org_id=org_id,
        actor_user_id=actor_user_id,
        action=action,
        endpoint=endpoint,
    )
    raise SubscriptionRequiredError()


def enforce_can_use_product(
    *,
    org_id: Optional[str],
    actor_user_id: Optional[str],
    action: str,
    endpoint: str,
) -> None:
    require_active_subscription(
        org_id=org_id,
        actor_user_id=actor_user_id,
        action=action,
        endpoint=endpoint,
    )


TrialExpiredError = SubscriptionRequiredError
