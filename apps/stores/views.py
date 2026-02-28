# apps/stores/views.py 
import logging
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import time
from django.core.cache import cache
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.response import Response
from django.http import Http404
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied as DjangoPermissionDenied, ValidationError as DjangoValidationError
from django.db.utils import ProgrammingError, OperationalError
from django.db import connection, DatabaseError
from django.utils import timezone
from django.conf import settings
from django.utils.dateparse import parse_datetime
from apps.core.models import Store, OrgMember, Organization, Camera, Employee, DetectionEvent
from apps.edge.models import EdgeToken
from apps.cameras.limits import (
    enforce_trial_camera_limit,
    count_active_cameras,
    get_camera_limit_for_store,
)
from apps.core.services.onboarding_progress import OnboardingProgressService
from apps.core.services.journey_events import log_journey_event
from apps.cameras.permissions import (
    require_store_role,
    get_user_role_for_store,
    ALLOWED_MANAGE_ROLES,
    ALLOWED_READ_ROLES,
)
from apps.cameras.serializers import CameraSerializer
from apps.billing.utils import (
    PaywallError,
    enforce_trial_store_limit,
    is_trial,
)
from backend.utils.entitlements import enforce_can_use_product, require_trial_active
import hashlib
import secrets
import uuid
from .serializers import StoreSerializer, EmployeeSerializer
from apps.stores.services.user_uuid import ensure_user_uuid
from apps.stores.services.user_orgs import get_user_org_ids

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

def _expire_trial_stores(qs, user=None):
    try:
        if user and (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False)):
            return
        now = timezone.now()
        expired_ids = list(
            qs.filter(
                status="trial",
                trial_ends_at__isnull=False,
                trial_ends_at__lt=now,
            ).values_list("id", flat=True)
        )
        if expired_ids:
            Store.objects.filter(id__in=expired_ids).update(
                status="blocked",
                blocked_reason="trial_expired",
                updated_at=now,
            )
    except Exception:
        logger.exception("[STORE] failed to expire trial stores")


def _apply_staff_trial_bypass(store: Store, data: dict, user) -> dict:
    if not user or not (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)):
        return data
    if data.get("status") == "blocked" and data.get("blocked_reason") == "trial_expired":
        data["status"] = "trial"
        data["blocked_reason"] = None
    return data

def filter_stores_for_user(qs, user):
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return qs
    org_ids = get_user_org_ids(user)
    if not org_ids:
        if settings.DEBUG:
            return qs
        return qs.none()
    return qs.filter(org_id__in=org_ids)

def _require_store_owner_or_admin(user, store):
    require_store_role(user, str(store.id), ALLOWED_MANAGE_ROLES)

def _camera_active_column_exists():
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "cameras")
        return any(col.name == "active" for col in columns)
    except Exception:
        return False

def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except Exception:
        return False

def _hash_edge_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def _validate_edge_token_for_store(store_id: str, provided: str) -> bool:
    if not provided or not store_id:
        return False
    token_hash = _hash_edge_token(provided)
    edge_token = EdgeToken.objects.filter(
        store_id=store_id,
        token_hash=token_hash,
        active=True,
    ).first()
    if edge_token:
        EdgeToken.objects.filter(id=edge_token.id).update(last_used_at=timezone.now())
        return True
    return False

def _get_active_edge_token(store_id):
    return (
        EdgeToken.objects.filter(store_id=store_id, active=True)
        .order_by("-created_at")
        .first()
    )

def _issue_edge_token(store_id):
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_edge_token(raw_token)
    token = EdgeToken.objects.create(
        store_id=store_id,
        token_hash=token_hash,
        token_plaintext=raw_token,
        active=True,
        created_at=timezone.now(),
    )
    return token, raw_token

def _rotate_edge_token(store_id):
    EdgeToken.objects.filter(store_id=store_id, active=True).update(active=False)
    return _issue_edge_token(store_id)

def _edge_token_meta(token_obj):
    if not token_obj:
        return {
            "has_active_token": False,
            "token_created_at": None,
            "token_last_used_at": None,
        }
    return {
        "has_active_token": True,
        "token_created_at": token_obj.created_at.isoformat() if token_obj.created_at else None,
        "token_last_used_at": token_obj.last_used_at.isoformat() if token_obj.last_used_at else None,
    }


def _resolve_cloud_base_url(request=None) -> str:
    configured = (
        (getattr(settings, "CLOUD_BASE_URL", None) or os.getenv("CLOUD_BASE_URL") or "")
        .strip()
        .rstrip("/")
    )
    if configured:
        return configured
    if request is not None:
        try:
            return request.build_absolute_uri("/").rstrip("/")
        except Exception:
            pass
    return ""


def _parse_dt(value: str | None, tz) -> datetime | None:
    if not value:
        return None
    dt = parse_datetime(value)
    if not dt:
        try:
            dt = datetime.fromisoformat(value)
        except Exception:
            return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, tz)
    return dt


def _get_org_timezone(store: Store):
    tz_name = None
    try:
        org = Organization.objects.filter(id=store.org_id).values("timezone").first()
        tz_name = org.get("timezone") if org else None
    except Exception:
        tz_name = None
    tz_name = tz_name or settings.TIME_ZONE
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return timezone.get_current_timezone()

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]

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
                user=self.request.user,
            )

    def _require_subscription_for_store(self, store: Store, action: str):
        self._require_subscription_for_org_ids([getattr(store, "org_id", None)], action)
    
    def get_queryset(self):
        qs = Store.objects.all().order_by("-updated_at")
        qs = filter_stores_for_user(qs, self.request.user)
        org_id = self.request.query_params.get("org_id")
        if org_id:
            qs = qs.filter(org_id=org_id)
        _expire_trial_stores(qs, self.request.user)
        return qs
    
    def list(self, request):
        """Sobrescreve list para retornar formato personalizado - MANTENHA ESTE!"""
        view = request.query_params.get("view")
        stores = self.get_queryset()

        if view in ("min", "summary"):
            start_ts = time.monotonic()
            try:
                user = request.user if request.user and request.user.is_authenticated else None
                user_key = "anon"
                if user:
                    user_key = str(getattr(user, "id", "unknown"))
                org_ids = get_user_org_ids(user) if user else []
                org_key = ",".join(sorted({str(o) for o in org_ids if o}))[:200]
                cache_key = f"stores:list:{view}:u={user_key}:orgs={org_key}"
                cached = cache.get(cache_key)
                if cached:
                    return Response(cached)
            except Exception:
                cache_key = None

            if view == "min":
                rows = list(
                    stores.values("id", "name", "created_at", "status")
                )
                data = [
                    {
                        "id": str(row["id"]),
                        "name": row.get("name"),
                        "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
                        "is_active": row.get("status") in ("active", "trial"),
                    }
                    for row in rows
                ]
                payload = {
                    "status": "success",
                    "count": len(data),
                    "data": data,
                    "timestamp": timezone.now().isoformat(),
                }
            else:
                rows = list(
                    stores.values("id", "name", "status", "blocked_reason", "trial_ends_at", "org_id")
                )
                role_map = {}
                if request.user and request.user.is_authenticated:
                    if request.user.is_staff or request.user.is_superuser:
                        role_map = {str(row.get("org_id")): "owner" for row in rows}
                    else:
                        try:
                            user_uuid = ensure_user_uuid(request.user)
                            org_ids = {row.get("org_id") for row in rows if row.get("org_id")}
                            members = OrgMember.objects.filter(
                                org_id__in=list(org_ids),
                                user_id=user_uuid,
                            ).values("org_id", "role")
                            role_map = {str(m["org_id"]): m["role"] for m in members}
                        except Exception:
                            role_map = {}

                data = []
                for row in rows:
                    status_value = row.get("status")
                    blocked_reason = row.get("blocked_reason")
                    if request.user and (request.user.is_staff or request.user.is_superuser):
                        if status_value == "blocked" and blocked_reason == "trial_expired":
                            status_value = "trial"
                            blocked_reason = None
                    data.append({
                        "id": str(row["id"]),
                        "name": row.get("name"),
                        "status": status_value,
                        "blocked_reason": blocked_reason,
                        "trial_ends_at": row.get("trial_ends_at").isoformat() if row.get("trial_ends_at") else None,
                        "plan": "trial" if status_value == "trial" else None,
                        "role": role_map.get(str(row.get("org_id"))),
                    })

                payload = {
                    "status": "success",
                    "count": len(data),
                    "data": data,
                    "timestamp": timezone.now().isoformat(),
                }

            duration_ms = int((time.monotonic() - start_ts) * 1000)
            try:
                log_key = f"stores:list:log:{view}"
                if cache.add(log_key, True, timeout=30):
                    logger.info(
                        "[STORE] list view=%s duration_ms=%s count=%s",
                        view,
                        duration_ms,
                        len(payload.get("data", [])),
                    )
            except Exception:
                pass

            if cache_key:
                try:
                    cache.set(cache_key, payload, timeout=30)
                except Exception:
                    pass
            return Response(payload)

        serializer = self.get_serializer(stores, many=True)
        data = list(serializer.data)
        if request.user and request.user.is_authenticated:
            for idx, store in enumerate(stores):
                if idx >= len(data):
                    break
                role = "owner" if (request.user.is_staff or request.user.is_superuser) else get_user_role_for_store(request.user, str(store.id))
                if role:
                    data[idx]["role"] = role
                data[idx] = _apply_staff_trial_bypass(store, data[idx], request.user)
        return Response({
            'status': 'success',
            'count': stores.count(),
            'data': data,
            'timestamp': timezone.now().isoformat()
        })

    def destroy(self, request, *args, **kwargs):
        store = self.get_object()
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
        enforce_can_use_product(
            org_id=store.org_id,
            actor_user_id=actor_user_id,
            action="delete_store",
            endpoint=request.path,
            user=request.user,
        )
        return super().destroy(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        store = self.get_object()
        try:
            require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        serializer = self.get_serializer(store)
        data = _apply_staff_trial_bypass(store, dict(serializer.data), request.user)
        return Response(data)

    def update(self, request, *args, **kwargs):
        store = self.get_object()
        try:
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        store = self.get_object()
        try:
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def edge_token(self, request, pk=None):
        """
        Retorna um token do edge para a store (não rotaciona se já existir).
        """
        store = self.get_object()
        _require_store_owner_or_admin(request.user, store)
        actor_user_id = None
        try:
            actor_user_id = ensure_user_uuid(request.user)
        except Exception:
            actor_user_id = None
        enforce_can_use_product(
            org_id=store.org_id,
            actor_user_id=actor_user_id,
            action="edge_token",
            endpoint=request.path,
            user=request.user,
        )
        edge_token = _get_active_edge_token(store.id)
        raw_token = edge_token.token_plaintext if edge_token else None
        if not edge_token:
            edge_token, raw_token = _issue_edge_token(store.id)
        return Response({
            "store_id": str(store.id),
            "token": raw_token,
            **_edge_token_meta(edge_token),
        })

    @action(detail=True, methods=["get"], url_path="edge-credentials")
    def edge_credentials(self, request, pk=None):
        """
        Retorna credenciais do edge (não rotaciona se já existir).
        Apenas owner/admin/manager da store pode acessar.
        """
        store = self.get_object()
        _require_store_owner_or_admin(request.user, store)
        actor_user_id = None
        try:
            actor_user_id = ensure_user_uuid(request.user)
        except Exception:
            actor_user_id = None
        enforce_can_use_product(
            org_id=store.org_id,
            actor_user_id=actor_user_id,
            action="edge_credentials",
            endpoint=request.path,
            user=request.user,
        )

        edge_token = _get_active_edge_token(store.id)
        raw_token = edge_token.token_plaintext if edge_token else None
        if not edge_token:
            edge_token, raw_token = _issue_edge_token(store.id)

        return Response(
            {
                "store_id": str(store.id),
                "edge_token": raw_token,
                "agent_id_default": "edge-001",
                "cloud_base_url": _resolve_cloud_base_url(request),
                **_edge_token_meta(edge_token),
            }
        )

    @action(detail=True, methods=["get"], url_path="edge-setup")
    def edge_setup(self, request, pk=None):
        """
        Retorna credenciais do edge para setup (idempotente; não rotaciona se já existir).
        Apenas owner/admin/manager da store pode acessar.
        """
        try:
            store = self.get_object()
        except Http404:
            return _error_response(
                "STORE_NOT_FOUND",
                "Store not found.",
                status.HTTP_404_NOT_FOUND,
                details={"store_id": str(pk)},
                deprecated_detail="Store not found",
            )
        except Exception as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_SETUP] failed to resolve store store_id=%s error=%s", str(pk), exc)
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado no servidor. Tente novamente.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Erro inesperado no servidor.",
            )

        try:
            _require_store_owner_or_admin(request.user, store)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "FORBIDDEN",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                details={"store_id": str(store.id)},
                deprecated_detail=str(exc) or "Sem permissão.",
            )

        try:
            edge_token = _get_active_edge_token(store.id)
            raw_token = edge_token.token_plaintext if edge_token else None
            if not edge_token or not raw_token:
                edge_token, raw_token = _issue_edge_token(store.id)
        except (ProgrammingError, OperationalError) as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_SETUP] token error store_id=%s error=%s", str(store.id), exc)
            return _error_response(
                "EDGE_TOKEN_ERROR",
                "Falha ao obter token do Edge.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Falha ao obter token do Edge.",
            )
        except Exception as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_SETUP] unexpected error store_id=%s error=%s", str(store.id), exc)
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado no servidor. Tente novamente.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Erro inesperado no servidor.",
            )

        return Response(
            {
                "store_id": str(store.id),
                "edge_token": raw_token,
                "agent_id_suggested": "edge-001",
                "cloud_base_url": _resolve_cloud_base_url(request),
                **_edge_token_meta(edge_token),
            }
        )

    @action(detail=True, methods=["post"], url_path="edge-token/rotate")
    def edge_token_rotate(self, request, pk=None):
        """
        Rotaciona o token do edge explicitamente (desativa tokens ativos anteriores).
        """
        try:
            store = self.get_object()
        except Http404:
            return _error_response(
                "STORE_NOT_FOUND",
                "Store not found.",
                status.HTTP_404_NOT_FOUND,
                details={"store_id": str(pk)},
                deprecated_detail="Store not found",
            )
        except Exception as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_TOKEN_ROTATE] failed to resolve store store_id=%s error=%s", str(pk), exc)
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado no servidor. Tente novamente.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Erro inesperado no servidor.",
            )

        try:
            _require_store_owner_or_admin(request.user, store)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "FORBIDDEN",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                details={"store_id": str(store.id)},
                deprecated_detail=str(exc) or "Sem permissão.",
            )

        try:
            edge_token, raw_token = _rotate_edge_token(store.id)
        except (ProgrammingError, OperationalError) as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_TOKEN_ROTATE] token error store_id=%s error=%s", str(store.id), exc)
            return _error_response(
                "EDGE_TOKEN_ERROR",
                "Falha ao gerar novo token do Edge.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Falha ao gerar novo token do Edge.",
            )
        except Exception as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_TOKEN_ROTATE] unexpected error store_id=%s error=%s", str(store.id), exc)
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado no servidor. Tente novamente.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Erro inesperado no servidor.",
            )

        if not raw_token:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            return _error_response(
                "EDGE_TOKEN_ERROR",
                "Falha ao gerar novo token do Edge.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Falha ao gerar novo token do Edge.",
            )

        return Response(
            {
                "store_id": str(store.id),
                "edge_token": raw_token,
                "rotated_at": timezone.now().isoformat(),
                **_edge_token_meta(edge_token),
            }
        )

    @action(detail=True, methods=["patch"], url_path=r"cameras/(?P<camera_id>[^/.]+)")
    def set_camera_active(self, request, pk=None, camera_id=None):
        store = self.get_object()
        try:
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )

        if "active" not in request.data:
            return Response({"detail": "Campo 'active' obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        active = request.data.get("active")
        if isinstance(active, str):
            if active.lower() in ("true", "1", "yes"):
                active = True
            elif active.lower() in ("false", "0", "no"):
                active = False

        if not isinstance(active, bool):
            return Response({"detail": "Campo 'active' deve ser booleano."}, status=status.HTTP_400_BAD_REQUEST)

        if not _camera_active_column_exists():
            return Response(
                {"detail": "Coluna 'active' não existe. Rode o script SQL no Supabase."},
                status=status.HTTP_409_CONFLICT,
            )

        camera_qs = Camera.objects.filter(store_id=store.id)
        if _is_uuid(camera_id):
            camera_qs = camera_qs.filter(id=camera_id)
        else:
            camera_qs = camera_qs.filter(external_id=camera_id)

        camera = camera_qs.first()
        if not camera:
            return Response({"detail": "Camera não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if active and not getattr(camera, "active", False):
            try:
                actor_user_id = None
                try:
                    actor_user_id = ensure_user_uuid(request.user)
                except Exception:
                    actor_user_id = None

                enforce_trial_camera_limit(
                    store.id,
                    requested_active=True,
                    exclude_camera_id=str(camera.id),
                    actor_user_id=actor_user_id,
                    user=request.user,
                )
            except PaywallError as exc:
                return Response(
                    {
                        "ok": False,
                        "code": "LIMIT_CAMERAS_REACHED",
                        "message": "Limite de câmeras do trial atingido.",
                        "meta": exc.detail.get("meta", {}) if isinstance(exc.detail, dict) else {},
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        try:
            camera.active = active
            camera.updated_at = timezone.now()
            camera.save(update_fields=["active", "updated_at"])
        except (ProgrammingError, OperationalError):
            return Response(
                {"detail": "Falha ao atualizar camera.active."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "id": str(camera.id),
                "name": camera.name,
                "external_id": camera.external_id,
                "active": camera.active,
                "status": camera.status,
                "last_seen_at": camera.last_seen_at.isoformat() if camera.last_seen_at else None,
            }
        )

    @action(detail=True, methods=["get", "post"], url_path="cameras", permission_classes=[permissions.AllowAny])
    def cameras(self, request, pk=None):
        try:
            store = self.get_object()
        except Http404:
            return _error_response(
                "STORE_NOT_FOUND",
                "Store not found.",
                status.HTTP_404_NOT_FOUND,
                deprecated_detail="Store not found",
            )
        if request.method == "GET":
            if request.user and request.user.is_authenticated:
                require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
            else:
                provided = request.headers.get("X-EDGE-TOKEN") or ""
                if not _validate_edge_token_for_store(str(store.id), provided):
                    return _error_response(
                        "FORBIDDEN",
                        "Edge token inválido para esta loja.",
                        status.HTTP_403_FORBIDDEN,
                        deprecated_detail="Edge token inválido para esta loja.",
                    )
            cameras_qs = Camera.objects.select_related("store").filter(store_id=store.id).order_by("-updated_at")
            serializer = CameraSerializer(cameras_qs, many=True)
            return Response(serializer.data)

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
                    org_id=store.org_id,
                    actor_user_id=actor_user_id,
                    action="create_camera",
                    endpoint=request.path,
                    user=request.user,
                )
        except Exception as exc:
            if getattr(exc, "status_code", None) == status.HTTP_402_PAYMENT_REQUIRED:
                details = getattr(exc, "detail", None)
                message = None
                if isinstance(details, dict):
                    message = details.get("message")
                return _error_response(
                    "PAYWALL_TRIAL_LIMIT",
                    message or "Trial expirado. Assinatura necessária.",
                    status.HTTP_402_PAYMENT_REQUIRED,
                    details=details,
                    deprecated_detail=message or "Trial expirado. Assinatura necessária.",
                )
            logger.exception(
                "[STORE] cameras create entitlement error store_id=%s org_id=%s user_id=%s payload=%s",
                str(store.id),
                str(getattr(store, "org_id", None)),
                getattr(request.user, "id", None),
                _sanitize_camera_payload(request.data),
            )
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado ao validar assinatura.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"reason": str(exc)[:200]},
                deprecated_detail="Erro inesperado ao validar assinatura.",
            )
        serializer = CameraSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except (ValidationError, DjangoValidationError) as exc:
            details = None
            if hasattr(exc, "detail"):
                details = exc.detail
            elif hasattr(exc, "message_dict"):
                details = exc.message_dict
            else:
                details = {"non_field_errors": [str(exc)]}
            logger.warning(
                "[STORE] cameras create validation error store_id=%s org_id=%s user_id=%s errors=%s payload=%s",
                str(store.id),
                str(getattr(store, "org_id", None)),
                getattr(request.user, "id", None),
                details,
                _sanitize_camera_payload(request.data),
            )
            return _error_response(
                "CAMERA_VALIDATION_ERROR",
                "Dados inválidos para câmera.",
                status.HTTP_400_BAD_REQUEST,
                details=details,
                deprecated_detail="Dados inválidos para câmera.",
            )
        requested_active = serializer.validated_data.get("active", True)
        try:
            actor_user_id = None
            try:
                actor_user_id = ensure_user_uuid(request.user)
            except Exception:
                actor_user_id = None
            enforce_trial_camera_limit(
                str(store.id),
                requested_active=requested_active,
                actor_user_id=actor_user_id,
                user=request.user,
            )
        except PaywallError as exc:
            return _error_response(
                "LIMIT_CAMERAS_REACHED",
                "Limite de câmeras do trial atingido.",
                status.HTTP_409_CONFLICT,
                details=exc.detail.get("meta", {}) if isinstance(exc.detail, dict) else {},
                deprecated_detail="Limite de câmeras do trial atingido.",
            )

        now = timezone.now()
        try:
            camera = serializer.save(
                store=store,
                created_at=now,
                updated_at=now,
                status="unknown",
                last_error=None,
            )
        except Exception as exc:
            logger.exception(
                "[STORE] cameras create failed store_id=%s org_id=%s user_id=%s payload=%s",
                str(store.id),
                str(getattr(store, "org_id", None)),
                getattr(request.user, "id", None),
                _sanitize_camera_payload(request.data),
            )
            return _error_response(
                "CAMERA_CREATE_FAILED",
                "Não foi possível cadastrar a câmera.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"reason": str(exc)[:200]},
                deprecated_detail="Não foi possível cadastrar a câmera.",
            )
        try:
            OnboardingProgressService(str(store.org_id)).complete_step(
                "camera_added",
                meta={"store_id": str(store.id), "camera_id": str(camera.id)},
            )
        except Exception:
            pass
        try:
            log_journey_event(
                org_id=str(store.org_id),
                event_name="camera_added",
                payload={
                    "store_id": str(store.id),
                    "camera_id": str(camera.id),
                },
                source="app",
                meta={"path": request.path},
            )
        except Exception:
            logger.exception(
                "[STORE] failed to log camera_added store_id=%s camera_id=%s",
                str(store.id),
                str(camera.id),
            )
        return Response(CameraSerializer(camera).data, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Auto-popula owner_email com email do usuário - ADICIONE ESTE!"""
        user = self.request.user
        payload = getattr(self.request, "data", None) or getattr(self.request, "POST", None) or {}
        requested_org_id = payload.get("org_id") or payload.get("org")
        now = timezone.now()
        user_uuid = None

        def _log_store_created(store: Store):
            try:
                log_journey_event(
                    org_id=str(getattr(store, "org_id", None)) if getattr(store, "org_id", None) else None,
                    event_name="store_created",
                    payload={
                        "store_id": str(store.id),
                        "status": getattr(store, "status", None),
                    },
                    source="app",
                    meta={"path": self.request.path},
                )
            except Exception:
                logger.exception("[STORE] failed to log store_created store_id=%s", str(store.id))

        def _trial_defaults():
            if payload.get("status") or payload.get("trial_started_at") or payload.get("trial_ends_at"):
                return {}
            return {
                "status": "trial",
                "trial_started_at": now,
                "trial_ends_at": now + timedelta(hours=72),
            }

        if requested_org_id:
            if not (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False)):
                user_uuid = ensure_user_uuid(user)
                is_member = OrgMember.objects.filter(
                    org_id=requested_org_id,
                    user_id=user_uuid,
                ).exists()
                if not is_member:
                    print(f"[RBAC] user {user.id} tentou criar store em org {requested_org_id} sem membership.")
                    raise PermissionDenied("Você não tem acesso a esta organização.")
            if not user_uuid:
                try:
                    user_uuid = ensure_user_uuid(user)
                except Exception:
                    user_uuid = None
            enforce_can_use_product(
                org_id=requested_org_id,
                actor_user_id=user_uuid,
                action="create_store",
                endpoint=self.request.path,
                user=self.request.user,
            )
            enforce_trial_store_limit(
                org_id=requested_org_id,
                actor_user_id=user_uuid,
                user=self.request.user,
            )
            store = serializer.save(
                org_id=requested_org_id,
                created_at=now,
                updated_at=now,
                **_trial_defaults(),
            )
            logger.info("[STORE] created store_id=%s org_id=%s user_id=%s", str(store.id), str(requested_org_id), getattr(user, "id", None))
            _log_store_created(store)
            return

        org_ids = get_user_org_ids(user)
        if len(org_ids) == 1:
            if not user_uuid:
                try:
                    user_uuid = ensure_user_uuid(user)
                except Exception:
                    user_uuid = None
            enforce_can_use_product(
                org_id=org_ids[0],
                actor_user_id=user_uuid,
                action="create_store",
                endpoint=self.request.path,
                user=self.request.user,
            )
            enforce_trial_store_limit(
                org_id=org_ids[0],
                actor_user_id=user_uuid,
                user=self.request.user,
            )
            store = serializer.save(
                org_id=org_ids[0],
                created_at=now,
                updated_at=now,
                **_trial_defaults(),
            )
            logger.info("[STORE] created store_id=%s org_id=%s user_id=%s", str(store.id), str(org_ids[0]), getattr(user, "id", None))
            _log_store_created(store)
            return
        if len(org_ids) > 1:
            raise ValidationError("Informe org_id para criar a store.")

        # Sem org: cria uma org default e adiciona o usuário como owner.
        try:
            user_uuid = ensure_user_uuid(user)
            created_at = timezone.now()
            trial_ends_at = created_at + timedelta(hours=72)
            try:
                org = Organization.objects.create(
                    name="Default",
                    segment=None,
                    country="BR",
                    timezone="America/Sao_Paulo",
                    created_at=created_at,
                    trial_ends_at=trial_ends_at,
                )
            except DatabaseError:
                logger.warning(
                    "[ORG] missing trial_ends_at column on organizations, creating without trial",
                    exc_info=True,
                )
                org = Organization.objects.create(
                    name="Default",
                    segment=None,
                    country="BR",
                    timezone="America/Sao_Paulo",
                    created_at=created_at,
                )
            OrgMember.objects.create(
                org=org,
                user_id=user_uuid,
                role="owner",
                created_at=timezone.now(),
            )
            logger.info("[ORG] created org_id=%s user_uuid=%s", str(org.id), str(user_uuid))
            enforce_can_use_product(
                org_id=org.id,
                actor_user_id=user_uuid,
                action="create_store",
                endpoint=self.request.path,
                user=request.user,
            )
            enforce_trial_store_limit(
                org_id=org.id,
                actor_user_id=user_uuid,
                user=request.user,
            )
            store = serializer.save(
                org=org,
                created_at=now,
                updated_at=now,
                **_trial_defaults(),
            )
            logger.info("[STORE] created store_id=%s org_id=%s user_id=%s", str(store.id), str(org.id), getattr(user, "id", None))
            _log_store_created(store)
        except (ProgrammingError, OperationalError) as exc:
            print(f"[RBAC] falha ao criar org padrão: {exc}")
            raise ValidationError("Não foi possível criar organização padrão.")
    
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Dashboard específico da loja (como no seu design)"""
        try:
            store = self.get_object()
            require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
            self._require_subscription_for_store(store, "store_dashboard")
            store_status = getattr(store, "status", None)
            if (
                request.user
                and (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False))
                and store_status == "blocked"
                and getattr(store, "blocked_reason", None) == "trial_expired"
            ):
                store_status = "trial"
            status_ui = "active" if store_status in ("active", "trial") else "inactive"
            plan_value = "trial" if store_status == "trial" else None

            # Sem dados reais ainda (estrutura vazia)
            dashboard_data = {
                'store': {
                    'id': str(store.id),
                    'name': getattr(store, "name", None),
                    'owner_email': getattr(request.user, "email", None),
                    'plan': plan_value,
                    'status': status_ui,
                },
                'metrics': None,
                'insights': None,
                'recommendations': [],
                'alerts': [],
            }

            return Response(dashboard_data)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        except (ProgrammingError, ObjectDoesNotExist) as exc:
            print(f"[WARN] dashboard fallback for store {pk}: {exc}")
            fallback_status = "inactive"
            return Response({
                'store': {
                    'id': str(pk),
                    'name': None,
                    'owner_email': getattr(request.user, "email", None),
                    'plan': None,
                    'status': fallback_status,
                },
                'metrics': None,
                'insights': None,
                'recommendations': [],
                'alerts': [],
                'timestamp': timezone.now().isoformat(),
            })
    
    @action(detail=True, methods=['get'])
    def live_monitor(self, request, pk=None):
        """Dados para monitoramento em tempo real"""
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        
        # ⭐ MOCK - depois vem do processamento de vídeo
        monitor_data = {
            'store': store.name,
            'timestamp': timezone.now().isoformat(),
            'cameras': [
                {
                    'id': 'cam_001',
                    'name': 'Caixa Principal',
                    'status': 'online',
                    'current_viewers': 0,
                    'events_last_hour': 12,
                    'stream_url': f'/api/cameras/{store.id}/stream/cam_001'
                },
                {
                    'id': 'cam_002',
                    'name': 'Entrada Loja',
                    'status': 'online',
                    'current_viewers': 1,
                    'events_last_hour': 47,
                    'stream_url': f'/api/cameras/{store.id}/stream/cam_002'
                }
            ],
            'current_events': [
                {
                    'type': 'person_detected',
                    'camera': 'Entrada Loja',
                    'confidence': 0.92,
                    'timestamp': timezone.now().isoformat(),
                },
                {
                    'type': 'queue_forming',
                    'camera': 'Caixa Principal',
                    'confidence': 0.78,
                    'timestamp': timezone.now().isoformat(),
                    'details': '3 pessoas na fila'
                }
            ]
        }
        
        return Response(monitor_data)

    @action(detail=True, methods=["get"], url_path="limits")
    def limits(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)

        org_id = getattr(store, "org_id", None)
        is_trial_plan = is_trial(org_id)
        cameras_limit = get_camera_limit_for_store(str(store.id))
        cameras_used = count_active_cameras(str(store.id))
        stores_used = Store.objects.filter(org_id=org_id).count() if org_id else 0
        stores_limit = 1 if is_trial_plan else None

        return Response(
            {
                "store_id": str(store.id),
                "plan": "trial" if is_trial_plan else "paid",
                "limits": {
                    "cameras": cameras_limit,
                    "stores": stores_limit,
                },
                "usage": {
                    "cameras": cameras_used,
                    "stores": stores_used,
                },
            }
        )

    @action(detail=True, methods=["get"], url_path="metrics/summary")
    def metrics_summary(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)

        tz = _get_org_timezone(store)
        period = (request.query_params.get("period") or "7d").lower()
        bucket = (request.query_params.get("bucket") or "day").lower()
        if bucket not in {"hour", "day"}:
            bucket = "day"

        start = _parse_dt(request.query_params.get("from"), tz)
        end = _parse_dt(request.query_params.get("to"), tz)
        if not end:
            end = timezone.now()
        if not start:
            days = 7
            if period == "30d":
                days = 30
            elif period == "90d":
                days = 90
            start = end - timedelta(days=days)

        traffic_series = []
        conversion_series = []
        totals = {
            "total_visitors": 0,
            "avg_dwell_seconds": 0,
            "avg_queue_seconds": 0,
            "avg_staff_active": 0,
            "avg_conversion_rate": 0,
        }
        zones_breakdown = []

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT date_trunc(%s, ts_bucket) AS bucket,
                       COALESCE(SUM(footfall), 0) AS footfall,
                       COALESCE(AVG(dwell_seconds_avg), 0) AS dwell_avg
                FROM public.traffic_metrics
                WHERE store_id = %s AND ts_bucket >= %s AND ts_bucket < %s
                GROUP BY 1
                ORDER BY 1 ASC
                """,
                [bucket, str(store.id), start, end],
            )
            for row in cursor.fetchall():
                traffic_series.append(
                    {
                        "ts_bucket": row[0].isoformat(),
                        "footfall": int(row[1] or 0),
                        "dwell_seconds_avg": int(row[2] or 0),
                    }
                )

            cursor.execute(
                """
                SELECT date_trunc(%s, ts_bucket) AS bucket,
                       COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                       COALESCE(AVG(staff_active_est), 0) AS staff_active_est,
                       COALESCE(AVG(conversion_rate), 0) AS conversion_rate
                FROM public.conversion_metrics
                WHERE store_id = %s AND ts_bucket >= %s AND ts_bucket < %s
                GROUP BY 1
                ORDER BY 1 ASC
                """,
                [bucket, str(store.id), start, end],
            )
            for row in cursor.fetchall():
                conversion_series.append(
                    {
                        "ts_bucket": row[0].isoformat(),
                        "queue_avg_seconds": int(row[1] or 0),
                        "staff_active_est": int(row[2] or 0),
                        "conversion_rate": float(row[3] or 0),
                    }
                )

            cursor.execute(
                """
                SELECT COALESCE(SUM(footfall), 0) AS total_visitors,
                       COALESCE(AVG(dwell_seconds_avg), 0) AS avg_dwell_seconds
                FROM public.traffic_metrics
                WHERE store_id = %s AND ts_bucket >= %s AND ts_bucket < %s
                """,
                [str(store.id), start, end],
            )
            row = cursor.fetchone()
            if row:
                totals["total_visitors"] = int(row[0] or 0)
                totals["avg_dwell_seconds"] = int(row[1] or 0)

            cursor.execute(
                """
                SELECT COALESCE(AVG(queue_avg_seconds), 0) AS avg_queue_seconds,
                       COALESCE(AVG(staff_active_est), 0) AS avg_staff_active,
                       COALESCE(AVG(conversion_rate), 0) AS avg_conversion_rate
                FROM public.conversion_metrics
                WHERE store_id = %s AND ts_bucket >= %s AND ts_bucket < %s
                """,
                [str(store.id), start, end],
            )
            row = cursor.fetchone()
            if row:
                totals["avg_queue_seconds"] = int(row[0] or 0)
                totals["avg_staff_active"] = int(row[1] or 0)
                totals["avg_conversion_rate"] = float(row[2] or 0)

            cursor.execute(
                """
                SELECT z.id, z.name,
                       COALESCE(SUM(t.footfall), 0) AS footfall,
                       COALESCE(AVG(t.dwell_seconds_avg), 0) AS dwell_avg
                FROM public.store_zones z
                JOIN public.traffic_metrics t ON t.zone_id = z.id
                WHERE z.store_id = %s AND t.ts_bucket >= %s AND t.ts_bucket < %s
                GROUP BY z.id, z.name
                ORDER BY footfall DESC
                """,
                [str(store.id), start, end],
            )
            for row in cursor.fetchall():
                zones_breakdown.append(
                    {
                        "zone_id": str(row[0]),
                        "name": row[1],
                        "footfall": int(row[2] or 0),
                        "dwell_seconds_avg": int(row[3] or 0),
                    }
                )

        return Response(
            {
                "store_id": str(store.id),
                "from": start.isoformat(),
                "to": end.isoformat(),
                "bucket": bucket,
                "totals": totals,
                "series": {
                    "traffic": traffic_series,
                    "conversion": conversion_series,
                },
                "zones": zones_breakdown,
            }
        )

    @action(detail=True, methods=["get"], url_path="ceo-dashboard")
    def ceo_dashboard(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        self._require_subscription_for_store(store, "ceo_dashboard")

        tz = _get_org_timezone(store)
        period = (request.query_params.get("period") or "7d").lower()
        if period not in {"day", "7d"}:
            period = "7d"

        end = timezone.localtime(timezone.now(), tz)
        start = end - timedelta(days=1 if period == "day" else 7)

        traffic_by_hour = []
        conversion_by_hour = []

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT date_trunc('hour', ts_bucket AT TIME ZONE %s) AS bucket_local,
                       COALESCE(SUM(footfall), 0) AS footfall,
                       COALESCE(AVG(dwell_seconds_avg), 0) AS dwell_avg
                FROM public.traffic_metrics
                WHERE store_id = %s AND ts_bucket >= %s AND ts_bucket < %s
                GROUP BY 1
                ORDER BY 1 ASC
                """,
                [tz.key, str(store.id), start, end],
            )
            for row in cursor.fetchall():
                bucket_local = row[0]
                if bucket_local and timezone.is_naive(bucket_local):
                    bucket_local = timezone.make_aware(bucket_local, tz)
                traffic_by_hour.append(
                    {
                        "ts_bucket": bucket_local.isoformat() if bucket_local else None,
                        "footfall": int(row[1] or 0),
                        "dwell_seconds_avg": int(row[2] or 0),
                        "hour_label": bucket_local.strftime("%H:00") if bucket_local else None,
                    }
                )

            cursor.execute(
                """
                SELECT date_trunc('hour', ts_bucket AT TIME ZONE %s) AS bucket_local,
                       COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                       COALESCE(AVG(staff_active_est), 0) AS staff_active_est,
                       COALESCE(AVG(conversion_rate), 0) AS conversion_rate
                FROM public.conversion_metrics
                WHERE store_id = %s AND ts_bucket >= %s AND ts_bucket < %s
                GROUP BY 1
                ORDER BY 1 ASC
                """,
                [tz.key, str(store.id), start, end],
            )
            for row in cursor.fetchall():
                bucket_local = row[0]
                if bucket_local and timezone.is_naive(bucket_local):
                    bucket_local = timezone.make_aware(bucket_local, tz)
                conversion_by_hour.append(
                    {
                        "ts_bucket": bucket_local.isoformat() if bucket_local else None,
                        "queue_avg_seconds": int(row[1] or 0),
                        "staff_active_est": int(row[2] or 0),
                        "conversion_rate": float(row[3] or 0),
                        "hour_label": bucket_local.strftime("%H:00") if bucket_local else None,
                    }
                )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT ts_bucket, queue_avg_seconds, staff_active_est, conversion_rate
                FROM public.conversion_metrics
                WHERE store_id = %s
                ORDER BY ts_bucket DESC
                LIMIT 1
                """,
                [str(store.id)],
            )
            latest_row = cursor.fetchone()

        latest_bucket = None
        queue_now_seconds = 0
        queue_now_people = 0
        if latest_row:
            latest_bucket = latest_row[0]
            if latest_bucket and timezone.is_naive(latest_bucket):
                latest_bucket = timezone.make_aware(latest_bucket, timezone.utc)
            queue_now_seconds = int(latest_row[1] or 0)
            queue_now_people = max(0, int(round(queue_now_seconds / 30)))

        traffic_avg_dwell = 0
        if traffic_by_hour:
            traffic_avg_dwell = int(
                round(sum(row["dwell_seconds_avg"] for row in traffic_by_hour) / len(traffic_by_hour))
            )

        conversion_avg_queue = 0
        conversion_avg_rate = 0.0
        if conversion_by_hour:
            conversion_avg_queue = int(
                round(sum(row["queue_avg_seconds"] for row in conversion_by_hour) / len(conversion_by_hour))
            )
            conversion_avg_rate = float(
                sum(row["conversion_rate"] for row in conversion_by_hour) / len(conversion_by_hour)
            )

        max_staff = max((row["staff_active_est"] for row in conversion_by_hour), default=0)
        traffic_map = {row["ts_bucket"]: row for row in traffic_by_hour if row.get("ts_bucket")}
        conversion_map = {row["ts_bucket"]: row for row in conversion_by_hour if row.get("ts_bucket")}
        all_buckets = sorted({*traffic_map.keys(), *conversion_map.keys()})

        idle_index_by_hour = []
        for bucket in all_buckets:
            staff_active = conversion_map.get(bucket, {}).get("staff_active_est", 0)
            footfall = traffic_map.get(bucket, {}).get("footfall", 0)
            idle_index = 0.0
            if max_staff > 0:
                idle_index = max(0.0, min(1.0, 1 - (staff_active / max_staff)))
            idle_index_by_hour.append(
                {
                    "ts_bucket": bucket,
                    "idle_index": round(idle_index, 3),
                    "staff_active_est": int(staff_active or 0),
                    "footfall": int(footfall or 0),
                }
            )

        flow_peak = max(traffic_by_hour, key=lambda x: x.get("footfall", 0), default=None)
        idle_peak = max(idle_index_by_hour, key=lambda x: x.get("idle_index", 0), default=None)
        flow_peak_label = flow_peak.get("hour_label") if flow_peak else None
        idle_peak_label = None
        if idle_peak:
            try:
                dt = datetime.fromisoformat(idle_peak.get("ts_bucket"))
                idle_peak_label = dt.strftime("%H:00")
            except Exception:
                idle_peak_label = None

        overlay_message = None
        if flow_peak_label and idle_peak_label:
            if flow_peak_label == idle_peak_label:
                overlay_message = f"Pico de fluxo e ociosidade no mesmo horário ({flow_peak_label})."
            else:
                overlay_message = (
                    f"Pico de fluxo às {flow_peak_label} e pico de ociosidade às {idle_peak_label}."
                )

        payload = {
            "store_id": str(store.id),
            "store_name": store.name,
            "timezone": tz.key,
            "period": period,
            "generated_at": timezone.now().isoformat(),
            "series": {
                "flow_by_hour": traffic_by_hour,
                "idle_index_by_hour": idle_index_by_hour,
            },
            "kpis": {
                "avg_dwell_seconds": traffic_avg_dwell,
                "avg_queue_seconds": conversion_avg_queue,
                "avg_conversion_rate": conversion_avg_rate,
                "queue_now_seconds": queue_now_seconds,
                "queue_now_people": queue_now_people,
                "queue_now_bucket": latest_bucket.isoformat() if latest_bucket else None,
                "queue_now_estimated": True,
            },
            "overlay": {
                "flow_peak_hour": flow_peak_label,
                "idle_peak_hour": idle_peak_label,
                "message": overlay_message,
            },
            "meta": {
                "idle_index_estimated": True,
                "idle_index_method": "staff_active_est_normalized",
                "queue_now_method": "last_bucket_queue_avg_seconds",
            },
        }
        return Response(payload)

    @action(detail=True, methods=["get"], url_path="overview")
    def overview(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)

        summary_response = self.metrics_summary(request, pk=store.id)
        metrics_summary = summary_response.data if isinstance(summary_response, Response) else {}

        try:
            camera_qs = Camera.objects.filter(store_id=store.id).order_by("name")
        except Exception:
            camera_qs = Camera.objects.filter(store_id=store.id)
        cameras = list(
            camera_qs.values(
                "id",
                "name",
                "status",
                "last_seen_at",
                "last_snapshot_url",
                "last_error",
                "zone_id",
            )
        )
        cameras_out = [
            {
                **row,
                "id": str(row["id"]),
                "zone_id": str(row["zone_id"]) if row.get("zone_id") else None,
                "last_seen_at": row["last_seen_at"].isoformat() if row.get("last_seen_at") else None,
            }
            for row in cameras
        ]

        employees_qs = Employee.objects.filter(store_id=store.id, active=True).order_by("full_name")
        employees = list(
            employees_qs.values(
                "id",
                "full_name",
                "role",
                "email",
                "active",
            )
        )
        employees_out = [
            {**row, "id": str(row["id"])}
            for row in employees
        ]

        alerts_qs = (
            DetectionEvent.objects.filter(store_id=store.id)
            .order_by("-occurred_at")
            .values(
                "id",
                "title",
                "severity",
                "status",
                "occurred_at",
                "created_at",
                "type",
            )[:10]
        )
        alerts_out = [
            {
                **row,
                "id": str(row["id"]),
                "occurred_at": row["occurred_at"].isoformat() if row.get("occurred_at") else None,
                "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
            }
            for row in alerts_qs
        ]

        payload = {
            "store": {
                "id": str(store.id),
                "name": store.name,
                "city": store.city,
                "state": store.state,
                "status": store.status,
                "trial_ends_at": store.trial_ends_at.isoformat() if store.trial_ends_at else None,
            },
            "metrics_summary": metrics_summary,
            "edge_health": {
                "last_seen_at": store.last_seen_at.isoformat() if store.last_seen_at else None,
                "last_error": store.last_error,
            },
            "cameras": cameras_out,
            "employees": employees_out,
            "last_alerts": alerts_out,
        }
        return Response(payload)
    
    @action(detail=False, methods=['get'])
    def network_dashboard(self, request):
        """Dashboard para redes com múltiplas lojas (seu segundo design)"""
        try:
            self._require_subscription_for_org_ids(get_user_org_ids(request.user), "network_dashboard")
            stores = list(self.get_queryset())
            total_stores = len(stores)
            active_stores = len([s for s in stores if getattr(s, "status", None) in ("active", "trial")])

            network_data = {
                'network': {
                    'total_stores': total_stores,
                    'active_stores': active_stores,
                    'total_visitors': 0,
                    'avg_conversion': 0,
                },
                'stores': []
            }
            return Response(network_data)
        except (ProgrammingError, ObjectDoesNotExist) as exc:
            print(f"[WARN] network_dashboard fallback: {exc}")
            return Response({
                'network': {
                    'total_stores': 0,
                    'active_stores': 0,
                    'total_visitors': 0,
                    'avg_conversion': 0,
                },
                'stores': []
            })


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Employee.objects.all()
        user = self.request.user
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return qs
        org_ids = get_user_org_ids(user)
        if not org_ids:
            return qs.none()
        store_ids = Store.objects.filter(org_id__in=org_ids).values_list("id", flat=True)
        return qs.filter(store_id__in=list(store_ids))

    def _require_store_access(self, user, store: Store):
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return
        org_ids = get_user_org_ids(user)
        if not org_ids or str(store.org_id) not in {str(o) for o in org_ids}:
            raise PermissionDenied("Você não tem acesso a esta loja.")

    def create(self, request, *args, **kwargs):
        is_many = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=is_many)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            logger.warning(
                "[EMPLOYEE] validation error user_id=%s payload=%s errors=%s",
                getattr(request.user, "id", None),
                request.data,
                getattr(exc, "detail", None) or str(exc),
            )
            raise
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.request.user
        if isinstance(serializer.validated_data, list):
            for item in serializer.validated_data:
                store = item.get("store")
                if store:
                    self._require_store_access(user, store)
        else:
            store = serializer.validated_data.get("store")
            if store:
                self._require_store_access(user, store)
        serializer.save()
