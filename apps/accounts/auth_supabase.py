import logging
import os
from typing import Optional, Tuple
from uuid import uuid4

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db import DatabaseError
from django.utils import timezone
from rest_framework.exceptions import APIException

from apps.core.models import Organization, OrgMember
from apps.stores.services.user_uuid import upsert_user_id_map

logger = logging.getLogger(__name__)

class SupabaseConfigError(APIException):
    status_code = 500
    default_detail = {
        "ok": False,
        "code": "SUPABASE_MISSING_CONFIG",
        "message": "Auth provider not configured",
    }
    default_code = "supabase_missing_config"


class SupabaseProvisioningError(APIException):
    status_code = 500
    default_detail = {
        "ok": False,
        "code": "SUPABASE_PROVISIONING_ERROR",
        "message": "Erro ao provisionar usuário",
    }
    default_code = "supabase_provisioning_error"


def _get_supabase_config() -> Tuple[Optional[str], Optional[str]]:
    url = getattr(settings, "SUPABASE_URL", None) or os.getenv("SUPABASE_URL")
    anon_key = getattr(settings, "SUPABASE_ANON_KEY", None) or os.getenv("SUPABASE_ANON_KEY")
    if not anon_key:
        anon_key = getattr(settings, "SUPABASE_KEY", None) or os.getenv("SUPABASE_KEY")
    return url, anon_key


def _get_supabase_auth_timeout_seconds() -> float:
    raw = (
        getattr(settings, "SUPABASE_AUTH_TIMEOUT_SECONDS", None)
        or os.getenv("SUPABASE_AUTH_TIMEOUT_SECONDS")
        or "4"
    )
    try:
        timeout = float(raw)
    except (TypeError, ValueError):
        timeout = 4.0
    return max(1.0, min(timeout, 15.0))


def _mask_token(token: str) -> str:
    token = token or ""
    if len(token) <= 12:
        return f"{token[:3]}...{token[-3:]}" if token else "n/a"
    return f"{token[:6]}...{token[-6:]}"


def _fetch_supabase_user(token: str) -> dict:
    url, key = _get_supabase_config()
    if not url or not key:
        logger.error("[SUPABASE] missing_config url=%s key=%s", bool(url), bool(key))
        raise SupabaseConfigError()

    headers = {"Authorization": f"Bearer {token}"}
    if key:
        headers["apikey"] = key

    timeout_seconds = _get_supabase_auth_timeout_seconds()
    timeout_tuple = (min(2.0, timeout_seconds), timeout_seconds)
    try:
        resp = requests.get(
            f"{url.rstrip('/')}/auth/v1/user",
            headers=headers,
            timeout=timeout_tuple,
        )
    except requests.RequestException:
        logger.exception("[SUPABASE] auth user request failed timeout=%s", timeout_seconds)
        raise ValueError("Token inválido.")

    if resp.status_code != 200:
        logger.warning("[SUPABASE] auth user invalid status=%s", resp.status_code)
        raise ValueError("Token inválido.")
    return resp.json() or {}


def _get_or_create_user_from_supabase(email: str, supa_id: str, user_info: dict) -> User:
    if not email:
        raise ValueError("Email ausente.")

    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User.objects.filter(username__iexact=email).first()

    if user is None:
        user = User.objects.create_user(
            username=email,
            email=email,
            password=User.objects.make_random_password(),
            first_name=user_info.get("user_metadata", {}).get("first_name", "") or "",
            last_name=user_info.get("user_metadata", {}).get("last_name", "") or "",
        )
        logger.info("[SUPABASE] user created email=%s", user.email or "n/a")

    updated_fields = []
    if user.username != email:
        if not User.objects.filter(username__iexact=email).exclude(id=user.id).exists():
            user.username = email
            updated_fields.append("username")
        else:
            logger.warning("[SUPABASE] username collision for email=%s user_id=%s", email, user.id)

    if user.email != email:
        user.email = email
        updated_fields.append("email")

    if not user.is_active:
        user.is_active = True
        updated_fields.append("is_active")

    if updated_fields:
        user.save(update_fields=updated_fields)

    return user


def ensure_org_membership(user: User, *, user_uuid: Optional[str] = None) -> None:
    mapped_uuid = upsert_user_id_map(user, user_uuid=user_uuid)
    user_uuid = mapped_uuid
    if OrgMember.objects.filter(user_id=user_uuid).exists():
        return

    name = user.email.split("@")[0] if user.email else user.username or "Minha organização"
    org = Organization.objects.create(
        name=name,
        created_at=timezone.now(),
        trial_ends_at=timezone.now() + timezone.timedelta(hours=72),
    )
    OrgMember.objects.create(
        org=org,
        user_id=user_uuid,
        role="owner",
        created_at=timezone.now(),
    )
    logger.info("[SUPABASE] org created org_id=%s user_uuid=%s", str(org.id), str(user_uuid))


def _extract_supabase_identity(user_info: dict) -> Tuple[str, str]:
    sub = (user_info.get("id") or user_info.get("sub") or "").strip()
    email = (user_info.get("email") or "").strip().lower()
    if not sub:
        raise ValueError("Supabase sub ausente.")
    if not email:
        raise ValueError("Email ausente.")
    return sub, email


def provision_user_from_supabase_info(user_info: dict, *, ensure_org: bool = True) -> User:
    sub, email = _extract_supabase_identity(user_info)
    user = _get_or_create_user_from_supabase(email, sub, user_info)
    mapped_uuid = upsert_user_id_map(user, user_uuid=sub)
    logger.info(
        "[SUPABASE] provisioned user_id=%s email=%s user_uuid=%s",
        user.id,
        email,
        mapped_uuid,
    )
    if ensure_org:
        ensure_org_membership(user, user_uuid=mapped_uuid)
    return user


def get_user_from_supabase_token(token: str, ensure_org: bool = True) -> User:
    user_info = _fetch_supabase_user(token)
    return provision_user_from_supabase_info(user_info, ensure_org=ensure_org)


class SupabaseJWTAuthentication:
    """
    Accepts Supabase access tokens in Authorization: Bearer <jwt>.
    """

    def authenticate_header(self, request):
        return "Bearer"

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

        token = auth[1].decode("utf-8", errors="ignore")
        token_short = _mask_token(token)
        request_id = (request.headers.get("X-Request-ID") or uuid4().hex)[:12]

        try:
            url, key = _get_supabase_config()
            if not url or not key:
                logger.error(
                    "[SUPABASE] request_id=%s token=%s missing_config url=%s key=%s",
                    request_id,
                    token_short,
                    bool(url),
                    bool(key),
                )
                raise SupabaseConfigError()

            user = get_user_from_supabase_token(token, ensure_org=True)
            return (user, token)
        except SupabaseConfigError:
            raise
        except AuthenticationFailed:
            raise
        except DatabaseError as exc:
            logger.exception(
                "[SUPABASE] request_id=%s token=%s provisioning_error=%s",
                request_id,
                token_short,
                exc,
            )
            raise SupabaseProvisioningError()
        except ValueError as exc:
            logger.warning(
                "[SUPABASE] request_id=%s token=%s auth_failed error=%s",
                request_id,
                token_short,
                str(exc) or "invalid_token",
            )
            raise AuthenticationFailed(str(exc) or "Token inválido.")
        except Exception as exc:
            logger.exception(
                "[SUPABASE] request_id=%s token=%s unexpected_error=%s",
                request_id,
                token_short,
                exc,
            )
            raise AuthenticationFailed("Token inválido.")
