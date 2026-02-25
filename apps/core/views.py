import requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from apps.core.integrations import supabase_storage
from apps.core import models
from .serializers import DemoLeadSerializer

class DemoLeadViewSet(viewsets.ModelViewSet):
    queryset = models.DemoLead.objects.all().order_by("-created_at")
    serializer_class = DemoLeadSerializer
    permission_classes = [AllowAny]  # lead público

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()

        # dispara n8n (não bloqueia o MVP: se falhar, lead fica salvo)
        webhook = getattr(settings, "N8N_ALERTS_WEBHOOK", None)
        if webhook:
            try:
                requests.post(
                    webhook,
                    timeout=8,
                    json={
                        "type": "demo_lead",
                        "lead_id": str(lead.id),
                        "name": getattr(lead, "name", None),
                        "email": getattr(lead, "email", None),
                        "whatsapp": getattr(lead, "whatsapp", None),
                        "best_time": getattr(lead, "best_time", None),
                        "segment": getattr(lead, "segment", None),
                        "stores_count": getattr(lead, "stores_count", None),
                        "notes": getattr(lead, "notes", None),
                    },
                )
            except Exception:
                pass

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StorageStatusView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        if not (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)):
            raise PermissionDenied("Sem permissão.")
        status_payload = supabase_storage.get_config_status()
        return Response(status_payload, status=status.HTTP_200_OK)
