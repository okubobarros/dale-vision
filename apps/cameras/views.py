from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import Camera, CameraHealthLog
from .serializers import CameraSerializer, CameraHealthLogSerializer
from .services import rtsp_snapshot

class CameraViewSet(viewsets.ModelViewSet):
    serializer_class = CameraSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        store_id = self.request.query_params.get("store_id")
        qs = Camera.objects.all().order_by("-updated_at")
        if store_id:
            qs = qs.filter(store_id=store_id)
        return qs

    @action(detail=True, methods=["post"], url_path="test-snapshot")
    def test_snapshot(self, request, pk=None):
        cam = self.get_object()

        if not cam.rtsp_url:
            return Response({"detail": "Camera sem rtsp_url"}, status=status.HTTP_400_BAD_REQUEST)

        res = rtsp_snapshot(cam.rtsp_url)

        if res.get("ok"):
            cam.status = "online"
            cam.last_seen_at = timezone.now()
            cam.last_error = None
            # Para demo: você pode salvar last_snapshot_url como caminho local/temporário
            cam.last_snapshot_url = res.get("path")
            cam.save(update_fields=["status","last_seen_at","last_error","last_snapshot_url","updated_at"])

            CameraHealthLog.objects.create(
                camera_id=cam.id,
                checked_at=timezone.now(),
                status="online",
                latency_ms=res.get("latency_ms"),
                snapshot_url=cam.last_snapshot_url,
                error=None,
            )

            return Response({"ok": True, "latency_ms": res.get("latency_ms"), "snapshot_path": res.get("path")})

        cam.status = "error"
        cam.last_error = res.get("error")
        cam.save(update_fields=["status","last_error","updated_at"])

        CameraHealthLog.objects.create(
            camera_id=cam.id,
            checked_at=timezone.now(),
            status="error",
            latency_ms=None,
            snapshot_url=None,
            error=res.get("error"),
        )

        return Response({"ok": False, "error": res.get("error")}, status=status.HTTP_502_BAD_GATEWAY)

class CameraHealthLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CameraHealthLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        camera_id = self.request.query_params.get("camera_id")
        qs = CameraHealthLog.objects.all().order_by("-checked_at")
        if camera_id:
            qs = qs.filter(camera_id=camera_id)
        return qs
