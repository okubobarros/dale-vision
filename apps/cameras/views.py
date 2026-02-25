import hashlib
import logging
from uuid import uuid4
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser

from django.db.models import Q
from apps.core.models import AuditLog, Camera, CameraHealthLog, OrgMember, Store, StoreManager
from apps.edge.models import EdgeToken
from .serializers import (
    CameraSerializer,
    CameraHealthLogSerializer,
    CameraROIConfigSerializer,
)
from .models import CameraSnapshot
from apps.core.integrations import supabase_storage
from .services import rtsp_snapshot
from .limits import enforce_trial_camera_limit
from .roi import get_latest_roi_config, get_latest_published_roi_config, create_roi_config
from .permissions import (
    require_store_role,
    filter_cameras_for_user,
    ALLOWED_MANAGE_ROLES,
    ALLOWED_READ_ROLES,
)
from apps.billing.utils import PaywallError
from backend.utils.entitlements import enforce_can_use_product, require_trial_active, TrialExpiredError
from apps.stores.services.user_uuid import ensure_user_uuid
from apps.core.services.onboarding_progress import OnboardingProgressService

logger = logging.getLogger(__name__)


def _error_response(code: str, message: str, status_code: int, *, details=None, deprecated_detail=None):
    payload = {
        "code": code,
        "message": message,
    }
    if details is not None:
        payload["details"] = details
    if deprecated_detail:
        payload["detail"] = deprecated_detail
    return Response(payload, status=status_code)

def _mask_rtsp(value: str) -> str:
    if not value:
        return ""
    if "://" in value:
        scheme, _rest = value.split("://", 1)
        return f"{scheme}://***"
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}***{value[-3:]}"


def _sanitize_camera_payload(payload):
    if not isinstance(payload, dict):
        return {}
    data = dict(payload)
    if "password" in data:
        data["password"] = "***"
    if "rtsp_url" in data and isinstance(data["rtsp_url"], str):
        data["rtsp_url"] = _mask_rtsp(data["rtsp_url"])
    return data


def _camera_limit_response(exc: PaywallError):
    details = exc.detail.get("meta", {}) if isinstance(exc.detail, dict) else {}
    return _error_response(
        "LIMIT_CAMERAS_REACHED",
        "Limite de câmeras do trial atingido.",
        status.HTTP_409_CONFLICT,
        details=details,
        deprecated_detail="Limite de câmeras do trial atingido.",
    )


def _paywall_trial_response(message: str, *, details=None):
    return _error_response(
        "PAYWALL_TRIAL_LIMIT",
        message,
        status.HTTP_402_PAYMENT_REQUIRED,
        details=details,
        deprecated_detail=message,
    )


def _log_staff_action(request, *, action: str, org_id=None, store_id=None, payload=None):
    user = getattr(request, "user", None)
    if not user or not (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)):
        return
    actor_user_id = None
    try:
        actor_user_id = ensure_user_uuid(user)
    except Exception:
        actor_user_id = None
    safe_payload = dict(payload or {})
    safe_payload.setdefault(
        "changed_by_staff_user_id", str(actor_user_id) if actor_user_id else None
    )
    try:
        AuditLog.objects.create(
            org_id=org_id,
            store_id=store_id,
            actor_user_id=actor_user_id,
            action=action,
            payload=safe_payload,
            created_at=timezone.now(),
        )
    except Exception:
        logger.exception("[AUDIT] failed to log staff action=%s", action)


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


def _build_snapshot_path(org_id: str, store_id: str, camera_id: str, ext: str) -> str:
    now = timezone.now()
    ts = now.strftime("%Y%m%dT%H%M%S%f")
    return (
        f"stores/{store_id}/cameras/{camera_id}/snapshots/"
        f"{now:%Y}/{now:%m}/{now:%d}/{ts}.{ext}"
    )


def _guess_ext(content_type: str, filename: str) -> str:
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    if content_type == "image/png":
        return "png"
    if content_type == "image/webp":
        return "webp"
    return "jpg"


class CameraViewSet(viewsets.ModelViewSet):
    serializer_class = CameraSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _resolve_store_for_create(self):
        store_id = self.kwargs.get("store_id") or self.kwargs.get("store_pk")
        if not store_id:
            store_id = self.request.data.get("store_id") or self.request.data.get("store")
        if not store_id:
            return None, None
        store = Store.objects.filter(id=store_id).first()
        return store_id, store

    def _require_subscription_for_org_ids(self, org_ids, action: str):
        if getattr(self.request.user, "is_superuser", False) or getattr(
            self.request.user, "is_staff", False
        ):
            return
        if not org_ids:
            return
        actor_user_id = None
        try:
            actor_user_id = ensure_user_uuid(self.request.user)
        except Exception:
            actor_user_id = None
        for org_id in {str(o) for o in org_ids if o}:
            require_trial_active(
                org_id=org_id,
                actor_user_id=actor_user_id,
                action=action,
                endpoint=self.request.path,
            )

    def get_queryset(self):
        store_id = self.request.query_params.get("store_id")
        qs = Camera.objects.all().order_by("-updated_at")
        if getattr(self.request, "user", None) and self.request.user.is_authenticated:
            qs = filter_cameras_for_user(qs, self.request.user)
        if store_id:
            qs = qs.filter(store_id=store_id)
        return qs

    def list(self, request, *args, **kwargs):
        store_id = request.query_params.get("store_id")
        if store_id:
            try:
                require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)
            except (PermissionDenied, DjangoPermissionDenied) as exc:
                return _error_response(
                    "PERMISSION_DENIED",
                    str(exc) or "Sem permissão.",
                    status.HTTP_403_FORBIDDEN,
                    deprecated_detail=str(exc) or "Sem permissão.",
                )
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        cam = self.get_object()
        try:
            require_store_role(request.user, str(cam.store_id), ALLOWED_READ_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        store_id, store = self._resolve_store_for_create()
        if store_id and not store:
            logger.warning(
                "[CAMERA] create failed store not found store_id=%s user_id=%s payload=%s",
                store_id,
                getattr(request.user, "id", None),
                _sanitize_camera_payload(request.data),
            )
            return _error_response(
                "STORE_NOT_FOUND",
                "Store not found.",
                status.HTTP_404_NOT_FOUND,
                deprecated_detail="Store not found",
            )
        if not store:
            logger.warning(
                "[CAMERA] create failed missing store_id user_id=%s payload=%s",
                getattr(request.user, "id", None),
                _sanitize_camera_payload(request.data),
            )
            return _error_response(
                "CAMERA_VALIDATION_ERROR",
                "store_id é obrigatório.",
                status.HTTP_400_BAD_REQUEST,
                details={"store_id": ["This field is required."]},
                deprecated_detail="This field is required.",
            )
        try:
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        actor_user_id = None
        try:
            actor_user_id = ensure_user_uuid(request.user)
        except Exception:
            actor_user_id = None
        try:
            enforce_can_use_product(
                org_id=getattr(store, "org_id", None),
                actor_user_id=actor_user_id,
                action="create_camera",
                endpoint=request.path,
                user=request.user,
            )
        except TrialExpiredError as exc:
            details = getattr(exc, "detail", None)
            message = None
            if isinstance(details, dict):
                message = details.get("message")
            return _paywall_trial_response(
                message or "Trial expirado. Assinatura necessária.",
                details=details,
            )
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            logger.warning(
                "[CAMERA] create validation error store_id=%s org_id=%s user_id=%s errors=%s payload=%s",
                str(store.id),
                str(getattr(store, "org_id", None)),
                getattr(request.user, "id", None),
                exc.detail,
                _sanitize_camera_payload(request.data),
            )
            return _error_response(
                "CAMERA_VALIDATION_ERROR",
                "Dados inválidos para câmera.",
                status.HTTP_400_BAD_REQUEST,
                details=exc.detail,
                deprecated_detail="Dados inválidos para câmera.",
            )
        try:
            self.perform_create(serializer, store=store)
        except PaywallError as exc:
            return _camera_limit_response(exc)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer, store=None):
        store_id = getattr(store, "id", None)
        requested_active = serializer.validated_data.get("active", True)
        if store_id:
            try:
                actor_user_id = None
                try:
                    actor_user_id = ensure_user_uuid(self.request.user)
                except Exception:
                    actor_user_id = None
                enforce_trial_camera_limit(
                    str(store_id),
                    requested_active=requested_active,
                    actor_user_id=actor_user_id,
                    user=self.request.user,
                )
            except PaywallError as exc:
                raise exc
        now = timezone.now()
        instance = serializer.save(store=store, created_at=now, updated_at=now)
        _log_staff_action(
            self.request,
            action="staff_camera_create",
            org_id=getattr(store, "org_id", None),
            store_id=str(store_id) if store_id else None,
            payload={
                "camera_id": str(getattr(instance, "id", "")),
                "requested_active": requested_active,
                "path": self.request.path,
            },
        )

    def perform_update(self, serializer):
        require_store_role(self.request.user, str(serializer.instance.store_id), ALLOWED_MANAGE_ROLES)
        instance = serializer.save(updated_at=timezone.now())
        _log_staff_action(
            self.request,
            action="staff_camera_update",
            org_id=str(getattr(instance.store, "org_id", None)) if getattr(instance, "store", None) else None,
            store_id=str(getattr(instance, "store_id", None)) if getattr(instance, "store_id", None) else None,
            payload={
                "camera_id": str(getattr(instance, "id", "")),
                "path": self.request.path,
            },
        )

    def perform_destroy(self, instance):
        require_store_role(self.request.user, str(instance.store_id), ALLOWED_MANAGE_ROLES)
        _log_staff_action(
            self.request,
            action="staff_camera_delete",
            org_id=str(getattr(instance.store, "org_id", None)) if getattr(instance, "store", None) else None,
            store_id=str(getattr(instance, "store_id", None)) if getattr(instance, "store_id", None) else None,
            payload={
                "camera_id": str(getattr(instance, "id", "")),
                "path": self.request.path,
            },
        )
        instance.delete()

    @action(detail=True, methods=["post"], url_path="test-snapshot")
    def test_snapshot(self, request, pk=None):
        cam = self.get_object()
        try:
            require_store_role(request.user, str(cam.store_id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )

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
        try:
            cam = self.get_object()
        except Exception as exc:
            logger.exception("[CAMERA] roi get_object failed camera_id=%s error=%s", str(pk), exc)
            return _error_response(
                "CAMERA_NOT_FOUND",
                "Câmera não encontrada.",
                status.HTTP_404_NOT_FOUND,
                deprecated_detail="Câmera não encontrada.",
            )
        if request.method == "GET":
            try:
                require_store_role(request.user, str(cam.store_id), ALLOWED_READ_ROLES)
            except (PermissionDenied, DjangoPermissionDenied) as exc:
                return _error_response(
                    "PERMISSION_DENIED",
                    str(exc) or "Sem permissão.",
                    status.HTTP_403_FORBIDDEN,
                    deprecated_detail=str(exc) or "Sem permissão.",
                )
            try:
                latest = get_latest_roi_config(str(cam.id))
            except Exception as exc:
                logger.exception(
                    "[CAMERA] roi fetch failed camera_id=%s store_id=%s error=%s",
                    str(cam.id),
                    str(cam.store_id),
                    exc,
                )
                return _error_response(
                    "ROI_UNAVAILABLE",
                    "ROI indisponível no momento.",
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    deprecated_detail="ROI indisponível no momento.",
                )
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

        try:
            require_store_role(request.user, str(cam.store_id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        config_json = request.data.get("config_json")
        if isinstance(config_json, list):
            config_json = {"zones": config_json}
        if not isinstance(config_json, dict):
            return Response(
                {"detail": "config_json inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        status_value = str(config_json.get("status") or "draft")
        if status_value not in ("draft", "published"):
            return Response({"detail": "status inválido."}, status=status.HTTP_400_BAD_REQUEST)

        zones = config_json.get("zones")
        if status_value == "published" and (not zones or len(zones) == 0):
            return Response(
                {"detail": "Para publicar, inclua ao menos uma zona."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        published = get_latest_published_roi_config(str(cam.id))
        last_published_version = 0
        if published and isinstance(published.config_json, dict):
            last_published_version = int(published.config_json.get("roi_version") or 0)

        if status_value == "published":
            config_json["roi_version"] = last_published_version + 1
        else:
            config_json.setdefault("roi_version", last_published_version)

        updated_by = None
        try:
            updated_by = ensure_user_uuid(request.user)
        except Exception:
            updated_by = None
        config_json.setdefault("metrics_enabled", False)
        config_json.setdefault("image", config_json.get("image") or {})
        meta = config_json.get("meta")
        if not isinstance(meta, dict):
            meta = {}
        is_staff_user = bool(getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False))
        if is_staff_user:
            meta.setdefault("created_by_staff", True)
            meta.setdefault("created_by_user_id", str(updated_by) if updated_by else None)
            meta.setdefault("created_at", timezone.now().isoformat())
            if status_value == "published":
                meta.setdefault("note", "ROI publicado pela equipe DaleVision")
        config_json["meta"] = meta

        try:
            created = create_roi_config(
                camera_id=str(cam.id),
                config_json=config_json,
                updated_by=updated_by,
            )
        except Exception as exc:
            logger.exception(
                "[CAMERA] roi create failed camera_id=%s store_id=%s error=%s",
                str(cam.id),
                str(cam.store_id),
                exc,
            )
            return _error_response(
                "ROI_SAVE_FAILED",
                "Não foi possível salvar a configuração do ROI.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                deprecated_detail="Não foi possível salvar a configuração do ROI.",
            )
        _log_staff_action(
            request,
            action="staff_camera_roi_update",
            org_id=str(getattr(cam.store, "org_id", None)) if getattr(cam, "store", None) else None,
            store_id=str(getattr(cam, "store_id", None)) if getattr(cam, "store_id", None) else None,
            payload={
                "camera_id": str(cam.id),
                "roi_status": status_value,
                "roi_version": config_json.get("roi_version"),
                "path": request.path,
            },
        )
        if status_value == "published":
            try:
                OnboardingProgressService(str(cam.store.org_id)).complete_step(
                    "roi_published",
                    meta={
                        "store_id": str(cam.store_id),
                        "camera_id": str(cam.id),
                        "roi_version": config_json.get("roi_version"),
                    },
                )
            except Exception:
                pass
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

        latest = get_latest_published_roi_config(str(cam.id))
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

    @action(detail=True, methods=["post"], url_path="health", permission_classes=[permissions.AllowAny])
    def health(self, request, pk=None):
        cam = self.get_object()
        if request.user and request.user.is_authenticated:
            require_store_role(request.user, str(cam.store_id), ALLOWED_MANAGE_ROLES)
        else:
            provided = request.headers.get("X-EDGE-TOKEN") or ""
            if not _validate_edge_token_for_store(str(cam.store_id), provided):
                return Response(
                    {"detail": "Edge token inválido para esta loja."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        payload = request.data or {}
        status_value = payload.get("status")
        if status_value not in ("online", "degraded", "offline", "unknown", "error"):
            return Response(
                {"detail": "status inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        latency_ms = payload.get("latency_ms")
        error = payload.get("error")
        snapshot_url = payload.get("snapshot_url")
        ts_value = payload.get("ts")
        checked_at = None
        if ts_value:
            if isinstance(ts_value, str):
                checked_at = parse_datetime(ts_value)
            else:
                checked_at = None
        if checked_at is None:
            checked_at = timezone.now()
        elif timezone.is_naive(checked_at):
            checked_at = timezone.make_aware(checked_at)

        CameraHealthLog.objects.create(
            camera_id=cam.id,
            checked_at=checked_at,
            status=status_value,
            latency_ms=latency_ms,
            snapshot_url=snapshot_url,
            error=error,
        )

        cam.last_seen_at = checked_at
        cam.last_error = error
        if snapshot_url:
            cam.last_snapshot_url = snapshot_url
        cam.status = status_value
        cam.updated_at = timezone.now()
        update_fields = ["last_seen_at", "last_error", "status", "updated_at"]
        if snapshot_url:
            update_fields.append("last_snapshot_url")
        cam.save(update_fields=update_fields)

        if status_value in ("online", "degraded"):
            try:
                OnboardingProgressService(str(cam.store.org_id)).complete_step(
                    "camera_health_ok",
                    meta={
                        "store_id": str(cam.store_id),
                        "camera_id": str(cam.id),
                        "status": status_value,
                        "latency_ms": latency_ms,
                    },
                )
            except Exception:
                pass

        return Response(
            {
                "camera_id": str(cam.id),
                "status": status_value,
                "latency_ms": latency_ms,
                "last_seen_at": cam.last_seen_at.isoformat() if cam.last_seen_at else None,
                "last_error": cam.last_error,
            }
        )

    @action(detail=True, methods=["post"], url_path="test-connection")
    def test_connection(self, request, pk=None):
        try:
            cam = self.get_object()
            require_store_role(request.user, str(cam.store_id), ALLOWED_MANAGE_ROLES)
            return Response(
                {
                    "ok": True,
                    "camera_id": str(cam.id),
                    "store_id": str(cam.store_id),
                    "queued": True,
                },
                status=status.HTTP_202_ACCEPTED,
            )
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        except Exception as exc:
            logger.exception("[CAMERA] test-connection failed camera_id=%s error=%s", str(pk), exc)
            return _error_response(
                "CAMERA_TEST_FAILED",
                "Não foi possível testar a conexão da câmera.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                deprecated_detail="Não foi possível testar a conexão da câmera.",
            )

    @action(
        detail=True,
        methods=["post"],
        url_path="snapshot/upload",
        parser_classes=[MultiPartParser, FormParser],
    )
    def snapshot_upload(self, request, pk=None):
        cam = self.get_object()
        if not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
            try:
                require_store_role(request.user, str(cam.store_id), ALLOWED_MANAGE_ROLES)
            except (PermissionDenied, DjangoPermissionDenied) as exc:
                return _error_response(
                    "PERMISSION_DENIED",
                    str(exc) or "Sem permissão.",
                    status.HTTP_403_FORBIDDEN,
                    deprecated_detail=str(exc) or "Sem permissão.",
                )

        file = request.FILES.get("file") or request.FILES.get("snapshot")
        if not file:
            return _error_response(
                "SNAPSHOT_MISSING",
                "Envie o arquivo em 'file'.",
                status.HTTP_400_BAD_REQUEST,
                deprecated_detail="Envie o arquivo em 'file'.",
            )

        if not supabase_storage.get_config():
            logger.warning(
                "[SNAPSHOT] storage_not_configured camera_id=%s store_id=%s flags=%s",
                str(cam.id),
                str(cam.store_id),
                supabase_storage.get_config_status(),
            )
            return _error_response(
                "STORAGE_NOT_CONFIGURED",
                "Storage não configurado.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
                deprecated_detail="Storage não configurado.",
            )

        org_id = getattr(cam.store, "org_id", None)
        if not org_id:
            return _error_response(
                "ORG_NOT_FOUND",
                "Org não encontrada para esta câmera.",
                status.HTTP_400_BAD_REQUEST,
                deprecated_detail="Org não encontrada para esta câmera.",
            )

        content_type = getattr(file, "content_type", None) or "image/jpeg"
        if content_type not in ("image/jpeg", "image/png"):
            return _error_response(
                "SNAPSHOT_INVALID_TYPE",
                "Envie uma imagem JPEG ou PNG.",
                status.HTTP_400_BAD_REQUEST,
                deprecated_detail="Envie uma imagem JPEG ou PNG.",
            )
        ext = _guess_ext(content_type, getattr(file, "name", ""))
        storage_key = _build_snapshot_path(str(org_id), str(cam.store_id), str(cam.id), ext)

        try:
            supabase_storage.upload_file(file.read(), storage_key, content_type)
        except supabase_storage.StorageUploadError as exc:
            logger.exception(
                "[SNAPSHOT] upload failed camera_id=%s store_id=%s storage_key=%s error=%s",
                str(cam.id),
                str(cam.store_id),
                storage_key,
                exc,
            )
            return _error_response(
                "SNAPSHOT_UPLOAD_FAILED",
                "Falha ao enviar snapshot.",
                status.HTTP_502_BAD_GATEWAY,
                deprecated_detail="Falha ao enviar snapshot.",
            )
        except supabase_storage.StorageNotConfigured:
            logger.warning(
                "[SNAPSHOT] storage_not_configured camera_id=%s store_id=%s flags=%s",
                str(cam.id),
                str(cam.store_id),
                supabase_storage.get_config_status(),
            )
            return _error_response(
                "STORAGE_NOT_CONFIGURED",
                "Storage não configurado.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
                deprecated_detail="Storage não configurado.",
            )

        try:
            signed_url = supabase_storage.create_signed_url(storage_key, expires_seconds=600)
        except Exception as exc:
            logger.exception(
                "[SNAPSHOT] sign failed camera_id=%s store_id=%s storage_key=%s error=%s",
                str(cam.id),
                str(cam.store_id),
                storage_key,
                exc,
            )
            signed_url = None

        snapshot = CameraSnapshot.objects.create(
            id=uuid4(),
            camera_id=cam.id,
            snapshot_url=signed_url,
            storage_key=storage_key,
            captured_at=timezone.now(),
            metadata={
                "source": "backend",
                "content_type": content_type,
            },
        )

        if signed_url:
            cam.last_snapshot_url = signed_url
            cam.updated_at = timezone.now()
            cam.save(update_fields=["last_snapshot_url", "updated_at"])

        return Response(
            {
                "camera_id": str(cam.id),
                "snapshot_id": str(snapshot.id),
                "storage_key": storage_key,
                "snapshot_url": signed_url,
                "expires_in": 600,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="snapshot")
    def snapshot_url(self, request, pk=None):
        try:
            cam = self.get_object()
            if not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
                require_store_role(request.user, str(cam.store_id), ALLOWED_READ_ROLES)

            if not supabase_storage.get_config():
                logger.warning(
                    "[SNAPSHOT] storage_not_configured camera_id=%s store_id=%s flags=%s",
                    str(cam.id),
                    str(cam.store_id),
                    supabase_storage.get_config_status(),
                )
                return _error_response(
                    "STORAGE_NOT_CONFIGURED",
                    "Storage não configurado.",
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    deprecated_detail="Storage não configurado.",
                )

            snapshot = (
                CameraSnapshot.objects.filter(camera_id=cam.id)
                .order_by("-captured_at", "-created_at")
                .first()
            )
            if snapshot and snapshot.storage_key:
                try:
                    signed_url = supabase_storage.create_signed_url(
                        snapshot.storage_key,
                        expires_seconds=600,
                    )
                except Exception as exc:
                    logger.exception(
                        "[SNAPSHOT] sign failed camera_id=%s store_id=%s storage_key=%s error=%s",
                        str(cam.id),
                        str(cam.store_id),
                        snapshot.storage_key,
                        exc,
                    )
                    return _error_response(
                        "SNAPSHOT_SIGN_FAILED",
                        "Falha ao gerar URL assinada.",
                        status.HTTP_502_BAD_GATEWAY,
                        deprecated_detail="Falha ao gerar URL assinada.",
                    )
                return Response(
                    {
                        "camera_id": str(cam.id),
                        "snapshot_id": str(snapshot.id),
                        "storage_key": snapshot.storage_key,
                        "snapshot_url": signed_url,
                        "expires_in": 600,
                    },
                    status=status.HTTP_200_OK,
                )

            if cam.last_snapshot_url:
                return Response(
                    {
                        "camera_id": str(cam.id),
                        "snapshot_url": cam.last_snapshot_url,
                    },
                    status=status.HTTP_200_OK,
                )

            return _error_response(
                "SNAPSHOT_NOT_FOUND",
                "Snapshot não encontrado.",
                status.HTTP_404_NOT_FOUND,
                deprecated_detail="Snapshot não encontrado.",
            )

        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        except Exception as exc:
            logger.exception(
                "[SNAPSHOT] snapshot_url failed camera_id=%s store_id=%s error=%s",
                str(pk),
                "unknown",
                exc,
            )
            return _error_response(
                "SNAPSHOT_FAILED",
                "Não foi possível carregar o snapshot.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                deprecated_detail="Não foi possível carregar o snapshot.",
            )

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
                store_ids = list(
                    StoreManager.objects.filter(user_id=self.request.user.id)
                    .values_list("store_id", flat=True)
                )
                if not org_ids and not store_ids:
                    return qs.none()
                if org_ids and store_ids:
                    qs = qs.filter(
                        Q(camera__store__org_id__in=org_ids)
                        | Q(camera__store_id__in=store_ids)
                    )
                elif org_ids:
                    qs = qs.filter(camera__store__org_id__in=org_ids)
                else:
                    qs = qs.filter(camera__store_id__in=store_ids)
        if camera_id:
            qs = qs.filter(camera_id=camera_id)
        return qs
