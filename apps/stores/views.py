# apps/stores/views.py 
import logging
import os
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist
from django.db.utils import ProgrammingError, OperationalError
from django.db import connection
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from apps.core.models import Store, OrgMember, Organization, Camera, Employee
from apps.edge.models import EdgeToken
from apps.cameras.limits import enforce_trial_camera_limit
from apps.billing.utils import (
    PaywallError,
    enforce_trial_store_limit,
)
import hashlib
import secrets
import uuid
from .serializers import StoreSerializer, EmployeeSerializer
from apps.stores.services.user_uuid import ensure_user_uuid

logger = logging.getLogger(__name__)

def _expire_trial_stores(qs):
    try:
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

def get_user_org_ids(user):
    user_uuid = ensure_user_uuid(user)
    return list(
        OrgMember.objects.filter(user_id=user_uuid).values_list("org_id", flat=True)
    )


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
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return
    user_uuid = ensure_user_uuid(user)
    allowed_roles = ("owner", "admin")
    is_allowed = OrgMember.objects.filter(
        org_id=store.org_id,
        user_id=user_uuid,
        role__in=allowed_roles,
    ).exists()
    if not is_allowed:
        raise PermissionDenied("Você não tem permissão para acessar as credenciais do edge.")

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

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = Store.objects.all().order_by("-updated_at")
        qs = filter_stores_for_user(qs, self.request.user)
        org_id = self.request.query_params.get("org_id")
        if org_id:
            qs = qs.filter(org_id=org_id)
        _expire_trial_stores(qs)
        return qs
    
    def list(self, request):
        """Sobrescreve list para retornar formato personalizado - MANTENHA ESTE!"""
        stores = self.get_queryset()
        serializer = self.get_serializer(stores, many=True)
        return Response({
            'status': 'success',
            'count': stores.count(),
            'data': serializer.data,
            'timestamp': timezone.now().isoformat()
        })

    @action(detail=True, methods=['get'])
    def edge_token(self, request, pk=None):
        """
        Retorna um token do edge para a store (não rotaciona se já existir).
        """
        store = self.get_object()
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
        Apenas owner/admin da store pode acessar.
        """
        store = self.get_object()
        _require_store_owner_or_admin(request.user, store)

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
        Apenas owner/admin da store pode acessar.
        """
        store = self.get_object()
        _require_store_owner_or_admin(request.user, store)

        edge_token = _get_active_edge_token(store.id)
        raw_token = edge_token.token_plaintext if edge_token else None
        if not edge_token:
            edge_token, raw_token = _issue_edge_token(store.id)

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
        store = self.get_object()
        _require_store_owner_or_admin(request.user, store)

        edge_token, raw_token = _rotate_edge_token(store.id)
        return Response(
            {
                "store_id": str(store.id),
                "edge_token": raw_token,
                "rotated": True,
                **_edge_token_meta(edge_token),
            }
        )

    @action(detail=True, methods=["patch"], url_path=r"cameras/(?P<camera_id>[^/.]+)")
    def set_camera_active(self, request, pk=None, camera_id=None):
        store = self.get_object()

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
                )
            except PaywallError as exc:
                return Response(exc.detail, status=exc.status_code)

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
    
    def perform_create(self, serializer):
        """Auto-popula owner_email com email do usuário - ADICIONE ESTE!"""
        user = self.request.user
        payload = self.request.data or {}
        requested_org_id = payload.get("org_id") or payload.get("org")
        now = timezone.now()
        user_uuid = None

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
            enforce_trial_store_limit(org_id=requested_org_id, actor_user_id=user_uuid)
            store = serializer.save(
                org_id=requested_org_id,
                created_at=now,
                updated_at=now,
                **_trial_defaults(),
            )
            logger.info("[STORE] created store_id=%s org_id=%s user_id=%s", str(store.id), str(requested_org_id), getattr(user, "id", None))
            return

        org_ids = get_user_org_ids(user)
        if len(org_ids) == 1:
            if not user_uuid:
                try:
                    user_uuid = ensure_user_uuid(user)
                except Exception:
                    user_uuid = None
            enforce_trial_store_limit(org_id=org_ids[0], actor_user_id=user_uuid)
            store = serializer.save(
                org_id=org_ids[0],
                created_at=now,
                updated_at=now,
                **_trial_defaults(),
            )
            logger.info("[STORE] created store_id=%s org_id=%s user_id=%s", str(store.id), str(org_ids[0]), getattr(user, "id", None))
            return
        if len(org_ids) > 1:
            raise ValidationError("Informe org_id para criar a store.")

        # Sem org: cria uma org default e adiciona o usuário como owner.
        try:
            user_uuid = ensure_user_uuid(user)
            org = Organization.objects.create(
                name="Default",
                segment=None,
                country="BR",
                timezone="America/Sao_Paulo",
                created_at=timezone.now(),
            )
            OrgMember.objects.create(
                org=org,
                user_id=user_uuid,
                role="owner",
                created_at=timezone.now(),
            )
            logger.info("[ORG] created org_id=%s user_uuid=%s", str(org.id), str(user_uuid))
            enforce_trial_store_limit(org_id=org.id, actor_user_id=user_uuid)
            store = serializer.save(
                org=org,
                created_at=now,
                updated_at=now,
                **_trial_defaults(),
            )
            logger.info("[STORE] created store_id=%s org_id=%s user_id=%s", str(store.id), str(org.id), getattr(user, "id", None))
        except (ProgrammingError, OperationalError) as exc:
            print(f"[RBAC] falha ao criar org padrão: {exc}")
            raise ValidationError("Não foi possível criar organização padrão.")
    
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Dashboard específico da loja (como no seu design)"""
        try:
            store = self.get_object()
            store_status = getattr(store, "status", None)
            status_ui = "active" if store_status in ("active", "trial") else "inactive"
            plan_value = "trial" if store_status == "trial" else None

            # ⭐ MOCK DATA - depois substituímos por dados reais
            dashboard_data = {
                'store': {
                    'id': str(store.id),
                    'name': getattr(store, "name", None),
                    'owner_email': getattr(request.user, "email", None),
                    'plan': plan_value,
                    'status': status_ui,
                },
                'metrics': {
                    'health_score': 92,
                    'productivity': 88,
                    'idle_time': 12,
                    'visitor_flow': 1240,
                    'conversion_rate': 77.5,
                    'avg_cart_value': 89.90,
                },
                'insights': {
                    'peak_hour': '14:00-16:00',
                    'best_selling_zone': 'Corredor A',
                    'employee_performance': {
                        'best': 'Maria Silva (94% produtiva)',
                        'needs_attention': 'João Santos (67% produtiva)'
                    },
                },
                'recommendations': [
                    {
                        'id': 'staff_redistribution',
                        'title': 'Redistribuir Equipe',
                        'description': 'Pico de fluxo esperado às 12:00. Mover 2 colaboradores para o setor têxtil.',
                        'priority': 'high',
                        'action': 'redistribute_staff',
                        'estimated_impact': 'Aumento de 15% na conversão',
                    },
                    {
                        'id': 'inventory_check',
                        'title': 'Verificar Estoque',
                        'description': 'Produtos da linha verão com baixo estoque. Reabastecer até sexta.',
                        'priority': 'medium',
                        'action': 'check_inventory',
                        'estimated_impact': 'Evitar perda de R$ 2.400 em vendas',
                    }
                ],
                'alerts': [
                    {
                        'type': 'high_idle_time',
                        'message': 'Funcionário João teve 45min de ociosidade hoje',
                        'severity': 'medium',
                        'time': '10:30',
                    },
                    {
                        'type': 'conversion_opportunity',
                        'message': '5 clientes abandonaram carrinho no setor eletrônicos',
                        'severity': 'high',
                        'time': '11:15',
                    }
                ]
            }

            return Response(dashboard_data)
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
                'metrics': {
                    'health_score': 0,
                    'productivity': 0,
                    'idle_time': 0,
                    'visitor_flow': 0,
                    'conversion_rate': 0,
                    'avg_cart_value': 0,
                },
                'insights': {
                    'peak_hour': None,
                    'best_selling_zone': None,
                    'employee_performance': {
                        'best': None,
                        'needs_attention': None,
                    },
                },
                'recommendations': [],
                'alerts': [],
                'timestamp': timezone.now().isoformat(),
            })
    
    @action(detail=True, methods=['get'])
    def live_monitor(self, request, pk=None):
        """Dados para monitoramento em tempo real"""
        store = self.get_object()
        
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
    
    @action(detail=False, methods=['get'])
    def network_dashboard(self, request):
        """Dashboard para redes com múltiplas lojas (seu segundo design)"""
        try:
            stores = list(self.get_queryset())
            total_stores = len(stores)
            active_stores = 0

            network_data = {
                'network': {
                    'total_stores': total_stores,
                    'active_stores': 0,
                    'total_visitors': 3124,
                    'avg_conversion': 75.2,
                },
                'stores': []
            }

            for store in stores:
                store_status = getattr(store, "status", None)
                status_ui = "active" if store_status in ("active", "trial") else "inactive"
                if status_ui == "active":
                    active_stores += 1

                # MOCK metrics por loja
                store_metrics = {
                    'id': str(getattr(store, "id", "")),
                    'name': getattr(store, "name", None),
                    'location': f'{getattr(store, "name", "Loja")} - Matriz',  # Placeholder
                    'health': 92 - (total_stores * 2),  # Mock
                    'visitor_flow': 1240 - (total_stores * 100),
                    'conversion': 77.5 - (total_stores * 1.5),
                    'status': status_ui,
                    'alerts': 2 if status_ui == "active" else 0
                }
                network_data['stores'].append(store_metrics)

            network_data['network']['active_stores'] = active_stores
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
        serializer.is_valid(raise_exception=True)
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
