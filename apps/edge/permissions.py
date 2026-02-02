# apps/edge/permissions.py
from django.conf import settings
from rest_framework.permissions import BasePermission
from knox.auth import TokenAuthentication


class EdgeOrUserTokenPermission(BasePermission):
    """
    Permite acesso se:
      - Authorization: Token ... for válido (Knox), OU
      - X-EDGE-TOKEN corresponder a settings.EDGE_TOKEN
    """

    def has_permission(self, request, view):
        user_auth = TokenAuthentication().authenticate(request)
        if user_auth:
            return True

        expected = getattr(settings, "EDGE_TOKEN", "") or ""
        provided = request.headers.get("X-EDGE-TOKEN") or ""
        if bool(expected) and (provided == expected):
            print("[EDGE] request autorizado via EDGE token")
            return True

        return False
