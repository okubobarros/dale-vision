from typing import Iterable, Optional
from django.core.exceptions import PermissionDenied
from django.utils import timezone

from apps.core.models import OrgMember, Store, SupportAccessGrant
from apps.stores.services.user_uuid import ensure_user_uuid


ALLOWED_MANAGE_ROLES = ("owner", "admin", "manager")
ALLOWED_READ_ROLES = ("owner", "admin", "manager", "viewer")


def _is_privileged(user) -> bool:
    return bool(getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))


def get_user_role_for_store(user, store_id: str) -> Optional[str]:
    if _is_privileged(user):
        return "owner"

    store = Store.objects.filter(id=store_id).values("org_id").first()
    if not store:
        return None

    user_uuid = ensure_user_uuid(user)
    try:
        has_support_grant = SupportAccessGrant.objects.filter(
            store_id=store_id,
            user_uuid=user_uuid,
            active=True,
            expires_at__gt=timezone.now(),
        ).exists()
    except Exception:
        has_support_grant = False
    member = OrgMember.objects.filter(
        org_id=store.get("org_id"),
        user_id=user_uuid,
    ).first()
    if member:
        if member.role == "viewer" and has_support_grant:
            return "manager"
        return member.role
    if has_support_grant:
        return "manager"
    return None


def require_store_role(user, store_id: str, roles: Iterable[str]) -> None:
    if _is_privileged(user):
        return
    role = get_user_role_for_store(user, store_id)
    if role not in set(roles):
        raise PermissionDenied("Você não tem permissão para acessar esta loja.")


def filter_cameras_for_user(qs, user):
    if _is_privileged(user):
        return qs
    user_uuid = ensure_user_uuid(user)
    org_ids = list(
        OrgMember.objects.filter(user_id=user_uuid).values_list("org_id", flat=True)
    )
    if not org_ids:
        return qs.none()
    return qs.filter(store__org_id__in=org_ids)
