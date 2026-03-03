import hashlib
import logging
from typing import Optional

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


def validate_store_token(request, store_id: str) -> bool:
    token = _extract_store_token(request)
    if not token or not store_id:
        return False
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    edge_token = EdgeToken.objects.filter(
        store_id=store_id,
        token_hash=token_hash,
        active=True,
    ).first()
    if not edge_token:
        logger.warning(
            "[EDGE-AUTH] invalid token store_id=%s token=%s",
            str(store_id),
            _mask_token(token),
        )
        return False
    EdgeToken.objects.filter(id=edge_token.id).update(last_used_at=timezone.now())
    request.store = Store.objects.filter(id=store_id).first()
    return True
