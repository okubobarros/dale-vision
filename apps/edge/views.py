# apps/edge/views.py
from uuid import UUID
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from django.db import connection
import logging
import os

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.permissions import AllowAny
from knox.auth import TokenAuthentication

from .serializers import EdgeEventSerializer
from .models import EdgeEventReceipt

from apps.alerts.views import AlertRuleViewSet
from apps.core.models import Camera, CameraHealthLog
from apps.core.models import Store
from apps.stores.views import ensure_user_uuid, get_user_org_ids


def _is_uuid(x: str) -> bool:
    try:
        UUID(str(x))
        return True
    except Exception:
        return False

logger = logging.getLogger(__name__)

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
    permission_classes = [AllowAny]

    def _get_service_user(self):
        """
        Usuário interno que será usado para chamar o ingest do Alerts.
        """
        username = getattr(settings, "EDGE_SERVICE_USERNAME", "edge-agent")
        User = get_user_model()
        u = User.objects.filter(username=username).first()
        return u

    def _is_edge_request(self, request):
        expected = getattr(settings, "EDGE_SHARED_TOKEN", None) or os.getenv("EDGE_SHARED_TOKEN")
        if not expected:
            print("[EDGE] EDGE_SHARED_TOKEN não configurado")
            return (False, "EDGE_SHARED_TOKEN não configurado")
        provided = request.headers.get("X-EDGE-TOKEN") or ""
        if not provided:
            print("[EDGE] missing X-EDGE-TOKEN")
            return (False, "missing X-EDGE-TOKEN")
        if provided != expected:
            print("[EDGE] invalid edge token")
            return (False, "invalid edge token")
        print("[EDGE] request autorizado via EDGE token")
        return (True, None)

    def _user_has_store_access(self, user, store_id: str) -> bool:
        org_ids = get_user_org_ids(user)
        return Store.objects.filter(id=store_id, org_id__in=org_ids).exists()

    def post(self, request):
        ser = EdgeEventSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"detail": "payload inválido", "errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        validated = ser.validated_data
        payload = request.data  # salva raw json

        event_name = validated.get("event_name")
        source = validated.get("source") or "edge"
        receipt_id = validated.get("receipt_id") or ""
        data = validated.get("data") or {}
        store_id = (
            data.get("store_id")
            or payload.get("store_id")
            or (payload.get("agent") or {}).get("store_id")
        )
        event_type = payload.get("event_type") or data.get("event_type") or event_name
        normalized = (event_type or "").replace(".", "_").lower()

        if not event_name:
            return Response({"detail": "event_name ausente."}, status=status.HTTP_400_BAD_REQUEST)
        if not store_id or not _is_uuid(store_id):
            return Response({"detail": "store_id inválido ou ausente."}, status=status.HTTP_400_BAD_REQUEST)

        user_auth = TokenAuthentication().authenticate(request)
        if user_auth:
            user, _ = user_auth
            try:
                ensure_user_uuid(user)
                if not self._user_has_store_access(user, store_id):
                    print("[EDGE] user has no access to store")
                    return Response({"detail": "Usuário sem acesso à store."}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({"detail": "Usuário não autenticado."}, status=status.HTTP_403_FORBIDDEN)
        else:
            ok, err = self._is_edge_request(request)
            if not ok:
                if err == "EDGE_SHARED_TOKEN não configurado":
                    return Response({"detail": err}, status=status.HTTP_403_FORBIDDEN)
                return Response({"detail": "Edge token inválido."}, status=status.HTTP_403_FORBIDDEN)

        # --- dedupe por receipt_id ---
        stored = False
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
            stored = True

        # --- persistir heartbeat do edge ---
        if normalized in ("edge_heartbeat", "camera_heartbeat", "edge_camera_heartbeat"):
            try:
                ts = data.get("ts") or payload.get("ts")
                if ts:
                    try:
                        ts_dt = timezone.datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    except Exception:
                        ts_dt = timezone.now()
                else:
                    ts_dt = timezone.now()

                cameras_in = (
                    payload.get("cameras")
                    or data.get("cameras")
                    or payload.get("camera_heartbeats")
                    or []
                )
                if not cameras_in and (data.get("camera_id") or data.get("external_id") or data.get("name")):
                    cameras_in = [data]

                try:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            """
                            UPDATE public.stores
                            SET last_seen_at = %s,
                                last_error = NULL,
                                updated_at = now()
                            WHERE id = %s
                            """,
                            [ts_dt, store_id],
                        )
                except Exception:
                    logger.exception("[WARN] store last_seen_at update failed")

                for cam in cameras_in:
                    if not isinstance(cam, dict):
                        continue
                    external_id = cam.get("external_id") or cam.get("camera_id")
                    name = cam.get("name") or external_id or "camera"
                    rtsp_url = cam.get("rtsp_url")

                    camera_obj = None
                    if external_id:
                        camera_obj = Camera.objects.filter(store_id=store_id, external_id=external_id).first()
                    if camera_obj is None:
                        camera_obj = Camera.objects.filter(store_id=store_id, name=name).first()

                    if camera_obj is None:
                        camera_obj = Camera.objects.create(
                            store_id=store_id,
                            external_id=external_id,
                            name=name,
                            rtsp_url=rtsp_url,
                            status="online",
                            last_seen_at=ts_dt,
                            last_error=None,
                            created_at=timezone.now(),
                            updated_at=timezone.now(),
                        )
                    else:
                        Camera.objects.filter(id=camera_obj.id).update(
                            external_id=external_id or camera_obj.external_id,
                            name=name or camera_obj.name,
                            rtsp_url=rtsp_url or camera_obj.rtsp_url,
                            status="online",
                            last_seen_at=ts_dt,
                            last_error=None,
                            updated_at=timezone.now(),
                        )

                    CameraHealthLog.objects.create(
                        camera_id=camera_obj.id,
                        checked_at=ts_dt,
                        status="online",
                        error=None,
                    )

            except Exception:
                logger.exception("[WARN] heartbeat persist failed")

            return Response(
                {"ok": True, "receipt_id": receipt_id or None, "stored": stored},
                status=status.HTTP_201_CREATED if stored else status.HTTP_200_OK,
            )

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
            response = ingest_view(drf_req)
            if stored:
                response.status_code = status.HTTP_201_CREATED
            return response

        # por enquanto: heartbeat/bucket aceita e responde ok
        return Response(
            {"ok": True, "receipt_id": receipt_id or None, "stored": stored},
            status=status.HTTP_201_CREATED if stored else status.HTTP_200_OK,
        )
