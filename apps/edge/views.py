# apps/edge/views.py
from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from .serializers import EdgeEventSerializer
from .models import EdgeEventReceipt
from .permissions import EdgeTokenPermission

from apps.alerts.views import AlertRuleViewSet

class EdgeEventsIngestView(APIView):
    """
    POST /api/edge/events/
    Recebe envelope do Edge Agent:
      - edge_heartbeat
      - edge_metric_bucket
      - alert
    Faz:
      - valida envelope
      - dedupe por receipt_id (EdgeEventReceipt)
      - encaminha "alert" para AlertRuleViewSet.ingest (internamente)
      - para edge_metric_bucket / heartbeat: só registra receipt e retorna ok
    """
    authentication_classes = []
    permission_classes = [EdgeTokenPermission]

    def _get_service_user(self):
        """
        Usuário interno que será usado para chamar o ingest do Alerts.
        """
        username = getattr(settings, "EDGE_SERVICE_USERNAME", "edge-agent")
        User = get_user_model()
        u = User.objects.filter(username=username).first()
        return u

    def post(self, request):
        ser = EdgeEventSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        validated = ser.validated_data
        payload = request.data  # salva raw json

        event_name = validated.get("event_name")
        source = validated.get("source") or "edge"
        receipt_id = validated.get("receipt_id") or ""
        data = validated.get("data") or {}
        store_id = data.get("store_id")

        # --- dedupe por receipt_id ---
        if receipt_id:
            _, created = EdgeEventReceipt.objects.get_or_create(
                receipt_id=receipt_id,
                defaults={
                    "event_name": event_name,
                    "source": source,
                    "store_id": store_id,
                    "payload": payload,
                },
            )
            if not created:
                return Response({"ok": True, "deduped": True}, status=status.HTTP_200_OK)

        # --- encaminhar ALERT do edge para o ingest do Alerts ---
        if event_name == "alert":
            ingest_payload = {
                "store_id": data.get("store_id"),
                "camera_id": data.get("camera_id"),
                "zone_id": data.get("zone_id"),
                "event_type": data.get("event_type") or data.get("type"),
                "severity": data.get("severity"),
                "title": data.get("title") or "Alerta",
                "description": data.get("description") or data.get("message") or "",
                "metadata": data.get("metadata") or {},
                "occurred_at": data.get("occurred_at"),
                "clip_url": data.get("clip_url"),
                "snapshot_url": data.get("snapshot_url"),
                "destinations": data.get("destinations") or {},
            }

            service_user = self._get_service_user()
            if service_user is None:
                # se não existir user, falha explícita para você corrigir rápido
                return Response(
                    {"detail": "EDGE service user not found. Create user 'edge-agent' or set EDGE_SERVICE_USERNAME."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            factory = APIRequestFactory()
            drf_req = factory.post("/api/alerts/alert-rules/ingest/", ingest_payload, format="json")
            force_authenticate(drf_req, user=service_user)

            ingest_view = AlertRuleViewSet.as_view({"post": "ingest"})
            return ingest_view(drf_req)

        # por enquanto: heartbeat/bucket aceita e responde ok
        return Response({"ok": True}, status=status.HTTP_200_OK)
