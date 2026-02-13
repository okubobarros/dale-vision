import hashlib
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import Camera, CameraHealthLog, OrgMember
from apps.edge.models import EdgeToken
from apps.edge.permissions import EdgeOrUserTokenPermission
from .models import CameraHealth
from .serializers import (
    CameraSerializer,
    CameraHealthLogSerializer,
    CameraROIConfigSerializer,
    CameraHealthSerializer,
)
from .services import rtsp_snapshot
from .limits import enforce_trial_camera_limit
from .roi import get_latest_roi_config, create_roi_config
from .permissions import (
    require_store_role,
    filter_cameras_for_user,
    ALLOWED_MANAGE_ROLES,
    ALLOWED_READ_ROLES,
)
from apps.billing.utils import PaywallError
from apps.stores.services.user_uuid import ensure_user_uuid


def _camera_limit_response(exc: PaywallError):
    return Response(
        {
            "ok": False,
            "code": "LIMIT_CAMERAS_REACHED",
            "message": "Limite de câmeras do trial atingido.",
            "meta": exc.detail.get("meta", {}) if isinstance(exc.detail, dict) else {},
        },
        status=status.HTTP_409_CONFLICT,
    )


def _validate_edge_token_for_store(store_id: str, provided: str) -> bool:
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
        return True
    return False

class CameraViewSet(viewsets.ModelViewSet):
    serializer_class = CameraSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        store_id = self.request.query_params.get("store_id")
        qs = Camera.objects.all().order_by("-updated_at")
        if getattr(self.request, "user", None) and self.request.user.is_authenticated:
            qs = filter_cameras_for_user(qs, self.request.user)
        if store_id:
            qs = qs.filter(store_id=store_id)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        store = serializer.validated_data.get("store")
        store_id = getattr(store, "id", None) or serializer.validated_data.get("store_id")
        if store_id:
            require_store_role(request.user, str(store_id), ALLOWED_MANAGE_ROLES)
        try:
            self.perform_create(serializer)
        except PaywallError as exc:
            return _camera_limit_response(exc)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        store = serializer.validated_data.get("store")
        store_id = getattr(store, "id", None) or serializer.validated_data.get("store_id")
        requested_active = serializer.validated_data.get("active", True)
        if store_id:
            try:
                actor_user_id = None
                try:
                    actor_user_id = ensure_user_uuid(self.request.user)
                except Exception:
                    actor_user_id = None
                enforce_trial_camera_limit(
                    store_id,
                    requested_active=requested_active,
                    actor_user_id=actor_user_id,
                )
            except PaywallError as exc:
                raise exc
        now = timezone.now()
        serializer.save(created_at=now, updated_at=now)

    def perform_update(self, serializer):
        require_store_role(self.request.user, str(serializer.instance.store_id), ALLOWED_MANAGE_ROLES)
        serializer.save(updated_at=timezone.now())

    def perform_destroy(self, instance):
        require_store_role(self.request.user, str(instance.store_id), ALLOWED_MANAGE_ROLES)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="test-snapshot")
    def test_snapshot(self, request, pk=None):
        cam = self.get_object()
        require_store_role(request.user, str(cam.store_id), ALLOWED_MANAGE_ROLES)

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

    @action(detail=True, methods=["get", "put"], url_path="roi")
    def roi(self, request, pk=None):
        cam = self.get_object()
        if request.method == "GET":
            require_store_role(request.user, str(cam.store_id), ALLOWED_READ_ROLES)
            latest = get_latest_roi_config(str(cam.id))
            if not latest:
                return Response(
                    {
                        "camera_id": str(cam.id),
                        "version": 0,
                        "config_json": None,
                        "updated_at": None,
                        "updated_by": None,
                    }
                )
            return Response(CameraROIConfigSerializer(latest).data)

        require_store_role(request.user, str(cam.store_id), ALLOWED_MANAGE_ROLES)
        config_json = request.data.get("config_json")
        if not isinstance(config_json, (dict, list)):
            return Response(
                {"detail": "config_json inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_by = None
        try:
            updated_by = ensure_user_uuid(request.user)
        except Exception:
            updated_by = None

        created = create_roi_config(
            camera_id=str(cam.id),
            config_json=config_json,
            updated_by=updated_by,
        )
        return Response(CameraROIConfigSerializer(created).data)

    @action(detail=True, methods=["get"], url_path="roi/latest", permission_classes=[permissions.AllowAny])
    def roi_latest(self, request, pk=None):
        cam = self.get_object()
        if request.user and request.user.is_authenticated:
            require_store_role(request.user, str(cam.store_id), ALLOWED_READ_ROLES)
        else:
            provided = request.headers.get("X-EDGE-TOKEN") or ""
            if not _validate_edge_token_for_store(str(cam.store_id), provided):
                return Response(
                    {"detail": "Edge token inválido para esta loja."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        latest = get_latest_roi_config(str(cam.id))
        if not latest:
            return Response(
                {
                    "camera_id": str(cam.id),
                    "version": 0,
                    "config_json": None,
                    "updated_at": None,
                    "updated_by": None,
                }
            )
        return Response(CameraROIConfigSerializer(latest).data)

    @action(detail=True, methods=["post"], url_path="health", permission_classes=[EdgeOrUserTokenPermission])
    def health(self, request, pk=None):
        cam = self.get_object()
        if request.user and request.user.is_authenticated:
            require_store_role(request.user, str(cam.store_id), ALLOWED_MANAGE_ROLES)

        payload = request.data or {}
        last_seen_at = payload.get("last_seen_at")
        error = payload.get("error")
        defaults = {
            "last_seen_at": last_seen_at or timezone.now(),
            "fps": payload.get("fps"),
            "lag_ms": payload.get("lag_ms"),
            "reconnects": payload.get("reconnects"),
            "error": error,
            "updated_at": timezone.now(),
        }
        health, _created = CameraHealth.objects.update_or_create(
            camera_id=cam.id,
            defaults=defaults,
        )

        if last_seen_at or error is not None:
            cam.last_seen_at = defaults["last_seen_at"]
            cam.last_error = error
            cam.status = "error" if error else "online"
            cam.updated_at = timezone.now()
            cam.save(update_fields=["last_seen_at", "last_error", "status", "updated_at"])

        return Response(CameraHealthSerializer(health).data)

class CameraHealthLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CameraHealthLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        camera_id = self.request.query_params.get("camera_id")
        qs = CameraHealthLog.objects.all().order_by("-checked_at")
        if self.request.user and self.request.user.is_authenticated:
            if not (self.request.user.is_staff or self.request.user.is_superuser):
                user_uuid = ensure_user_uuid(self.request.user)
                org_ids = list(
                    OrgMember.objects.filter(user_id=user_uuid).values_list("org_id", flat=True)
                )
                if not org_ids:
                    return qs.none()
                qs = qs.filter(camera__store__org_id__in=org_ids)
        if camera_id:
            qs = qs.filter(camera_id=camera_id)
        return qs
