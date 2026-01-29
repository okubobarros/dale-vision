# apps/edge/permissions.py
import os
from rest_framework.permissions import BasePermission


class EdgeTokenPermission(BasePermission):
    """
    Valida header X-EDGE-TOKEN contra EDGE_AGENT_TOKEN do .env/settings.
    """

    def has_permission(self, request, view):
        expected = os.getenv("EDGE_AGENT_TOKEN") or ""
        provided = request.headers.get("X-EDGE-TOKEN") or ""
        return bool(expected) and (provided == expected)
