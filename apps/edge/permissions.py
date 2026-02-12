# apps/edge/permissions.py
import hashlib
import os
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import BasePermission
from knox.auth import TokenAuthentication

from .models import EdgeToken

def _extract_store_id(payload):
    if not isinstance(payload, dict):
        return None
    data = payload.get("data") or {}
    return (
        data.get("store_id")
        or payload.get("store_id")
        or (payload.get("agent") or {}).get("store_id")
    )

def _get_payload(request):
    for attr in ("validated_data", "_validated_data"):
        payload = getattr(request, attr, None)
        if isinstance(payload, dict):
            return payload
    if isinstance(getattr(request, "data", None), dict):
        return request.data
    return {}

def _validate_edge_token_for_store(store_id, provided):
    if not provided or not store_id:
        return False
    token_hash = hashlib.sha256(provided.encode("utf-8")).hexdigest()
    edge_token = EdgeToken.objects.filter(
        store_id=store_id,
        token_hash=token_hash,
        active=True,
    ).first()
    if edge_token:
        EdgeToken.objects.filter(id=edge_token.id).update(last_used_at=timezone.now())
        print("[EDGE] request autorizado via store token")
        return True
    return False

class EdgeOrUserTokenPermission(BasePermission):
    """
    Permite acesso se:
      - Authorization: Token ... for válido (Knox), OU
      - X-EDGE-TOKEN corresponder a um EdgeToken ativo da store
    """
    message = "Edge token inválido para esta loja."

    def has_permission(self, request, view):
        user_auth = TokenAuthentication().authenticate(request)
        if user_auth:
            return True

        provided = request.headers.get("X-EDGE-TOKEN") or ""
        if not provided:
            return False

        payload = _get_payload(request)
        store_id = _extract_store_id(payload)
        if not store_id and hasattr(request, "query_params"):
            store_id = request.query_params.get("store_id")
        if not store_id:
            return False

        if _validate_edge_token_for_store(store_id, provided):
            return True

        if getattr(settings, "DEBUG", False):
            expected = getattr(settings, "EDGE_SHARED_TOKEN", "") or os.getenv("EDGE_SHARED_TOKEN")
            if expected and provided == expected:
                print("[EDGE] request autorizado via EDGE_SHARED_TOKEN (DEBUG)")
                return True

        return False


class EdgeTokenPermission(BasePermission):
    """
    Permite acesso apenas com X-EDGE-TOKEN válido para a store do payload.
    """
    message = "Edge token inválido para esta loja."

    def has_permission(self, request, view):
        provided = request.headers.get("X-EDGE-TOKEN") or ""
        if not provided:
            return False

        payload = _get_payload(request)
        store_id = _extract_store_id(payload)
        if not store_id and hasattr(request, "query_params"):
            store_id = request.query_params.get("store_id")
        if not store_id:
            return False

        if _validate_edge_token_for_store(store_id, provided):
            return True

        if getattr(settings, "DEBUG", False):
            expected = getattr(settings, "EDGE_SHARED_TOKEN", "") or os.getenv("EDGE_SHARED_TOKEN")
            if expected and provided == expected:
                print("[EDGE] request autorizado via EDGE_SHARED_TOKEN (DEBUG)")
                return True

        return False
