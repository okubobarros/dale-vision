from typing import Iterable, Optional
from django.core.exceptions import PermissionDenied
from django.db.utils import OperationalError, ProgrammingError
from django.db.models import Q

from apps.core.models import OrgMember, Store, StoreManager
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
        sm = (
            StoreManager.objects.filter(store_id=store_id, user_id=user.id)
            .order_by("-created_at")
            .first()
        )
        if sm and sm.role:
            return sm.role
    except (OperationalError, ProgrammingError):
        pass

    member = OrgMember.objects.filter(
        org_id=store.get("org_id"),
        user_id=user_uuid,
    ).first()
    if member:
        return member.role
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
    store_ids = list(
        StoreManager.objects.filter(user_id=user.id).values_list("store_id", flat=True)
    )
    if not org_ids and not store_ids:
        return qs.none()
    if org_ids and store_ids:
        return qs.filter(Q(store__org_id__in=org_ids) | Q(store_id__in=store_ids))
    if org_ids:
        return qs.filter(store__org_id__in=org_ids)
    return qs.filter(store_id__in=store_ids)
