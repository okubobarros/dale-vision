import logging
import os
from typing import Optional, Tuple

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone

from apps.core.models import Organization, OrgMember
from apps.stores.services.user_uuid import ensure_user_uuid

logger = logging.getLogger(__name__)


def _get_supabase_config() -> Tuple[Optional[str], Optional[str]]:
    url = getattr(settings, "SUPABASE_URL", None) or os.getenv("SUPABASE_URL")
    key = getattr(settings, "SUPABASE_KEY", None) or os.getenv("SUPABASE_KEY")
    return url, key


def _fetch_supabase_user(token: str) -> dict:
    url, key = _get_supabase_config()
    if not url:
        raise ValueError("Supabase não configurado.")

    headers = {"Authorization": f"Bearer {token}"}
    if key:
        headers["apikey"] = key

    try:
        resp = requests.get(f"{url.rstrip('/')}/auth/v1/user", headers=headers, timeout=6)
    except requests.RequestException:
        logger.exception("[SUPABASE] auth user request failed")
        raise ValueError("Token inválido.")

    if resp.status_code != 200:
        logger.warning("[SUPABASE] auth user invalid status=%s", resp.status_code)
        raise ValueError("Token inválido.")
    return resp.json() or {}


def _normalize_username(email: str, supa_id: str) -> str:
    base = (email or "").strip().lower()
    if base:
        return base
    return (supa_id or "user").strip().lower()


def _get_or_create_user_from_supabase(user_info: dict) -> User:
    email = (user_info.get("email") or "").strip().lower()
    supa_id = (user_info.get("id") or "").strip()
    if not email and not supa_id:
        raise ValueError("Token inválido.")

    user = None
    if email:
        user = User.objects.filter(email__iexact=email).first()
    if user is None and supa_id:
        user = User.objects.filter(username__iexact=supa_id).first()

    if user is None:
        username = _normalize_username(email, supa_id)
        if User.objects.filter(username__iexact=username).exists():
            suffix = supa_id[:8] if supa_id else "user"
            username = f"{username}-{suffix}"
        user = User.objects.create_user(
            username=username,
            email=email or None,
            password=User.objects.make_random_password(),
            first_name=user_info.get("user_metadata", {}).get("first_name", "") or "",
            last_name=user_info.get("user_metadata", {}).get("last_name", "") or "",
        )
        logger.info("[SUPABASE] user created username=%s email=%s", user.username, user.email or "n/a")

    if not user.is_active:
        user.is_active = True
        user.save(update_fields=["is_active"])
    if email and user.email != email:
        user.email = email
        user.save(update_fields=["email"])
    return user


def ensure_org_membership(user: User) -> None:
    user_uuid = ensure_user_uuid(user)
    if OrgMember.objects.filter(user_id=user_uuid).exists():
        return

    name = user.email.split("@")[0] if user.email else user.username or "Minha organização"
    org = Organization.objects.create(
        name=name,
        created_at=timezone.now(),
    )
    OrgMember.objects.create(
        org=org,
        user_id=user_uuid,
        role="owner",
        created_at=timezone.now(),
    )
    logger.info("[SUPABASE] org created org_id=%s user_uuid=%s", str(org.id), str(user_uuid))


def get_user_from_supabase_token(token: str, ensure_org: bool = True) -> User:
    user_info = _fetch_supabase_user(token)
    user = _get_or_create_user_from_supabase(user_info)
    if ensure_org:
        ensure_org_membership(user)
    return user


class SupabaseJWTAuthentication:
    """
    Accepts Supabase access tokens in Authorization: Bearer <jwt>.
    """

    def authenticate(self, request):
        from rest_framework.authentication import get_authorization_header
        from rest_framework.exceptions import AuthenticationFailed

        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() != b"bearer":
            return None
        if len(auth) == 1:
            raise AuthenticationFailed("Token inválido.")
        if len(auth) > 2:
            raise AuthenticationFailed("Token inválido.")

        token = auth[1].decode("utf-8")
        try:
            user = get_user_from_supabase_token(token, ensure_org=True)
        except ValueError as exc:
            raise AuthenticationFailed(str(exc) or "Token inválido.")
        return (user, token)
