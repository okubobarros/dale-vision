import hashlib
import logging
from typing import Optional
from dataclasses import dataclass

from django.utils import timezone
from rest_framework.authentication import get_authorization_header
from apps.edge.models import EdgeToken
from apps.core.models import Store
from apps.accounts.auth_supabase import SupabaseJWTAuthentication

logger = logging.getLogger(__name__)


def _mask_token(token: str) -> str:
    if not token:
        return "***"
    if len(token) <= 8:
        return "***"
    return f"{token[:4]}...{token[-4:]}"


def _extract_store_token(request) -> Optional[str]:
    auth_header = request.headers.get("Authorization") or ""
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return request.headers.get("X-EDGE-TOKEN") or None


@dataclass
class EdgeTokenAuthResult:
    ok: bool
    status_code: int
    code: Optional[str] = None
    detail: Optional[str] = None
    store_id: Optional[str] = None


class EdgeAwareJWTAuthentication(SupabaseJWTAuthentication):
    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() != b"bearer":
            return None
        if len(auth) < 2:
            return None
        token = auth[1].decode("utf-8", errors="ignore")
        if token.count(".") < 2:
            return None
        return super().authenticate(request)


def authenticate_edge_token(request, requested_store_id: Optional[str] = None) -> EdgeTokenAuthResult:
    token = _extract_store_token(request)
    if not token:
        return EdgeTokenAuthResult(
            ok=False,
            status_code=401,
            code="edge_token_invalid",
            detail="Edge token inválido.",
        )

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    edge_token = EdgeToken.objects.filter(
        token_hash=token_hash,
        active=True,
    ).first()
    if not edge_token:
        logger.warning("[EDGE-AUTH] invalid token token=%s", _mask_token(token))
        return EdgeTokenAuthResult(
            ok=False,
            status_code=401,
            code="edge_token_invalid",
            detail="Edge token inválido.",
        )

    token_store_id = str(edge_token.store_id)
    if requested_store_id and str(requested_store_id) != token_store_id:
        logger.warning(
            "[EDGE-AUTH] store mismatch requested=%s token_store=%s token=%s",
            str(requested_store_id),
            token_store_id,
            _mask_token(token),
        )
        return EdgeTokenAuthResult(
            ok=False,
            status_code=403,
            code="edge_store_mismatch",
            detail="Edge token não pertence à store informada.",
            store_id=token_store_id,
        )

    EdgeToken.objects.filter(id=edge_token.id).update(last_used_at=timezone.now())
    request.edge_store_id = token_store_id
    request.store = Store.objects.filter(id=token_store_id).first()
    return EdgeTokenAuthResult(ok=True, status_code=200, store_id=token_store_id)


def validate_store_token(request, store_id: str) -> bool:
    if not store_id:
        return False
    result = authenticate_edge_token(request, requested_store_id=str(store_id))
    return bool(result.ok)
