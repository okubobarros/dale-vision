# apps/stores/services/user_orgs.py
from apps.core.models import OrgMember
from apps.stores.services.user_uuid import ensure_user_uuid


def get_user_org_ids(user):
    user_uuid = ensure_user_uuid(user)
    return list(
        OrgMember.objects.filter(user_id=user_uuid).values_list("org_id", flat=True)
    )
