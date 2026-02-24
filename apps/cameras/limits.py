from typing import Optional

from django.core.exceptions import FieldError
from django.db import connection
from django.db.utils import OperationalError, ProgrammingError

from apps.core.models import Camera, Store
from apps.billing.utils import (
    PaywallError,
    PAYWALL_TRIAL_MESSAGE,
    is_trial,
    log_paywall_block,
)

TRIAL_CAMERA_LIMIT = 3
TRIAL_CAMERA_LIMIT_MESSAGE = PAYWALL_TRIAL_MESSAGE

PLAN_LIMITS = {
    "trial": {"cameras": TRIAL_CAMERA_LIMIT, "stores": 1},
}


def camera_active_column_exists() -> bool:
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "cameras")
        return any(col.name == "active" for col in columns)
    except Exception:
        return False


def get_store_meta(store_id: str) -> dict:
    row = Store.objects.filter(id=store_id).values("status", "org_id").first()
    return row or {}


def get_plan_limits(org_id: Optional[str]) -> dict:
    if not org_id:
        return {}
    if is_trial(org_id):
        return PLAN_LIMITS.get("trial", {})
    return {}


def get_camera_limit_for_store(store_id: str) -> Optional[int]:
    meta = get_store_meta(store_id)
    org_id = meta.get("org_id")
    limits = get_plan_limits(org_id)
    return limits.get("cameras")


def count_active_cameras(store_id: str, *, exclude_camera_id: Optional[str] = None) -> int:
    qs = Camera.objects.filter(store_id=store_id)
    if camera_active_column_exists():
        try:
            qs = qs.filter(active=True)
        except FieldError:
            pass
    if exclude_camera_id:
        qs = qs.exclude(id=exclude_camera_id)
    try:
        return int(qs.count())
    except (OperationalError, ProgrammingError):
        return 0


def enforce_trial_camera_limit(
    store_id: str,
    *,
    requested_active: bool = True,
    exclude_camera_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    user=None,
) -> None:
    if user is not None and (
        getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)
    ):
        return
    if not requested_active:
        return

    meta = get_store_meta(store_id)
    status = meta.get("status")
    org_id = meta.get("org_id")
    if status != "trial" and not is_trial(org_id):
        return

    limit = get_camera_limit_for_store(store_id) or TRIAL_CAMERA_LIMIT
    active_count = count_active_cameras(store_id, exclude_camera_id=exclude_camera_id)
    if active_count >= limit:
        log_paywall_block(
            org_id=org_id,
            store_id=store_id,
            actor_user_id=actor_user_id,
            entity="camera",
            limit=limit,
        )
        raise PaywallError(meta={"limit": limit, "entity": "camera"})
