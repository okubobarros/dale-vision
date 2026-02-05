# SNAPSHOT_CONTEXT (auto)

Gerado em: 2026-02-05 20:39:20

Este snapshot existe para colar em um novo chat e dar contexto do repositório.

Inclui apenas arquivos texto e ignora binários/vídeos/modelos.


---
## Tree (limitada)

```
backend/
  .env
  __init__.py
  asgi.py
  settings.py
  urls.py
  wsgi.py

apps/
  accounts/
    migrations/
      __init__.py
    __init__.py
    admin.py
    apps.py
    models.py
    serializers.py
    tests.py
    urls.py
    views.py
  alerts/
    migrations/
      __init__.py
    __init__.py
    admin.py
    apps.py
    models.py
    serializers.py
    services.py
    tests.py
    urls.py
    views.py
  analytics/
    migrations/
      __init__.py
    __init__.py
    admin.py
    apps.py
    models.py
    tests.py
    views.py
  billing/
    migrations/
      __init__.py
    __init__.py
    admin.py
    apps.py
    models.py
    tests.py
    views.py
  cameras/
    migrations/
      __init__.py
    __init__.py
    admin.py
    apps.py
    models.py
    serializers.py
    services.py
    tests.py
    urls.py
    views.py
  core/
    management/
      commands/
        __init__.py
        health_alerts_tick.py
        seed_demo.py
      __init__.py
    migrations/
      0001_initial.py
      0002_alertrule_auditlog_billingcustomer_camera_and_more.py
      0003_storemanager.py
      __init__.py
    __init__.py
    admin.py
    apps.py
    models.py
    tests.py
    views.py
  edge/
    migrations/
      0001_initial.py
      0002_edgetoken.py
      __init__.py
    tests/
    __init__.py
    admin.py
    apps.py
    models.py
    permissions.py
    serializers.py
    tests.py
    urls.py
    views.py
  stores/
    migrations/
      __init__.py
    tests/
    __init__.py
    admin.py
    apps.py
    models.py
    serializers.py
    tests.py
    urls.py
    views.py
    views_edge_status.py

frontend/
  public/
    vite.svg
  src/
    assets/
      react.svg
    components/
      Agent/
        AgentModal.tsx
      Charts/
        LineChart.tsx
        PieChart.tsx
      Edge/
      Layout/
        BottomNav.tsx
        Header.tsx
        index.ts
        Layout.tsx
        Sidebar.tsx
      Skeletons/
        DashboardSkeleton.tsx
      PrivateRoute.tsx
    contexts/
      AgentContext.tsx
      AuthContext.tsx
    hooks/
      useIsMobile.ts
      useRevealOnScroll.ts
    pages/
      AgendarDemo/
        AgendarDemo.tsx
      AlertRules/
        AlertRules.tsx
      Alerts/
        Alerts.tsx
      Analytics/
        Analytics.tsx
      Cameras/
        Cameras.tsx
      Dashboard/
        Dashboard.tsx
      Home/
        Home.tsx
      Login/
        Login.tsx
      NotificationLogs/
        NotificationLogs.tsx
      Onboarding/
        components/
          CamerasSetup.tsx
          EmployeesSetup.tsx
          OnboardingProgress.tsx
          StoresSetup.tsx
        Onboarding.tsx
        OnboardingSuccess.tsx
      Profile/
        Profile.tsx
      Register/
        Register.tsx
      Settings/
        Settings.tsx
      Setup/
        Setup.tsx
      Stores/
        Stores.tsx
    queries/
      alerts.queries.ts
    services/
      alerts.ts
      api.ts
      auth.ts
      demo.ts
      stores.ts
    types/
      dashboard.ts
    utils/
      edgeReasons.ts
    App.tsx
    index.css
    main.tsx
  .gitignore
  eslint.config.js
  index.html
  package-lock.json
  package.json
  pnpm-lock.yaml
  postcss.config.js
  README.md
  tailwind.config.js
  tsconfig.app.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts

edge-agent/
  config/
    rois/
      cam01.yaml
      cam02.yaml
      cam03.yaml
    agent.yaml
  data/
  install/
  logs/
    agent.log
    monitor_edge_status_20260204_192545.log
  models/
  rois/
  scripts/
  src/
    agent/
      __init__.py
      __main__.py
      cli.py
      lifecycle.py
      main.py
      settings.py
      setup_server.py
    camera/
      rtsp.py
    events/
      builder.py
      receipts.py
    storage/
      __init__.py
      sqlite_queue.py
    transport/
      api_client.py
    vision/
      aggregations.py
      detector.py
      rules.py
    __init__.py
  videos/
  01_setup.bat
  02_run.bat
  monitor_edge_status.log
  README_PILOT.md

scripts/
  add_camera_external_id.sql
  generate_context_snapshot.py
  project_snapshot.ps1
  snapshot_project.ps1

docs/
  SNAPSHOT_CONTEXT.json
  SNAPSHOT_CONTEXT.md
```

---
## Arquivos incluídos

```
apps/accounts/__init__.py
apps/accounts/admin.py
apps/accounts/apps.py
apps/accounts/migrations/__init__.py
apps/accounts/models.py
apps/accounts/serializers.py
apps/accounts/tests.py
apps/accounts/urls.py
apps/accounts/views.py
apps/alerts/__init__.py
apps/alerts/admin.py
apps/alerts/apps.py
apps/alerts/migrations/__init__.py
apps/alerts/models.py
apps/alerts/serializers.py
apps/alerts/services.py
apps/alerts/tests.py
apps/alerts/urls.py
apps/alerts/views.py
apps/analytics/__init__.py
apps/analytics/admin.py
apps/analytics/apps.py
apps/analytics/migrations/__init__.py
apps/analytics/models.py
apps/analytics/tests.py
apps/analytics/views.py
apps/billing/__init__.py
apps/billing/admin.py
apps/billing/apps.py
apps/billing/migrations/__init__.py
apps/billing/models.py
apps/billing/tests.py
apps/billing/views.py
apps/cameras/__init__.py
apps/cameras/admin.py
apps/cameras/apps.py
apps/cameras/migrations/__init__.py
apps/cameras/models.py
apps/cameras/serializers.py
apps/cameras/services.py
apps/cameras/tests.py
apps/cameras/urls.py
apps/cameras/views.py
apps/core/__init__.py
apps/core/admin.py
apps/core/apps.py
apps/core/management/__init__.py
apps/core/management/commands/__init__.py
apps/core/management/commands/health_alerts_tick.py
apps/core/management/commands/seed_demo.py
apps/core/migrations/0001_initial.py
apps/core/migrations/0002_alertrule_auditlog_billingcustomer_camera_and_more.py
apps/core/migrations/0003_storemanager.py
apps/core/migrations/__init__.py
apps/core/models.py
apps/core/tests.py
apps/core/views.py
apps/edge/__init__.py
apps/edge/admin.py
apps/edge/apps.py
apps/edge/migrations/0001_initial.py
apps/edge/migrations/0002_edgetoken.py
apps/edge/migrations/__init__.py
apps/edge/models.py
apps/edge/permissions.py
apps/edge/serializers.py
apps/edge/tests.py
apps/edge/urls.py
apps/edge/views.py
apps/stores/__init__.py
apps/stores/admin.py
apps/stores/apps.py
apps/stores/migrations/__init__.py
apps/stores/models.py
apps/stores/serializers.py
apps/stores/tests.py
apps/stores/urls.py
apps/stores/views.py
apps/stores/views_edge_status.py
backend/__init__.py
backend/asgi.py
backend/settings.py
backend/urls.py
backend/wsgi.py
docs/SNAPSHOT_CONTEXT.json
edge-agent/README_PILOT.md
edge-agent/config/agent.yaml
edge-agent/config/rois/cam01.yaml
edge-agent/config/rois/cam02.yaml
edge-agent/config/rois/cam03.yaml
edge-agent/src/__init__.py
edge-agent/src/agent/__init__.py
edge-agent/src/agent/__main__.py
edge-agent/src/agent/cli.py
edge-agent/src/agent/lifecycle.py
edge-agent/src/agent/main.py
edge-agent/src/agent/settings.py
edge-agent/src/agent/setup_server.py
edge-agent/src/camera/rtsp.py
edge-agent/src/events/builder.py
edge-agent/src/events/receipts.py
edge-agent/src/storage/__init__.py
edge-agent/src/storage/sqlite_queue.py
edge-agent/src/transport/api_client.py
edge-agent/src/vision/aggregations.py
edge-agent/src/vision/detector.py
edge-agent/src/vision/rules.py
frontend/README.md
frontend/eslint.config.js
frontend/index.html
frontend/package-lock.json
frontend/package.json
frontend/pnpm-lock.yaml
frontend/postcss.config.js
frontend/src/App.tsx
frontend/src/components/Agent/AgentModal.tsx
frontend/src/components/Charts/LineChart.tsx
frontend/src/components/Charts/PieChart.tsx
frontend/src/components/Layout/BottomNav.tsx
frontend/src/components/Layout/Header.tsx
frontend/src/components/Layout/Layout.tsx
frontend/src/components/Layout/Sidebar.tsx
frontend/src/components/Layout/index.ts
frontend/src/components/PrivateRoute.tsx
frontend/src/components/Skeletons/DashboardSkeleton.tsx
frontend/src/contexts/AgentContext.tsx
frontend/src/contexts/AuthContext.tsx
frontend/src/hooks/useIsMobile.ts
frontend/src/hooks/useRevealOnScroll.ts
frontend/src/index.css
frontend/src/main.tsx
frontend/src/pages/AgendarDemo/AgendarDemo.tsx
frontend/src/pages/AlertRules/AlertRules.tsx
frontend/src/pages/Alerts/Alerts.tsx
frontend/src/pages/Analytics/Analytics.tsx
frontend/src/pages/Cameras/Cameras.tsx
frontend/src/pages/Dashboard/Dashboard.tsx
frontend/src/pages/Home/Home.tsx
frontend/src/pages/Login/Login.tsx
frontend/src/pages/NotificationLogs/NotificationLogs.tsx
frontend/src/pages/Onboarding/Onboarding.tsx
frontend/src/pages/Onboarding/OnboardingSuccess.tsx
frontend/src/pages/Onboarding/components/CamerasSetup.tsx
frontend/src/pages/Onboarding/components/EmployeesSetup.tsx
frontend/src/pages/Onboarding/components/OnboardingProgress.tsx
frontend/src/pages/Onboarding/components/StoresSetup.tsx
frontend/src/pages/Profile/Profile.tsx
frontend/src/pages/Register/Register.tsx
frontend/src/pages/Settings/Settings.tsx
frontend/src/pages/Setup/Setup.tsx
frontend/src/pages/Stores/Stores.tsx
frontend/src/queries/alerts.queries.ts
frontend/src/services/alerts.ts
frontend/src/services/api.ts
frontend/src/services/auth.ts
frontend/src/services/demo.ts
frontend/src/services/stores.ts
frontend/src/types/dashboard.ts
frontend/src/utils/edgeReasons.ts
frontend/tailwind.config.js
frontend/tsconfig.app.json
frontend/tsconfig.json
frontend/tsconfig.node.json
frontend/vite.config.ts
scripts/generate_context_snapshot.py
```

---
## Conteúdo (trechos)


### apps/accounts/__init__.py

```

```

### apps/accounts/admin.py

```
from django.contrib import admin

# Register your models here.
```

### apps/accounts/apps.py

```
# apps/accounts/apps.py
from django.apps import AppConfig

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
```

### apps/accounts/migrations/__init__.py

```

```

### apps/accounts/models.py

```
from django.db import models

# Create your models here.
```

### apps/accounts/serializers.py

```
# apps/accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]
        read_only_fields = ["id"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name"]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email já está em uso.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["username"],
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Credenciais inválidas.")
        if not user.is_active:
            raise serializers.ValidationError("Usuário inativo.")
        attrs["user"] = user
        return attrs
```

### apps/accounts/tests.py

```
from django.test import TestCase

# Create your tests here.
```

### apps/accounts/urls.py

```
# apps/accounts/urls.py
from django.urls import path
from knox import views as knox_views
from .views import RegisterView, LoginView, MeView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", knox_views.LogoutView.as_view(), name="logout"),
    path("logoutall/", knox_views.LogoutAllView.as_view(), name="logoutall"),
    path("me/", MeView.as_view(), name="me"),
]
```

### apps/accounts/views.py

```
# apps/accounts/views.py
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from knox.models import AuthToken
from django.contrib.auth import authenticate
from django.db import connection

from drf_yasg.utils import swagger_auto_schema  # ✅
from drf_yasg import openapi  # (opcional)

from .serializers import RegisterSerializer, LoginSerializer
from apps.core.models import OrgMember


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=RegisterSerializer, responses={201: openapi.Response("Created")})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = AuthToken.objects.create(user)[1]

        return Response(
            {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "token": token,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=LoginSerializer, responses={200: openapi.Response("OK")})
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        token = AuthToken.objects.create(user)[1]

        return Response(
            {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "token": token,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user or not getattr(user, "id", None):
            return Response({"detail": "Usuário não autenticado."}, status=status.HTTP_403_FORBIDDEN)

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT user_uuid FROM public.user_id_map WHERE django_user_id = %s",
                [user.id],
            )
            row = cursor.fetchone()
            if not row or not row[0]:
                cursor.execute(
                    "INSERT INTO public.user_id_map (django_user_id) VALUES (%s) RETURNING user_uuid",
                    [user.id],
                )
                row = cursor.fetchone()
            user_uuid = row[0]

        memberships = (
            OrgMember.objects
            .filter(user_id=user_uuid)
            .select_related("org")
        )
        orgs = [
            {
                "id": str(m.org.id),
                "name": m.org.name,
                "role": m.role,
            }
            for m in memberships
        ]

        return Response(
            {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "orgs": orgs,
            },
            status=status.HTTP_200_OK,
        )
```

### apps/alerts/__init__.py

```

```

### apps/alerts/admin.py

```
from django.contrib import admin

# Register your models here.
```

### apps/alerts/apps.py

```
from django.apps import AppConfig


class AlertsConfig(AppConfig):
    name = 'apps.alerts'
    verbose_name = 'Alerts'
```

### apps/alerts/migrations/__init__.py

```

```

### apps/alerts/models.py

```
from django.db import models

# Create your models here.
```

### apps/alerts/serializers.py

```
# apps/alerts/serializers.py
from rest_framework import serializers
from django.utils import timezone

from apps.core.models import (
    DemoLead,
    AlertRule,
    DetectionEvent,
    EventMedia,
    NotificationLog,
    JourneyEvent,
)


class DemoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoLead
        fields = "__all__"
        read_only_fields = ("id", "created_at", "status")


class AlertRuleSerializer(serializers.ModelSerializer):
    # write-only (entrada)
    store_id = serializers.UUIDField(write_only=True, required=True)
    zone_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    # read-only (saída fácil para debug/UI)
    store = serializers.UUIDField(source="store_id", read_only=True)
    zone = serializers.UUIDField(source="zone_id", read_only=True)

    class Meta:
        model = AlertRule
        fields = [
            "id",

            # entrada
            "store_id",
            "zone_id",

            # saída
            "store",
            "zone",

            "type",
            "severity",
            "active",
            "threshold",
            "cooldown_minutes",
            "channels",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "store", "zone"]

    def create(self, validated_data):
        store_id = validated_data.pop("store_id")
        zone_id = validated_data.pop("zone_id", None)

        now = timezone.now()

        return AlertRule.objects.create(
            store_id=store_id,
            zone_id=zone_id,
            created_at=now,
            updated_at=now,
            **validated_data,
        )

    def update(self, instance, validated_data):
        if "store_id" in validated_data:
            instance.store_id = validated_data.pop("store_id")
        if "zone_id" in validated_data:
            instance.zone_id = validated_data.pop("zone_id")

        for k, v in validated_data.items():
            setattr(instance, k, v)

        instance.updated_at = timezone.now()
        instance.save()
        return instance


class EventMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventMedia
        fields = "__all__"
        read_only_fields = ("id", "created_at")


class DetectionEventSerializer(serializers.ModelSerializer):
    media = serializers.SerializerMethodField()

    class Meta:
        model = DetectionEvent
        fields = "__all__"
        read_only_fields = ("id", "created_at")

    def get_media(self, obj):
        qs = EventMedia.objects.filter(event_id=obj.id).order_by("-created_at")
        return EventMediaSerializer(qs, many=True).data


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = "__all__"
        read_only_fields = ("id", "sent_at")


class JourneyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourneyEvent
        fields = "__all__"
        read_only_fields = ("id", "created_at")
```

### apps/alerts/services.py

```
# apps/alerts/services.py
import requests
from typing import Optional, Dict, Any
from django.conf import settings
from django.utils import timezone


DEFAULT_TIMEOUT = 8


def _get_webhook() -> Optional[str]:
    """
    Webhook único para eventos (leads, calendly, alerts, billing, etc.)
    """
    return getattr(settings, "N8N_EVENTS_WEBHOOK", None)


def send_event_to_n8n(
    *,
    event_name: str,
    data: Dict[str, Any],
    event_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    org_id: Optional[str] = None,
    source: str = "backend",
    event_version: int = 1,
    meta: Optional[Dict[str, Any]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """
    Envia um evento padronizado para o n8n.
    - event_name: "lead_created", "alert_triggered", "invoice_overdue", etc.
    - data: payload específico do evento
    - event_id: idealmente o UUID do JourneyEvent (idempotência)
    - lead_id/org_id: usados para roteamento e auditoria
    - meta: extras úteis (ip, user_agent, request_id, etc.)
    """
    webhook = _get_webhook()
    if not webhook:
        return {"ok": False, "error": "N8N_EVENTS_WEBHOOK not configured"}

    payload = {
        "event_id": str(event_id) if event_id else None,
        "event_name": event_name,
        "event_version": event_version,
        "source": source,
        "ts": timezone.now().isoformat(),
        "lead_id": str(lead_id) if lead_id else None,
        "org_id": str(org_id) if org_id else None,
        "data": data or {},
        "meta": meta or {},
    }

    try:
        r = requests.post(webhook, json=payload, timeout=timeout)
        if r.ok:
            try:
                return {"ok": True, "status": r.status_code, "data": r.json()}
            except Exception:
                return {"ok": True, "status": r.status_code, "data": {"text": r.text}}
        return {"ok": False, "status": r.status_code, "error": r.text}
    except Exception as e:
        return {"ok": False, "error": str(e)}
```

### apps/alerts/tests.py

```
from django.test import TestCase

# Create your tests here.
```

### apps/alerts/urls.py

```
# apps/alerts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DemoLeadCreateView,
    AlertRuleViewSet,
    DetectionEventViewSet,
    NotificationLogViewSet,
    CoreStoreListView,
    JourneyEventViewSet,
)

router = DefaultRouter()
router.register(r"alert-rules", AlertRuleViewSet, basename="alert-rules")
router.register(r"events", DetectionEventViewSet, basename="events")
router.register(r"notification-logs", NotificationLogViewSet, basename="notification-logs")
router.register(r"journey-events", JourneyEventViewSet, basename="journey-events")

urlpatterns = [
    path("stores/", CoreStoreListView.as_view(), name="alerts-core-stores"),
    path("demo-leads/", DemoLeadCreateView.as_view(), name="demo-leads"),
    path("", include(router.urls)),
]
```

### apps/alerts/views.py

```
# apps/alerts/views.py
from datetime import timedelta
from uuid import UUID
from django.conf import settings
from django.contrib.auth import get_user_model
from apps.core.models import StoreManager


from django.utils import timezone
from django.db.utils import DataError
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import (
    DemoLead,
    AlertRule,
    DetectionEvent,
    EventMedia,
    NotificationLog,
    Store,
    JourneyEvent,
)

from .serializers import (
    DemoLeadSerializer,
    AlertRuleSerializer,
    DetectionEventSerializer,
    EventMediaSerializer,
    NotificationLogSerializer,
    JourneyEventSerializer,
)

from .services import send_event_to_n8n


# =========================
# CORE STORES (UUID) - para o frontend filtrar alerts corretamente
# GET /api/alerts/stores/
# =========================
class CoreStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ("id", "name")


class CoreStoreListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Store.objects.all().order_by("name")
        return Response(CoreStoreSerializer(qs, many=True).data)


# =========================
# Helpers
# =========================
def is_uuid(value: str) -> bool:
    try:
        UUID(str(value))
        return True
    except Exception:
        return False

def _dest_to_text(dest):
    """
    notification_logs.destination é TEXT.
    - string -> string
    - lista -> CSV
    - None -> None
    """
    if dest is None:
        return None
    if isinstance(dest, list):
        return ",".join([str(x).strip() for x in dest if str(x).strip()])
    return str(dest).strip()


def require_uuid_param(name: str, value: str):
    if not is_uuid(value):
        raise ValidationError({name: f'{name} deve ser um UUID válido (core.Store). Recebido: "{value}".'})

def resolve_email_destinations(*, store_id, explicit_email=None):
    """
    Resolve e-mails automaticamente:
    - Se explicit_email foi fornecido (request), retorna ele.
    - Senão, tenta StoreManager -> User.email (owner/admin/manager).
    Retorna lista de emails (dedup).
    """
    if explicit_email:
        # aceita string ou lista
        if isinstance(explicit_email, list):
            return [e for e in explicit_email if e]
        return [explicit_email]

    User = get_user_model()

    # Ajuste roles conforme seu ORG_ROLE / StoreManager model
    qs = (
        StoreManager.objects
        .filter(store_id=store_id)
        .select_related("user")
    )

    # Se StoreManager tiver campo role, descomente e ajuste:
    # qs = qs.filter(role__in=["owner", "admin", "manager"])

    emails = []
    for sm in qs:
        email = getattr(sm.user, "email", None)
        if email:
            emails.append(email)

    # dedupe preservando ordem
    out = []
    for e in emails:
        if e not in out:
            out.append(e)
    return out


def get_store_plan_features(store: Store) -> dict:
    features = {"email": True, "whatsapp": False}

    default_features = getattr(settings, "DALE_PLAN_DEFAULT_FEATURES", None)
    if isinstance(default_features, dict):
        features.update(default_features)

    if getattr(settings, "DALE_WHATSAPP_ENABLED", False):
        features["whatsapp"] = True

    plan_code = getattr(store, "plan_code", None) or getattr(getattr(store, "org", None), "plan_code", None)
    _ = plan_code  # reservado para futura lógica por plano

    return features

# =========================
# DEMO LEAD (FORM PÚBLICO) — Opção A (DEDUPE por email/whatsapp)
# =========================
class DemoLeadCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        now = timezone.now()

        email = (request.data.get("email") or "").strip()
        whatsapp = (request.data.get("whatsapp") or "").strip()

        active_statuses = ["new", "contacted", "scheduled"]
        existing = None

        if email:
            existing = (
                DemoLead.objects.filter(email__iexact=email, status__in=active_statuses)
                .order_by("-created_at")
                .first()
            )

        if not existing and whatsapp:
            existing = (
                DemoLead.objects.filter(whatsapp=whatsapp, status__in=active_statuses)
                .order_by("-created_at")
                .first()
            )

        if existing:
            # 1) grava JourneyEvent
            je = JourneyEvent.objects.create(
                lead_id=existing.id,
                org_id=None,
                event_name="lead_duplicate_attempt",
                payload={
                    "event_category": "onboarding",
                    "source": "demo_form",
                    "reason": "duplicate_active_lead",
                    "status": existing.status,
                    "email": email or existing.email,
                    "whatsapp": whatsapp or existing.whatsapp,
                },
                created_at=now,
            )

            # 2) dispara n8n (webhook único)
            try:
                send_event_to_n8n(
                    event_name="lead_duplicate_attempt",
                    event_id=str(je.id),
                    lead_id=str(existing.id),
                    org_id=None,
                    source="backend",
                    data={
                        "event_category": "onboarding",
                        "lead_id": str(existing.id),
                        "status": existing.status,
                        "email": existing.email,
                        "whatsapp": existing.whatsapp,
                        "created_at": existing.created_at.isoformat() if existing.created_at else None,
                    },
                    meta={
                        "source": "demo_form",
                        "ip": request.META.get("REMOTE_ADDR"),
                        "user_agent": request.META.get("HTTP_USER_AGENT"),
                    },
                )
            except Exception:
                pass

            return Response(DemoLeadSerializer(existing).data, status=status.HTTP_200_OK)

        # 1) Cria lead
        serializer = DemoLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save(status="new", created_at=now)

        # 2) JourneyEvent: lead_created
        je = JourneyEvent.objects.create(
            lead_id=lead.id,
            org_id=None,

<<truncated>>
```

### apps/analytics/__init__.py

```

```

### apps/analytics/admin.py

```
from django.contrib import admin

# Register your models here.
```

### apps/analytics/apps.py

```
from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.analytics'
    verbose_name = 'Analytics'
```

### apps/analytics/migrations/__init__.py

```

```

### apps/analytics/models.py

```
from django.db import models

# Create your models here.
```

### apps/analytics/tests.py

```
from django.test import TestCase

# Create your tests here.
```

### apps/analytics/views.py

```
from django.shortcuts import render

# Create your views here.
```

### apps/billing/__init__.py

```

```

### apps/billing/admin.py

```
from django.contrib import admin

# Register your models here.
```

### apps/billing/apps.py

```
from django.apps import AppConfig


class BillingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.billing'
    verbose_name = 'Billing'
```

### apps/billing/migrations/__init__.py

```

```

### apps/billing/models.py

```
from django.db import models

# Create your models here.
```

### apps/billing/tests.py

```
from django.test import TestCase

# Create your tests here.
```

### apps/billing/views.py

```
from django.shortcuts import render

# Create your views here.
```

### apps/cameras/__init__.py

```

```

### apps/cameras/admin.py

```
# apps/cameras/admin.py
# Admin do app cameras desativado por enquanto.
# O model Camera/CameraHealthLog vive em apps.core e já está registrado em apps/core/admin.py.
```

### apps/cameras/apps.py

```
from django.apps import AppConfig


class CamerasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.cameras'
    verbose_name = 'Cameras'
```

### apps/cameras/migrations/__init__.py

```

```

### apps/cameras/models.py

```
#apps/cameras/models.py
```

### apps/cameras/serializers.py

```
from rest_framework import serializers
from apps.core.models import Camera, CameraHealthLog

class CameraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Camera
        fields = "__all__"
        read_only_fields = ("id","created_at","updated_at","last_seen_at","last_snapshot_url","last_error")

class CameraHealthLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraHealthLog
        fields = "__all__"
        read_only_fields = ("id","checked_at")
```

### apps/cameras/services.py

```
import time
import cv2
import tempfile
from django.utils import timezone

def rtsp_snapshot(rtsp_url: str, timeout_sec: int = 6) -> dict:
    """
    Tenta capturar 1 frame do RTSP.
    Retorna: ok, latency_ms, tmp_path (jpg) ou error.
    """
    start = time.time()
    cap = cv2.VideoCapture(rtsp_url)

    # timeout manual (opencv não é perfeito com timeout)
    deadline = start + timeout_sec
    ok = False
    frame = None

    while time.time() < deadline:
        ok, frame = cap.read()
        if ok and frame is not None:
            break

    cap.release()

    if not ok or frame is None:
        return {"ok": False, "error": "Não foi possível capturar frame RTSP."}

    latency_ms = int((time.time() - start) * 1000)

    fd, path = tempfile.mkstemp(suffix=".jpg")
    # fecha fd porque cv2.imwrite usa path
    import os
    os.close(fd)

    cv2.imwrite(path, frame)
    return {"ok": True, "latency_ms": latency_ms, "path": path, "captured_at": timezone.now()}
```

### apps/cameras/tests.py

```
from django.test import TestCase

# Create your tests here.
```

### apps/cameras/urls.py

```
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CameraViewSet, CameraHealthLogViewSet

router = DefaultRouter()
router.register(r"cameras", CameraViewSet, basename="cameras")
router.register(r"camera-health-logs", CameraHealthLogViewSet, basename="camera-health-logs")

urlpatterns = [
    path("", include(router.urls)),
]
```

### apps/cameras/views.py

```
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
```

### apps/core/__init__.py

```

```

### apps/core/admin.py

```
# apps/core/admin.py
from django.contrib import admin
from . import models

# Registra tudo rapidamente (para não travar agora)
admin.site.register(models.Organization)
admin.site.register(models.OrgMember)
admin.site.register(models.Store)
admin.site.register(models.StoreZone)
admin.site.register(models.Camera)
admin.site.register(models.CameraHealthLog)
admin.site.register(models.Employee)
admin.site.register(models.Shift)
admin.site.register(models.TimeClockEntry)
admin.site.register(models.DetectionEvent)
admin.site.register(models.EventMedia)
admin.site.register(models.AlertRule)
admin.site.register(models.NotificationLog)
admin.site.register(models.DemoLead)
admin.site.register(models.OnboardingProgress)
admin.site.register(models.BillingCustomer)
admin.site.register(models.Subscription)
admin.site.register(models.AuditLog)
```

### apps/core/apps.py

```
from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
    verbose_name = 'Configurações Core'
```

### apps/core/management/__init__.py

```
"""Management package for core app."""
```

### apps/core/management/commands/__init__.py

```
"""Management commands for core app."""
```

### apps/core/management/commands/health_alerts_tick.py

```
import os
from typing import List, Tuple

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.core.exceptions import FieldError
from django.db.utils import ProgrammingError, OperationalError
from django.utils import timezone

from apps.core.models import Store, Camera, NotificationLog
from apps.stores.views_edge_status import (
    classify_age,
    _get_last_heartbeat,
    _get_latest_camera_health,
)


ALERT_THRESHOLD_SECONDS = 5 * 60
ALERT_COOLDOWN_SECONDS = 15 * 60

_NOTIFICATION_LOGS_AVAILABLE = None


def _notification_logs_available() -> bool:
    global _NOTIFICATION_LOGS_AVAILABLE
    if _NOTIFICATION_LOGS_AVAILABLE is not None:
        return _NOTIFICATION_LOGS_AVAILABLE
    try:
        NotificationLog.objects.all().only("id")[:1]
        _NOTIFICATION_LOGS_AVAILABLE = True
    except Exception:
        _NOTIFICATION_LOGS_AVAILABLE = False
    return _NOTIFICATION_LOGS_AVAILABLE


def _get_recipients() -> List[str]:
    raw = (
        getattr(settings, "EDGE_ALERT_EMAIL_TO", None)
        or os.getenv("EDGE_ALERT_EMAIL_TO")
        or os.getenv("ALERT_EMAIL_TO")
    )
    if not raw:
        return []
    return [r.strip() for r in raw.replace(";", ",").split(",") if r.strip()]


def _send_email(subject: str, body: str, recipients: List[str]) -> Tuple[bool, str]:
    if not recipients:
        return False, "no_recipients"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(
        settings, "EMAIL_HOST_USER", None
    )
    if not from_email:
        from_email = "no-reply@localhost"
    try:
        send_mail(subject, body, from_email, recipients, fail_silently=False)
        return True, ""
    except Exception as exc:
        return False, str(exc)


def _cooldown_ok(store_id, alert_type: str) -> bool:
    if not _notification_logs_available():
        return True
    try:
        last = (
            NotificationLog.objects.filter(
                store_id=store_id,
                provider="edge_status",
                provider_message_id=alert_type,
            )
            .order_by("-sent_at")
            .first()
        )
        if not last or not last.sent_at:
            return True
        delta = (timezone.now() - last.sent_at).total_seconds()
        return delta >= ALERT_COOLDOWN_SECONDS
    except Exception:
        return True


def _log_notification(store: Store, alert_type: str, recipients: List[str], ok: bool, error: str):
    if not _notification_logs_available():
        return
    try:
        NotificationLog.objects.create(
            org_id=store.org_id,
            store_id=store.id,
            channel="email",
            destination=",".join(recipients) if recipients else None,
            provider="edge_status",
            status="sent" if ok else "failed",
            provider_message_id=alert_type,
            error=error or None,
            sent_at=timezone.now(),
        )
    except Exception:
        pass


def _get_active_cameras(store_id) -> List[Camera]:
    try:
        return list(
            Camera.objects.filter(store_id=store_id, active=True).order_by("name")
        )
    except FieldError:
        return list(Camera.objects.filter(store_id=store_id).order_by("name"))


class Command(BaseCommand):
    help = "Emite alertas de saúde do edge (tick único; agendar externamente)."

    def handle(self, *args, **options):
        try:
            stores = Store.objects.filter(status__in=["active", "trial"]).order_by("name")
        except Exception:
            stores = Store.objects.all().order_by("name")

        recipients = _get_recipients()

        for store in stores:
            cameras = _get_active_cameras(store.id)
            cameras_total = 0
            cameras_online = 0
            cameras_degraded = 0
            cameras_offline = 0
            cameras_unknown = 0
            camera_age_seconds = []
            offline_cameras = []

            for cam in cameras:
                cameras_total += 1
                last_log = _get_latest_camera_health(cam.id)
                last_ts = None
                if last_log is not None:
                    last_ts = getattr(last_log, "checked_at", None) or getattr(
                        last_log, "created_at", None
                    )

                cam_status, cam_age_seconds, cam_reason = classify_age(last_ts)

                if cam_status == "online":
                    cameras_online += 1
                elif cam_status == "degraded":
                    cameras_degraded += 1
                elif cam_status == "offline":
                    cameras_offline += 1
                else:
                    cameras_unknown += 1

                if cam_age_seconds is not None:
                    camera_age_seconds.append(cam_age_seconds)

                if (
                    cam_status == "offline"
                    and cam_age_seconds is not None
                    and cam_age_seconds >= ALERT_THRESHOLD_SECONDS
                ):
                    offline_cameras.append((cam, cam_age_seconds, cam_reason))

            last_heartbeat = _get_last_heartbeat(store.id)
            hb_status, hb_age_seconds, hb_reason = classify_age(last_heartbeat)

            if cameras_total == 0:
                store_status = "unknown"
                store_status_reason = "no_heartbeat"
            elif cameras_online >= 1:
                if cameras_online < cameras_total:
                    store_status = "degraded"
                    store_status_reason = "partial_camera_coverage"
                else:
                    store_status = "online"
                    store_status_reason = "has_online_camera"
            else:
                if last_heartbeat:
                    store_status = hb_status
                    store_status_reason = hb_reason
                else:
                    store_status = "unknown"
                    store_status_reason = "no_heartbeat"

            if last_heartbeat:
                store_status_age_seconds = hb_age_seconds
            else:
                store_status_age_seconds = (
                    min(camera_age_seconds) if camera_age_seconds else None
                )

            if (
                store_status in ("degraded", "offline")
                and store_status_age_seconds is not None
                and store_status_age_seconds >= ALERT_THRESHOLD_SECONDS
            ):
                alert_type = f"store_{store_status}"
                if _cooldown_ok(store.id, alert_type):
                    subject = f"[Edge] Store {store.name} {store_status}"
                    body = (
                        f"Store: {store.name} ({store.id})\n"
                        f"Status: {store_status}\n"
                        f"Reason: {store_status_reason}\n"
                        f"Age (s): {store_status_age_seconds}\n"
                        f"Last heartbeat: {last_heartbeat.isoformat() if last_heartbeat else None}\n"
                        f"Cameras: total={cameras_total} online={cameras_online} "
                        f"degraded={cameras_degraded} offline={cameras_offline} unknown={cameras_unknown}\n"
                    )
                    ok, err = _send_email(subject, body, recipients)
                    _log_notification(store, alert_type, recipients, ok, err)
                    if not ok:
                        self.stdout.write(f"[WARN] email failed for {alert_type}: {err}")

            if offline_cameras:
                alert_type = "camera_offline"
                if _cooldown_ok(store.id, alert_type):
                    subject = f"[Edge] Cameras offline - {store.name}"
                    lines = []
                    for cam, age_s, reason in offline_cameras:
                        lines.append(
                            f"- {cam.name} ({cam.id}) age_s={age_s} reason={reason}"

<<truncated>>
```

### apps/core/management/commands/seed_demo.py

```
import uuid

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.core import models


class Command(BaseCommand):
    help = "Seed demo data for an organization, store, zones, and camera."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--org-name", dest="org_name")
        parser.add_argument("--store-name", dest="store_name")
        parser.add_argument("--store-code", dest="store_code")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        username = options["username"]
        org_name = options.get("org_name") or f"Demo {username}"
        store_name = options.get("store_name") or f"Store {username}"
        store_code = options.get("store_code")
        dry_run = options["dry_run"]

        now = timezone.now()
        user_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"dalevision:user:{username}")

        if dry_run:
            self.stdout.write("dry-run: no changes will be committed")

        def log_result(kind, created, detail):
            if created:
                prefix = "[dry-run] would create" if dry_run else "created"
            else:
                prefix = "found"
            self.stdout.write(f"{prefix} {kind}: {detail}")

        with transaction.atomic():
            org, org_created = models.Organization.objects.get_or_create(
                name=org_name,
                defaults={"created_at": now},
            )
            log_result("Organization", org_created, f"name={org.name} id={org.id}")

            member, member_created = models.OrgMember.objects.get_or_create(
                org=org,
                user_id=user_uuid,
                defaults={"role": "owner", "created_at": now},
            )
            log_result(
                "OrgMember",
                member_created,
                f"org_id={org.id} user_id={user_uuid} id={member.id}",
            )

            store_lookup = {"org": org}
            if store_code:
                store_lookup["code"] = store_code
            else:
                store_lookup["name"] = store_name

            store, store_created = models.Store.objects.get_or_create(
                **store_lookup,
                defaults={
                    "name": store_name,
                    "code": store_code,
                    "status": "trial",
                    "trial_started_at": now,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            log_result("Store", store_created, f"name={store.name} id={store.id}")

            entrance_zone, entrance_created = models.StoreZone.objects.get_or_create(
                store=store,
                name="Entrada",
                defaults={
                    "zone_type": "entrance",
                    "is_critical": True,
                    "created_at": now,
                },
            )
            log_result(
                "StoreZone",
                entrance_created,
                f"store_id={store.id} name=Entrada id={entrance_zone.id}",
            )

            checkout_zone, checkout_created = models.StoreZone.objects.get_or_create(
                store=store,
                name="Checkout 1",
                defaults={
                    "zone_type": "checkout",
                    "is_critical": True,
                    "created_at": now,
                },
            )
            log_result(
                "StoreZone",
                checkout_created,
                f"store_id={store.id} name=Checkout 1 id={checkout_zone.id}",
            )

            camera, camera_created = models.Camera.objects.get_or_create(
                store=store,
                name="Cam Entrada",
                defaults={
                    "zone": entrance_zone,
                    "onvif": True,
                    "status": "unknown",
                    "created_at": now,
                    "updated_at": now,
                },
            )
            log_result(
                "Camera",
                camera_created,
                f"store_id={store.id} zone_id={entrance_zone.id} name=Cam Entrada id={camera.id}",
            )

            if dry_run:
                transaction.set_rollback(True)
```

### apps/core/migrations/0001_initial.py

```
# Generated by Django 4.2.11 on 2026-01-13 03:30

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AppConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=100, unique=True)),
                ('value', models.TextField()),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
```

### apps/core/migrations/0002_alertrule_auditlog_billingcustomer_camera_and_more.py

```
# Generated by Django 4.2.11 on 2026-01-29 00:03

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AlertRule',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('type', models.TextField()),
                ('severity', models.CharField(choices=[('critical', 'critical'), ('warning', 'warning'), ('info', 'info')], default='warning', max_length=20)),
                ('active', models.BooleanField(default=True)),
                ('threshold', models.JSONField(default=dict)),
                ('cooldown_minutes', models.IntegerField(default=15)),
                ('channels', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField()),
                ('updated_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'alert_rules',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('actor_user_id', models.UUIDField(blank=True, null=True)),
                ('action', models.TextField()),
                ('payload', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'audit_logs',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='BillingCustomer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('stripe_customer_id', models.TextField()),
                ('created_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'billing_customers',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Camera',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('name', models.TextField()),
                ('brand', models.TextField(blank=True, null=True)),
                ('model', models.TextField(blank=True, null=True)),
                ('ip', models.TextField(blank=True, null=True)),
                ('onvif', models.BooleanField(default=False)),
                ('rtsp_url', models.TextField(blank=True, null=True)),
                ('username', models.TextField(blank=True, null=True)),
                ('password', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('online', 'online'), ('offline', 'offline'), ('unknown', 'unknown'), ('error', 'error')], default='unknown', max_length=20)),
                ('last_seen_at', models.DateTimeField(blank=True, null=True)),
                ('last_snapshot_url', models.TextField(blank=True, null=True)),
                ('last_error', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField()),
                ('updated_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'cameras',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='CameraHealthLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('checked_at', models.DateTimeField()),
                ('status', models.CharField(choices=[('online', 'online'), ('offline', 'offline'), ('unknown', 'unknown'), ('error', 'error')], max_length=20)),
                ('latency_ms', models.IntegerField(blank=True, null=True)),
                ('snapshot_url', models.TextField(blank=True, null=True)),
                ('error', models.TextField(blank=True, null=True)),
            ],
            options={
                'db_table': 'camera_health_logs',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='DemoLead',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('org_name', models.TextField(blank=True, null=True)),
                ('contact_name', models.TextField()),
                ('email', models.TextField()),
                ('whatsapp', models.TextField(blank=True, null=True)),
                ('best_time', models.TextField(blank=True, null=True)),
                ('segment', models.TextField(blank=True, null=True)),
                ('stores_count', models.IntegerField(blank=True, null=True)),
                ('city', models.TextField(blank=True, null=True)),
                ('state', models.TextField(blank=True, null=True)),
                ('camera_brands', models.TextField(blank=True, null=True)),
                ('has_rtsp', models.BooleanField(blank=True, null=True)),
                ('status', models.CharField(choices=[('new', 'new'), ('contacted', 'contacted'), ('scheduled', 'scheduled'), ('no_show', 'no_show'), ('trial_active', 'trial_active'), ('converted', 'converted'), ('lost', 'lost')], default='new', max_length=20)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField()),
                ('source', models.TextField(blank=True, null=True)),
                ('utm', models.JSONField(default=dict)),
                ('metadata', models.JSONField(default=dict)),
                ('operation_type', models.TextField(blank=True, null=True)),
                ('stores_range', models.TextField(blank=True, null=True)),
                ('cameras_range', models.TextField(blank=True, null=True)),
                ('primary_goal', models.TextField(blank=True, null=True)),
                ('pilot_city', models.TextField(blank=True, null=True)),
                ('pilot_state', models.TextField(blank=True, null=True)),
                ('calendly_event_uri', models.TextField(blank=True, null=True)),
                ('calendly_invitee_uri', models.TextField(blank=True, null=True)),
                ('scheduled_at', models.DateTimeField(blank=True, null=True)),
                ('timezone', models.TextField(blank=True, null=True)),
                ('camera_brands_json', models.JSONField(default=list)),
                ('qualified_score', models.IntegerField(default=0)),
                ('primary_goals', models.JSONField(default=list)),
            ],
            options={
                'db_table': 'demo_leads',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='DetectionEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('type', models.TextField()),
                ('severity', models.CharField(choices=[('critical', 'critical'), ('warning', 'warning'), ('info', 'info')], max_length=20)),
                ('status', models.CharField(choices=[('open', 'open'), ('resolved', 'resolved'), ('ignored', 'ignored')], default='open', max_length=20)),
                ('title', models.TextField()),
                ('description', models.TextField(blank=True, null=True)),
                ('occurred_at', models.DateTimeField()),
                ('metadata', models.JSONField(default=dict)),
                ('suppressed_by_rule_id', models.UUIDField(blank=True, null=True)),
                ('suppressed_reason', models.TextField(blank=True, null=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('resolved_by_user_id', models.UUIDField(blank=True, null=True)),
                ('created_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'detection_events',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Employee',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('full_name', models.TextField()),
                ('email', models.TextField(blank=True, null=True)),
                ('role', models.CharField(choices=[('manager', 'manager'), ('cashier', 'cashier'), ('seller', 'seller'), ('security', 'security'), ('stock', 'stock'), ('other', 'other')], default='other', max_length=20)),
                ('external_id', models.TextField(blank=True, null=True)),
                ('active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'employees',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='EventMedia',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('media_type', models.TextField()),
                ('url', models.TextField()),
                ('starts_at', models.DateTimeField(blank=True, null=True)),
                ('ends_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'event_media',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='JourneyEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('event_name', models.TextField()),
                ('payload', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'journey_events',
                'abstract': False,
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='NotificationLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('channel', models.TextField()),
                ('destination', models.TextField(blank=True, null=True)),
                ('provider', models.TextField(blank=True, null=True)),
                ('status', models.TextField()),

<<truncated>>
```

### apps/core/migrations/0003_storemanager.py

```
# Generated by Django 4.2.11 on 2026-02-01 22:56

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_alertrule_auditlog_billingcustomer_camera_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='StoreManager',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('owner', 'owner'), ('admin', 'admin'), ('manager', 'manager'), ('viewer', 'viewer')], default='viewer', max_length=20)),
                ('created_at', models.DateTimeField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'store_managers',
                'managed': False,
            },
        ),
    ]
```

### apps/core/migrations/__init__.py

```

```

### apps/core/models.py

```
# apps/core/models.py
from django.conf import settings
from django.utils import timezone
from django.db import models
import uuid

# -------------------------
# Helpers
# -------------------------
class UnmanagedModel(models.Model):
    class Meta:
        abstract = True
        managed = False


# -------------------------
# ENUM-like choices (compatível com Postgres enum)
# -------------------------
ORG_ROLE = (
    ("owner", "owner"),
    ("admin", "admin"),
    ("manager", "manager"),
    ("viewer", "viewer"),
)

STORE_STATUS = (
    ("active", "active"),
    ("inactive", "inactive"),
    ("trial", "trial"),
    ("blocked", "blocked"),
)

CAMERA_STATUS = (
    ("online", "online"),
    ("offline", "offline"),
    ("unknown", "unknown"),
    ("error", "error"),
)

ALERT_SEVERITY = (
    ("critical", "critical"),
    ("warning", "warning"),
    ("info", "info"),
)

EVENT_STATUS = (
    ("open", "open"),
    ("resolved", "resolved"),
    ("ignored", "ignored"),
)

EMPLOYEE_ROLE = (
    ("manager", "manager"),
    ("cashier", "cashier"),
    ("seller", "seller"),
    ("security", "security"),
    ("stock", "stock"),
    ("other", "other"),
)

LEAD_STATUS = (
    ("new", "new"),
    ("contacted", "contacted"),
    ("scheduled", "scheduled"),
    ("no_show", "no_show"),
    ("trial_active", "trial_active"),
    ("converted", "converted"),
    ("lost", "lost"),
)

SUBSCRIPTION_STATUS = (
    ("trialing", "trialing"),
    ("active", "active"),
    ("past_due", "past_due"),
    ("canceled", "canceled"),
    ("incomplete", "incomplete"),
    ("blocked", "blocked"),
)


# -------------------------
# Organization / Membership
# -------------------------
class Organization(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.TextField()
    segment = models.TextField(null=True, blank=True)
    country = models.TextField(default="BR")
    timezone = models.TextField(default="America/Sao_Paulo")
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "organizations"


class OrgMember(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id")
    user_id = models.UUIDField()  # uuid do User Django
    role = models.CharField(max_length=20, choices=ORG_ROLE, default="viewer")
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "org_members"
        unique_together = (("org", "user_id"),)


# -------------------------
# Stores / Zones
# -------------------------
class Store(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    org = models.ForeignKey(Organization, on_delete=models.DO_NOTHING, db_column="org_id")
    code = models.TextField(null=True, blank=True)
    name = models.TextField()
    mall_name = models.TextField(null=True, blank=True)
    city = models.TextField(null=True, blank=True)
    state = models.TextField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STORE_STATUS, default="trial")
    trial_started_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    blocked_reason = models.TextField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta(UnmanagedModel.Meta):
        db_table = "stores"


class StoreZone(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    name = models.TextField()
    zone_type = models.TextField()
    is_critical = models.BooleanField(default=False)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "store_zones"
        unique_together = (("store", "name"),)


# -------------------------
# Cameras
# -------------------------
class Camera(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    zone = models.ForeignKey(StoreZone, on_delete=models.DO_NOTHING, db_column="zone_id", null=True, blank=True)

    name = models.TextField()
    external_id = models.TextField(null=True, blank=True)
    brand = models.TextField(null=True, blank=True)
    model = models.TextField(null=True, blank=True)
    ip = models.TextField(null=True, blank=True)
    onvif = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    rtsp_url = models.TextField(null=True, blank=True)
    username = models.TextField(null=True, blank=True)
    password = models.TextField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=CAMERA_STATUS, default="unknown")
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_snapshot_url = models.TextField(null=True, blank=True)
    last_error = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "cameras"


class CameraHealthLog(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    camera = models.ForeignKey(
        "Camera",
        db_column="camera_id",
        on_delete=models.DO_NOTHING,
        related_name="health_logs",
    )
    checked_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=CAMERA_STATUS)
    latency_ms = models.IntegerField(null=True, blank=True)
    snapshot_url = models.TextField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)

    class Meta(UnmanagedModel.Meta):
        db_table = "camera_health_logs"


# -------------------------
# Employees / Shifts / Clock
# -------------------------
class Employee(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    full_name = models.TextField()
    email = models.TextField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=EMPLOYEE_ROLE, default="other")
    external_id = models.TextField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField()

    class Meta(UnmanagedModel.Meta):
        db_table = "employees"


class Shift(UnmanagedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    store = models.ForeignKey(Store, on_delete=models.DO_NOTHING, db_column="store_id")
    employee = models.ForeignKey(Employee, on_delete=models.DO_NOTHING, db_column="employee_id")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    planned = models.BooleanField(default=True)
    created_at = models.DateTimeField()

<<truncated>>
```

### apps/core/tests.py

```
from django.test import TestCase

# Create your tests here.
```

### apps/core/views.py

```
import requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
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
```

### apps/edge/__init__.py

```

```

### apps/edge/admin.py

```
from django.contrib import admin

# Register your models here.
```

### apps/edge/apps.py

```
from django.apps import AppConfig


class EdgeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.edge"
```

### apps/edge/migrations/0001_initial.py

```
# Generated by Django 4.2.11 on 2026-01-28 21:42

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='EdgeEventReceipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('receipt_id', models.CharField(max_length=128, unique=True)),
                ('event_name', models.CharField(max_length=64)),
                ('source', models.CharField(default='edge', max_length=32)),
                ('store_id', models.CharField(blank=True, max_length=64, null=True)),
                ('payload', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
```

### apps/edge/migrations/0002_edgetoken.py

```
# Generated by Django 4.2.11 on 2026-02-01

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("edge", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="EdgeToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("store_id", models.UUIDField(db_index=True)),
                ("token_hash", models.CharField(max_length=128, unique=True)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
            ],
        ),
    ]
```

### apps/edge/migrations/__init__.py

```

```

### apps/edge/models.py

```
from django.db import models
from django.utils import timezone

class EdgeEventReceipt(models.Model):
    receipt_id = models.CharField(max_length=128, unique=True)
    event_name = models.CharField(max_length=64)
    source = models.CharField(max_length=32, default="edge")
    store_id = models.CharField(max_length=64, null=True, blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_name} {self.receipt_id[:10]}"


class EdgeToken(models.Model):
    store_id = models.UUIDField(db_index=True)
    token_hash = models.CharField(max_length=128, unique=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.store_id} ({'active' if self.active else 'inactive'})"
```

### apps/edge/permissions.py

```
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
```

### apps/edge/serializers.py

```
from rest_framework import serializers


class EdgeEventSerializer(serializers.Serializer):
    event_name = serializers.CharField()
    ts = serializers.CharField(required=False)
    source = serializers.CharField(required=False)
    data = serializers.DictField(required=False)
    meta = serializers.DictField(required=False)
    receipt_id = serializers.CharField(required=False, allow_blank=True)

    event_version = serializers.IntegerField(required=False)
    event_id = serializers.CharField(required=False, allow_null=True)
    org_id = serializers.CharField(required=False, allow_null=True)
```

### apps/edge/tests.py

```
import uuid
from django.test import TestCase
from django.conf import settings
from django.db import connection
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from knox.models import AuthToken
from apps.core.models import Organization, OrgMember, Store


class EdgeEventsAuthTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        if connection.vendor != "postgresql":
            return
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.user_id_map (
                    user_id uuid PRIMARY KEY,
                    django_user_id int NOT NULL UNIQUE,
                    email text,
                    created_at timestamptz DEFAULT now()
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.organizations (
                    id uuid PRIMARY KEY,
                    name text,
                    segment text,
                    country text,
                    timezone text,
                    created_at timestamptz
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.org_members (
                    id uuid PRIMARY KEY,
                    org_id uuid,
                    user_id uuid,
                    role text,
                    created_at timestamptz
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.stores (
                    id uuid PRIMARY KEY,
                    org_id uuid,
                    name text,
                    status text,
                    created_at timestamptz,
                    updated_at timestamptz
                );
                """
            )

    def setUp(self):
        self.client = APIClient()

    def _skip_if_not_pg(self):
        if connection.vendor != "postgresql":
            self.skipTest("Requires PostgreSQL for unmanaged models.")

    def test_edge_token_allows_event(self):
        self._skip_if_not_pg()
        settings.EDGE_SHARED_TOKEN = "edge-shared"
        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-1",
            "data": {"store_id": str(uuid.uuid4())},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_X_EDGE_TOKEN="edge-shared",
        )
        self.assertIn(resp.status_code, (200, 201))
        self.assertTrue(resp.data.get("ok"))

    def test_user_token_allows_event_with_access(self):
        self._skip_if_not_pg()
        User = get_user_model()
        user = User.objects.create_user(username="edgeuser", password="pass123", email="edge@x.com")
        token = AuthToken.objects.create(user)[1]

        org = Organization.objects.create(
            id=uuid.uuid4(),
            name="Org",
            segment=None,
            country="BR",
            timezone="America/Sao_Paulo",
            created_at="2026-01-01T00:00:00Z",
        )

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO public.user_id_map (user_id, django_user_id, email) "
                "VALUES (gen_random_uuid(), %s, %s) RETURNING user_id",
                [user.id, user.email],
            )
            user_uuid = cursor.fetchone()[0]

        OrgMember.objects.create(
            id=uuid.uuid4(),
            org=org,
            user_id=user_uuid,
            role="owner",
            created_at="2026-01-01T00:00:00Z",
        )

        store = Store.objects.create(
            id=uuid.uuid4(),
            org=org,
            name="Store",
            status="active",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )

        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-2",
            "data": {"store_id": str(store.id)},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_AUTHORIZATION=f"Token {token}",
        )
        self.assertIn(resp.status_code, (200, 201))
        self.assertTrue(resp.data.get("ok"))
```

### apps/edge/urls.py

```
from django.urls import path
from .views import EdgeEventsIngestView

urlpatterns = [
    path("events/", EdgeEventsIngestView.as_view(), name="edge-events"),
]
```

### apps/edge/views.py

```
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

<<truncated>>
```

### apps/stores/__init__.py

```

```

### apps/stores/admin.py

```
# apps/stores/admin.py
"""
Admin do domínio (Store) vive em apps.core.admin.
Este app (stores) é apenas API/serviços.
"""
```

### apps/stores/apps.py

```
from django.apps import AppConfig


class StoresConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.stores'
    verbose_name = 'Stores'
```

### apps/stores/migrations/__init__.py

```

```

### apps/stores/models.py

```
# apps/stores/models.py
"""
Este app não define models.
Fonte única: apps.core.models (UnmanagedModel, espelha Supabase).
"""
```

### apps/stores/serializers.py

```
# apps/stores/serializers.py
from rest_framework import serializers
from apps.core.models import Store

class StoreSerializer(serializers.ModelSerializer):
    org_id = serializers.UUIDField(write_only=True, required=False)

    def validate(self, attrs):
        org_id = attrs.pop("org_id", None)
        if org_id is not None and "org" not in attrs:
            attrs["org"] = org_id
        return attrs

    class Meta:
        model = Store
        fields = [
            "id",
            "org",
            "org_id",
            "code",
            "name",
            "mall_name",
            "city",
            "state",
            "address",
            "status",
            "trial_started_at",
            "trial_ends_at",
            "blocked_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "org": {"required": False, "allow_null": True},
        }
```

### apps/stores/tests.py

```
from django.test import TestCase

# Create your tests here.
```

### apps/stores/urls.py

```
# apps/stores/urls.py (crie se não existe)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreViewSet
from .views_edge_status import StoreEdgeStatusView

router = DefaultRouter()
router.register(r'stores', StoreViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path("stores/<uuid:store_id>/edge-status/", StoreEdgeStatusView.as_view(), name="store-edge-status"),
]
```

### apps/stores/views.py

```
# apps/stores/views.py 
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
from apps.core.models import Store, OrgMember, Organization, Camera
from apps.edge.models import EdgeToken
import hashlib
import secrets
import uuid
from .serializers import StoreSerializer

def ensure_user_uuid(user):
    """
    Map Django auth_user.id -> public.user_id_map.user_uuid, creating if missing.
    """
    if not user or not getattr(user, "id", None):
        raise PermissionDenied("Usuário não autenticado.")
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_uuid FROM public.user_id_map WHERE django_user_id = %s",
            [user.id],
        )
        row = cursor.fetchone()
        if row and row[0]:
            return row[0]

        cursor.execute(
            "INSERT INTO public.user_id_map (user_id, django_user_id, email, created_at) "
            "VALUES (gen_random_uuid(), %s, %s, now()) RETURNING user_id",
            [user.id, getattr(user, "email", None)],
        )
        return cursor.fetchone()[0]


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
        Retorna um token do edge para a store (gera e sobrescreve o hash).
        """
        store = self.get_object()
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        EdgeToken.objects.update_or_create(
            store_id=store.id,
            defaults={
                "token_hash": token_hash,
                "active": True,
                "created_at": timezone.now(),
            },
        )
        return Response({
            "store_id": str(store.id),
            "token": raw_token,
        })

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
            serializer.save(org_id=requested_org_id, created_at=now, updated_at=now)
            return

        org_ids = get_user_org_ids(user)
        if len(org_ids) == 1:
            serializer.save(org_id=org_ids[0], created_at=now, updated_at=now)
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
            serializer.save(org=org, created_at=now, updated_at=now)
        except (ProgrammingError, OperationalError) as exc:
            print(f"[RBAC] falha ao criar org padrão: {exc}")
            raise ValidationError("Não foi possível criar organização padrão.")

<<truncated>>
```

### apps/stores/views_edge_status.py

```
from django.core.exceptions import FieldError
from django.db.models import Max
from django.db import connection
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Camera, CameraHealthLog, Store, OrgMember

ONLINE_SEC = 120
DEGRADED_SEC = 300
_CAMERA_ACTIVE_COLUMN_EXISTS = None


def _user_has_store_access(user, store_id) -> bool:
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    store_row = Store.objects.filter(id=store_id).values("org_id").first()
    if not store_row:
        return False
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_uuid FROM public.user_id_map WHERE django_user_id = %s",
            [user.id],
        )
        row = cursor.fetchone()
        if row and row[0]:
            user_uuid = row[0]
        else:
            cursor.execute(
                "INSERT INTO public.user_id_map (django_user_id) VALUES (%s) RETURNING user_uuid",
                [user.id],
            )
            user_uuid = cursor.fetchone()[0]
    return OrgMember.objects.filter(
        org_id=store_row["org_id"],
        user_id=user_uuid,
    ).exists()


def classify_age(dt):
    if not dt:
        return ("unknown", None, "no_heartbeat")
    age = (timezone.now() - dt).total_seconds()
    if age <= ONLINE_SEC:
        return ("online", int(age), "recent_heartbeat")
    if age <= DEGRADED_SEC:
        return ("degraded", int(age), "stale_heartbeat")
    return ("offline", int(age), "heartbeat_expired")


def _camera_active_column_exists():
    global _CAMERA_ACTIVE_COLUMN_EXISTS
    if _CAMERA_ACTIVE_COLUMN_EXISTS is not None:
        return _CAMERA_ACTIVE_COLUMN_EXISTS
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "cameras")
        _CAMERA_ACTIVE_COLUMN_EXISTS = any(col.name == "active" for col in columns)
    except Exception:
        _CAMERA_ACTIVE_COLUMN_EXISTS = False
    return _CAMERA_ACTIVE_COLUMN_EXISTS


def _filter_active_health_qs(qs):
    if not _camera_active_column_exists():
        return qs
    try:
        return qs.filter(camera__active=True)
    except FieldError:
        return qs


def _get_active_camera_ids(store_id):
    try:
        return list(
            Camera.objects.filter(store_id=store_id, active=True)
            .values_list("id", flat=True)
        )
    except FieldError:
        return list(
            Camera.objects.filter(store_id=store_id)
            .values_list("id", flat=True)
        )


def _get_last_heartbeat(store_id):
    camera_ids = _get_active_camera_ids(store_id)
    if not camera_ids:
        return None

    try:
        last_ts = (
            CameraHealthLog.objects
            .filter(camera_id__in=camera_ids)
            .aggregate(last_ts=Max("checked_at"))
            .get("last_ts")
        )
    except FieldError:
        last_ts = None

    if last_ts:
        return last_ts

    try:
        return (
            CameraHealthLog.objects
            .filter(camera_id__in=camera_ids)
            .aggregate(last_ts=Max("created_at"))
            .get("last_ts")
        )
    except FieldError:
        try:
            qs = CameraHealthLog.objects.filter(camera__store_id=store_id)
            qs = _filter_active_health_qs(qs)
            last_ts = qs.aggregate(last_ts=Max("created_at")).get("last_ts")
        except FieldError:
            last_ts = None
        return last_ts


def _get_latest_camera_health(camera_id):
    try:
        log = (
            CameraHealthLog.objects
            .filter(camera_id=camera_id)
            .order_by("-checked_at")
            .first()
        )
    except FieldError:
        log = None

    if log is not None:
        return log

    try:
        return (
            CameraHealthLog.objects
            .filter(camera_id=camera_id)
            .order_by("-created_at")
            .first()
        )
    except FieldError:
        return None


def _get_latest_error(store_id):
    try:
        camera_ids = _get_active_camera_ids(store_id)
        if not camera_ids:
            return None
        qs = CameraHealthLog.objects.filter(camera_id__in=camera_ids, error__isnull=False)
        last_error_row = (
            qs.exclude(error="")
            .order_by("-checked_at")
            .values("error")
            .first()
        )
        if last_error_row:
            return last_error_row["error"]
    except FieldError:
        pass

    try:
        camera_ids = _get_active_camera_ids(store_id)
        if not camera_ids:
            return None
        qs = CameraHealthLog.objects.filter(camera_id__in=camera_ids, error__isnull=False)
        last_error_row = (
            qs.exclude(error="")
            .order_by("-created_at")
            .values("error")
            .first()
        )
        if last_error_row:
            return last_error_row["error"]
    except FieldError:
        try:
            qs = CameraHealthLog.objects.filter(camera__store_id=store_id, error__isnull=False)
            qs = _filter_active_health_qs(qs)
            last_error_row = (
                qs.exclude(error="")
                .order_by("-created_at")
                .values("error")
                .first()
            )
            if last_error_row:
                return last_error_row["error"]
        except FieldError:
            pass

    return None


class StoreEdgeStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store = get_object_or_404(Store, id=store_id)

        if not _user_has_store_access(request.user, store_id):
            return Response({"detail": "Você não tem acesso a esta store."}, status=403)

        try:
            cameras = Camera.objects.filter(store_id=store_id, active=True).order_by("name")
        except FieldError:
            cameras = Camera.objects.filter(store_id=store_id).order_by("name")
        cameras_out = []
        cameras_total = 0
        cameras_online = 0
        cameras_degraded = 0
        cameras_offline = 0
        cameras_unknown = 0
        camera_age_seconds = []
        for cam in cameras:
            cameras_total += 1
            last_log = _get_latest_camera_health(cam.id)
            last_ts = None

<<truncated>>
```

### backend/__init__.py

```

```

### backend/asgi.py

```
"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_asgi_application()
```

### backend/settings.py

```
# backend/settings.py
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
# Carrega variáveis do .env
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-change-me-in-production!')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ⭐ APPLICATION DEFINITION - APENAS ESSENCIAIS INICIALMENTE
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',      # ⭐ NÃO CRIAR 'apps.auth' - ESTE É O OFICIAL
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',
    'knox',
    'django_filters',
    'drf_yasg',
    
    # ⭐ LOCAL APPS - VAMOS CRIAR AGORA
    'apps.accounts',
    'apps.core',
    'apps.stores',
    'apps.cameras', 
    'apps.analytics',
    'apps.alerts',
    'apps.billing',
    "apps.edge",
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# ⭐ DATABASE - Supabase Postgres (prod e dev)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'postgres'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', ''),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': os.getenv('DB_SSLMODE', 'require'),
        }
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ⭐ REST FRAMEWORK CONFIG
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('knox.auth.TokenAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticatedOrReadOnly',),
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# ⭐ CORS CONFIG
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
# ⭐ KNOX CONFIG
REST_KNOX = {
    'TOKEN_TTL': timedelta(days=30),
    'AUTO_REFRESH': True,
}

# ⭐ SUPABASE CONFIG (SEUS DADOS)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
N8N_EVENTS_WEBHOOK = os.getenv("N8N_EVENTS_WEBHOOK")
# ⭐ WHITENOISE (para arquivos estáticos)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

EDGE_SERVICE_USERNAME = os.getenv("EDGE_SERVICE_USERNAME", "edge-agent")
EDGE_AGENT_TOKEN = os.getenv("EDGE_AGENT_TOKEN", "")
EDGE_SHARED_TOKEN = os.getenv("EDGE_SHARED_TOKEN", "")
```

### backend/urls.py

```
# backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

def home(request):
    return JsonResponse({
        "app": "Dale Vision IA",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/swagger/",
        "endpoints": {
            "register": "/api/accounts/register/",
            "login": "/api/accounts/login/",
            "logout": "/api/accounts/logout/",
            "stores": "/api/v1/stores/",
            "edge_status": "/api/v1/stores/{store_uuid}/edge-status/",
            "alerts": "/api/alerts/",
            "alerts_v1": "/api/v1/alerts/",
        }
    })

schema_view = get_schema_view(
    openapi.Info(
        title="Dale Vision API",
        default_version="v1",
        description="API de Visão Computacional para Varejo",
        contact=openapi.Contact(email="dev@dalevision.ai"),
        license=openapi.License(name="Proprietary"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path("", home),
    path("admin/", admin.site.urls),

    path("swagger/", schema_view.with_ui("swagger", cache_timeout=0), name="swagger-ui"),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="redoc"),

    # ✅ Accounts centralizado
    path("api/accounts/", include("apps.accounts.urls")),

    # ✅ Core (demo lead etc) — se você for colocar aqui depois
    # path("api/core/", include("apps.core.urls")),

    # ✅ Stores
    path("api/v1/", include("apps.stores.urls")),

    # ✅ Alerts (demo lead + rules + ingest/event)
    path("api/alerts/", include("apps.alerts.urls")),
    path("api/v1/alerts/", include("apps.alerts.urls")),
    path("api/cameras/", include("apps.cameras.urls")),

    path("health/", lambda r: JsonResponse({"status": "healthy", "service": "dale-vision-api"})),
    path("api/edge/", include("apps.edge.urls")),
]
```

### backend/wsgi.py

```
"""
WSGI config for backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_wsgi_application()
```

### docs/SNAPSHOT_CONTEXT.json

```
{
  "generated_at": "2026-02-05 20:30:10",
  "root": "C:\\workspace\\dale-vision",
  "include_dirs": [
    "backend",
    "apps",
    "frontend",
    "edge-agent",
    "scripts",
    "docs"
  ],
  "limits": {
    "MAX_TREE_DEPTH": 5,
    "MAX_FILES": 220,
    "MAX_FILE_BYTES": 200000,
    "MAX_LINES_PER_FILE": 220,
    "MAX_TOTAL_CHARS": 280000
  },
  "ignored": {
    "IGNORE_DIR_NAMES": [
      ".git",
      ".mypy_cache",
      ".next",
      ".pytest_cache",
      ".turbo",
      ".venv",
      "__pycache__",
      "build",
      "dist",
      "node_modules",
      "runs",
      "venv"
    ],
    "IGNORE_FILE_EXTS": [
      ".7z",
      ".avi",
      ".db",
      ".gif",
      ".gz",
      ".jpeg",
      ".jpg",
      ".mkv",
      ".mov",
      ".mp4",
      ".onnx",
      ".pdf",
      ".png",
      ".pt",
      ".sqlite",
      ".sqlite3",
      ".tar",
      ".webp",
      ".zip"
    ]
  }
}
```

### edge-agent/README_PILOT.md

```
# DALE Vision — Pilot (Edge Agent Setup em 30 minutos)

## Objetivo
Rodar o agente dentro da loja (sem VPN e sem abrir portas) e enviar apenas:
- status (heartbeat)
- métricas agregadas
- alertas

## Pré-requisitos
- Um PC Windows ligado na loja (na mesma rede do NVR/câmeras)
- Acesso às URLs RTSP (ou ONVIF → RTSP)
- Token do Edge (X-EDGE-TOKEN) e Store ID

## Passo a passo (Setup)
1) Clique duas vezes em **01_setup.bat**
2) Vai abrir o navegador em: http://localhost:7860
3) Preencha:
   - Cloud Base URL
   - Store ID
   - Edge Token
   Clique em **Salvar Config**
4) Para cada câmera:
   - cole a URL RTSP
   - clique **Testar (preview)** (deve aparecer a imagem)
   - preencha o nome e clique **Adicionar câmera**
5) ROI (YAML):
   - Digite o camera_id (ex: cam01)
   - Selecione o arquivo YAML de ROI (ex: config/rois/cam01.yaml)
   - Clique **Upload ROI**
6) Clique **Iniciar agente**
   - Você verá: PID + caminho do log (logs/agent.log)

## Logs (para suporte)
Arquivo: **logs/agent.log**

Para ver as últimas linhas:
- Abra PowerShell na pasta edge-agent e rode:
  `Get-Content .\logs\agent.log -Tail 80`

## Se der erro de porta 7860
A porta já está em uso.
Feche o terminal antigo ou mate o processo:
- `netstat -ano | findstr :7860`
- `taskkill /PID <PID> /F`
```

### edge-agent/config/agent.yaml

```
agent:
  agent_id: edge-001
  store_id: b259e974-46f6-4f95-a293-35845946de55
  timezone: America/Sao_Paulo
cloud:
  base_url: http://127.0.0.1:8000
  token: edge-local-123
  timeout_seconds: 8
  send_interval_seconds: 2
  heartbeat_interval_seconds: 15
runtime:
  target_width: 960
  fps_limit: 8
  frame_skip: 2
  buffer_sqlite_path: ./data/edge_queue.db
  max_queue_size: 50000
  log_level: INFO
model:
  yolo_weights_path: ./models/yolov8n.pt
  conf: 0.35
  iou: 0.45
  device: cpu
cameras:
- camera_id: cam01
  name: Balcao
  rtsp_url: ./videos/cam01_balcao.mp4
  roi_config: ./config/rois/cam01.yaml
- camera_id: cam02
  name: Salao
  rtsp_url: ./videos/cam02_salao.mp4
  roi_config: ./config/rois/cam02.yaml
- camera_id: cam03
  name: Entrada
  rtsp_url: ./videos/cam03_entrada.mp4
  roi_config: ./config/rois/cam03.yaml
```

### edge-agent/config/rois/cam01.yaml

```
zones:
  area_atendimento_fila:
  - - 280
    - 199
  - - 93
    - 209
  - - 160
    - 353
  - - 566
    - 355
  - - 707
    - 278
  - - 686
    - 246
  - - 370
    - 324
  ponto_pagamento:
  - - 303
    - 85
  - - 64
    - 104
  - - 88
    - 207
  - - 318
    - 156
  zona_funcionario_caixa:
  - - 337
    - 94
  - - 362
    - 157
  - - 471
    - 160
  - - 461
    - 85
lines: {}
```

### edge-agent/config/rois/cam02.yaml

```
zones:
  area_consumo:
  - - 58
    - 276
  - - 134
    - 151
  - - 353
    - 79
  - - 688
    - 152
  - - 616
    - 356
  - - 107
    - 355
lines: {}
```

### edge-agent/config/rois/cam03.yaml

```
zones: {}
lines:
  linha_entrada_saida:
  - - 682
    - 216
  - - 666
    - 355
```

### edge-agent/src/__init__.py

```

```

### edge-agent/src/agent/__init__.py

```

```

### edge-agent/src/agent/__main__.py

```
from .cli import main


if __name__ == "__main__":
    raise SystemExit(main())
```

### edge-agent/src/agent/cli.py

```
import argparse
import subprocess
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = "./config/agent.yaml"


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m src.agent")
    sub = parser.add_subparsers(dest="command")

    setup_p = sub.add_parser("setup", help="Start the local setup server")
    setup_p.add_argument("--reload", action="store_true", help="Enable auto-reload")

    run_p = sub.add_parser("run", help="Run the agent")
    run_p.add_argument("--config", default=DEFAULT_CONFIG, help="Path to agent.yaml")

    return parser


def main(argv=None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if not args.command:
        parser.print_help()
        return 1

    if args.command == "setup":
        cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "src.agent.setup_server:app",
            "--host",
            "0.0.0.0",
            "--port",
            "7860",
        ]
        if args.reload:
            cmd.append("--reload")
        return subprocess.call(cmd, cwd=BASE_DIR)

    if args.command == "run":
        cmd = [
            sys.executable,
            "-m",
            "src.agent.main",
            "--config",
            args.config,
        ]
        return subprocess.call(cmd, cwd=BASE_DIR)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
```

### edge-agent/src/agent/lifecycle.py

```
import time
from datetime import datetime, timezone
from typing import List

from ..storage.sqlite_queue import SqliteQueue
from ..transport.api_client import ApiClient
from ..vision.aggregations import MetricAggregator
from ..vision.rules import RuleEngine
from ..events.builder import build_envelope
from ..events.receipts import compute_receipt_id


def run_agent(settings):
    """
    Loop principal do Edge Agent (v1):
    - sobe workers de câmera
    - lê frames
    - detecta pessoas (YOLO)
    - update_metrics() por câmera (ROI/checkout/entrada)
    - agrega por minuto (bucket 60s)
    - gera edge_metric_bucket + alert
    - outbox sqlite + flush via ApiClient
    """

    # --- outbox ---
    queue = SqliteQueue(
        path=settings.buffer_sqlite_path
        #max_items=settings.max_queue_size,
    )


    # --- transport ---
    api = ApiClient(
        base_url=settings.cloud_base_url,
        token=settings.cloud_token,
        timeout=settings.cloud_timeout,
    )

    # --- aggregation + rules ---
    aggregator = MetricAggregator(bucket_seconds=60)
    rules = RuleEngine()

    # --- camera workers + detector ---
    from ..camera.rtsp import RtspCameraWorker  # import local
    from ..vision.detector import PersonDetector

    detector = PersonDetector(
        weights_path=settings.yolo_weights_path,
        conf=settings.conf,
        iou=settings.iou,
        device=settings.device,
    )

    workers: List[RtspCameraWorker] = []
    for cam in settings.cameras:
        w = RtspCameraWorker(
            camera_id=cam.camera_id,
            name=cam.name,
            rtsp_url=cam.rtsp_url,
            roi_config_path=cam.roi_config,
            target_width=settings.target_width,
            fps_limit=settings.fps_limit,
            frame_skip=settings.frame_skip,
        )
        w.start()
        workers.append(w)

    last_flush = 0.0
    last_heartbeat = 0.0

    agent_id = settings.agent_id
    store_id = settings.store_id

    while True:
        now = time.time()

        # ========== heartbeat ==========
        if (now - last_heartbeat) >= float(settings.heartbeat_interval_seconds):
            hb_bucket = int(now // float(settings.heartbeat_interval_seconds)) * float(settings.heartbeat_interval_seconds)
            hb_ts = datetime.fromtimestamp(hb_bucket, tz=timezone.utc).isoformat()

            try:
                for w in workers:
                    cam_data = {
                        "store_id": store_id,
                        "agent_id": agent_id,
                        "ts": hb_ts,
                        "camera_id": w.camera_id,
                        "external_id": w.camera_id,
                        "name": w.name,
                        "rtsp_url": getattr(w, "rtsp_url", None),
                        "ok": w.is_ok(),
                    }
                    cam_env = build_envelope(
                        event_name="edge_camera_heartbeat",
                        source="edge",
                        data=cam_data,
                        meta={},
                    )
                    cam_env["receipt_id"] = compute_receipt_id(cam_env)
                    queue.enqueue(cam_env)

                hb = {
                    "agent_id": agent_id,
                    "store_id": store_id,
                    "ts": hb_ts,
                    "cameras": [
                        {
                            "camera_id": w.camera_id,
                            "external_id": w.camera_id,
                            "name": w.name,
                            "rtsp_url": getattr(w, "rtsp_url", None),
                            "ok": w.is_ok(),
                        }
                        for w in workers
                    ],
                }

                env = build_envelope(
                    event_name="edge_heartbeat",
                    source="edge",
                    data=hb,
                    meta={},
                )
                env["receipt_id"] = compute_receipt_id(env)
                queue.enqueue(env)
            except Exception as e:
                print(f"⚠️ heartbeat enqueue failed (ignored): {e}")

            last_heartbeat = now

        # ========== process frames ==========
        for w in workers:
            f = w.try_get_frame()
            if f is None:
                continue

            dets = detector.detect(f.image)
            metrics = w.update_metrics(dets, f.ts)

            aggregator.add_sample(
                camera_id=w.camera_id,
                ts=f.ts,
                metrics=metrics,
            )

            # fecha bucket de 60s quando virar o minuto
            bucket = aggregator.try_close_bucket(camera_id=w.camera_id, ts=f.ts)
            if bucket is not None:
                print(
                    f"✅ bucket closed cam={w.camera_id} ts_bucket={bucket['ts_bucket']} "
                    f"metrics_keys={list(bucket['metrics'].keys())[:8]}"
                )

                data = {
                    "store_id": store_id,
                    "camera_id": w.camera_id,
                    "ts_bucket": bucket["ts_bucket"],
                    "metrics": bucket["metrics"],
                }

                env = build_envelope(
                    event_name="edge_metric_bucket",
                    source="edge",
                    data=data,
                    meta={"agent_id": agent_id},
                )
                env["receipt_id"] = compute_receipt_id(env)
                queue.enqueue(env)
                print(f"📦 enqueued edge_metric_bucket receipt={env['receipt_id'][:10]}...")

                # regras -> alertas
                alerts = rules.evaluate(camera_id=w.camera_id, bucket=bucket)
                for a in alerts:
                    a_data = {
                        "store_id": store_id,
                        "camera_id": w.camera_id,
                        **a,
                    }
                    a_env = build_envelope(
                        event_name="alert",
                        source="edge",
                        data=a_data,
                        meta={"agent_id": agent_id},
                    )
                    a_env["receipt_id"] = compute_receipt_id(a_env)
                    queue.enqueue(a_env)

        # ========== flush outbox ==========
        if (now - last_flush) >= float(settings.send_interval_seconds):
            try:
                r = api.flush_outbox(queue)
                # log mínimo só quando houver algo
                if (r.get("sent", 0) or r.get("failed", 0)):
                    print(f"🌐 flush sent={r.get('sent')} failed={r.get('failed')} last_error={r.get('last_error')}")
            except Exception as e:
                # nunca derruba o agente por causa de rede/backend
                print(f"🌐 flush error (ignored): {e}")
            last_flush = now

        time.sleep(0.01)
```

### edge-agent/src/agent/main.py

```
import argparse

from .settings import load_settings
from .lifecycle import run_agent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="Path to agent.yaml")
    args = parser.parse_args()

    settings = load_settings(args.config)
    run_agent(settings)


if __name__ == "__main__":
    main()
```

### edge-agent/src/agent/settings.py

```
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import yaml
import os


@dataclass
class CameraConfig:
    camera_id: str
    name: str
    rtsp_url: str
    roi_config: str


@dataclass
class Settings:
    agent_id: str
    store_id: str
    timezone: str

    cloud_base_url: str
    cloud_token: str
    cloud_timeout: int
    send_interval_seconds: int
    heartbeat_interval_seconds: int

    target_width: int
    fps_limit: int
    frame_skip: int
    buffer_sqlite_path: str
    max_queue_size: int
    log_level: str

    yolo_weights_path: str
    conf: float
    iou: float
    device: str

    cameras: List[CameraConfig]


def _env_override(d: Dict[str, Any]) -> Dict[str, Any]:
    """
    Permite override via env (útil pra Docker depois).
    Ex: EDGE_CLOUD_BASE_URL, EDGE_CLOUD_TOKEN, etc.
    """
    # mantenha simples no v1; expanda conforme precisar
    base = os.getenv("EDGE_CLOUD_BASE_URL")
    token = os.getenv("EDGE_CLOUD_TOKEN")
    heartbeat = os.getenv("HEARTBEAT_INTERVAL_SECONDS")
    if base:
        d.setdefault("cloud", {})["base_url"] = base
    if token:
        d.setdefault("cloud", {})["token"] = token
    if heartbeat:
        d.setdefault("cloud", {})["heartbeat_interval_seconds"] = int(heartbeat)
    return d


def load_settings(path: str) -> Settings:
    with open(path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    raw = _env_override(raw)

    agent = raw.get("agent", {})
    cloud = raw.get("cloud", {})
    runtime = raw.get("runtime", {})
    model = raw.get("model", {})
    cams = raw.get("cameras", []) or []

    cameras = [
        CameraConfig(
            camera_id=c["camera_id"],
            name=c.get("name", c["camera_id"]),
            rtsp_url=c["rtsp_url"],
            roi_config=c["roi_config"],
        )
        for c in cams
    ]

    return Settings(
        agent_id=agent["agent_id"],
        store_id=agent["store_id"],
        timezone=agent.get("timezone", "America/Sao_Paulo"),

        cloud_base_url=cloud["base_url"].rstrip("/"),
        cloud_token=cloud["token"],
        cloud_timeout=int(cloud.get("timeout_seconds", 8)),
        send_interval_seconds=int(cloud.get("send_interval_seconds", 2)),
        heartbeat_interval_seconds=int(cloud.get("heartbeat_interval_seconds", 30)),

        target_width=int(runtime.get("target_width", 960)),
        fps_limit=int(runtime.get("fps_limit", 8)),
        frame_skip=int(runtime.get("frame_skip", 2)),
        buffer_sqlite_path=str(runtime.get("buffer_sqlite_path", "./data/edge_queue.db")),
        max_queue_size=int(runtime.get("max_queue_size", 50000)),
        log_level=str(runtime.get("log_level", "INFO")),

        yolo_weights_path=str(model.get("yolo_weights_path", "./models/yolov8n.pt")),
        conf=float(model.get("conf", 0.35)),
        iou=float(model.get("iou", 0.45)),
        device=str(model.get("device", "cpu")),

        cameras=cameras,
    )
```

### edge-agent/src/agent/setup_server.py

```
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import cv2
import yaml
import os
import subprocess
import base64
import uuid
import sys
from pathlib import Path
import re
from typing import Dict, Any

APP_PORT = 7860

# BASE_DIR = pasta edge-agent
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
CONFIG_PATH = os.path.join(BASE_DIR, "config", "agent.yaml")

# ROIs no lugar que você já usa hoje: edge-agent/config/rois
ROIS_DIR = os.path.join(BASE_DIR, "config", "rois")

os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
os.makedirs(ROIS_DIR, exist_ok=True)

app = FastAPI(title="DALE Vision Edge Setup")

FILE_PREFIX = "file://"


# -------------------------
# Models
# -------------------------

class CloudConfig(BaseModel):
    cloud_base_url: str
    edge_token: str
    store_id: str


class CameraAddPayload(BaseModel):
    name: str
    rtsp_url: str


class CameraTestPayload(BaseModel):
    rtsp_url: str


# -------------------------
# Helpers
# -------------------------

def load_config() -> dict:
    if not os.path.exists(CONFIG_PATH):
        return {}
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def save_config(cfg: dict):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump(cfg, f, sort_keys=False, allow_unicode=True)


def _ensure_defaults(cfg: dict) -> dict:
    """
    Garante o contrato esperado por edge-agent/src/agent/settings.py
    """
    cfg.setdefault("agent", {})
    cfg.setdefault("cloud", {})
    cfg.setdefault("runtime", {})
    cfg.setdefault("model", {})
    cfg.setdefault("cameras", [])

    cfg["agent"].setdefault("agent_id", str(uuid.uuid4()))
    cfg["agent"].setdefault("timezone", "America/Sao_Paulo")

    cfg["cloud"].setdefault("timeout_seconds", 8)
    cfg["cloud"].setdefault("send_interval_seconds", 2)
    cfg["cloud"].setdefault("heartbeat_interval_seconds", 30)

    cfg["runtime"].setdefault("target_width", 960)
    cfg["runtime"].setdefault("fps_limit", 8)
    cfg["runtime"].setdefault("frame_skip", 2)
    cfg["runtime"].setdefault("buffer_sqlite_path", "./data/edge_queue.db")
    cfg["runtime"].setdefault("max_queue_size", 50000)
    cfg["runtime"].setdefault("log_level", "INFO")

    cfg["model"].setdefault("yolo_weights_path", "./models/yolov8n.pt")
    cfg["model"].setdefault("conf", 0.35)
    cfg["model"].setdefault("iou", 0.45)
    cfg["model"].setdefault("device", "cpu")

    return cfg


def _normalize_source(src: str) -> str:
    """
    Aceita:
      - rtsp://...
      - file://C:\\...\\media\\cam01.mp4
      - file://..\\media\\cam01.mp4
      - C:\\...\\media\\cam01.mp4
      - ..\\media\\cam01.mp4

    Resolve paths relativos a BASE_DIR (edge-agent).
    """
    src = (src or "").strip()
    if src.lower().startswith(FILE_PREFIX):
        src = src[len(FILE_PREFIX):]

    # se for rtsp, retorna como está
    if src.lower().startswith("rtsp://"):
        return src

    p = Path(src)
    if not p.is_absolute():
        p = Path(BASE_DIR) / p
    return str(p)


def _looks_like_private_store_rtsp(rtsp_url: str) -> bool:
    m = re.search(
        r"rtsp://[^@]+@(?P<ip>\d+\.\d+\.\d+\.\d+)(:\d+)?",
        rtsp_url or "",
        re.IGNORECASE
    )
    if not m:
        return False
    ip = m.group("ip")
    return ip.startswith(("192.168.", "10.", "172."))


def test_rtsp_or_file(source: str):
    src = _normalize_source(source)

    cap = cv2.VideoCapture(src)

    try:
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
    except Exception:
        pass

    if not cap.isOpened():
        cap.release()

        if (source or "").lower().startswith("rtsp://") and _looks_like_private_store_rtsp(source):
            raise RuntimeError(
                "Não foi possível abrir o RTSP. Esse IP parece ser da rede da loja (privado). "
                "Para testar RTSP, rode o setup no PC dentro da loja."
            )

        raise RuntimeError(f"Não foi possível abrir a fonte. Verifique caminho/URL: {source}")

    ok, frame = cap.read()
    cap.release()

    if not ok or frame is None:
        raise RuntimeError("Conectou, mas não conseguiu ler frame (stream/path/codec incorreto).")

    ok2, buffer = cv2.imencode(".jpg", frame)
    if not ok2:
        raise RuntimeError("Falha ao gerar snapshot JPG.")

    b64 = base64.b64encode(buffer).decode("utf-8")
    h, w = frame.shape[:2]
    return {"ok": True, "width": int(w), "height": int(h), "snapshot_base64": b64}


# -------------------------
# API Endpoints
# -------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/config")
def get_config():
    return load_config()


@app.post("/config")
def set_config(payload: CloudConfig):
    cfg = _ensure_defaults(load_config())

    # contrato do Settings (settings.py)
    cfg["agent"]["store_id"] = payload.store_id
    cfg["cloud"]["base_url"] = payload.cloud_base_url.rstrip("/")
    cfg["cloud"]["token"] = payload.edge_token

    save_config(cfg)
    return {"ok": True}


@app.post("/camera/test")
def camera_test(payload: CameraTestPayload):
    try:
        return test_rtsp_or_file(payload.rtsp_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/camera/add")
def camera_add(payload: CameraAddPayload):
    cfg = _ensure_defaults(load_config())

    cam_id = f"cam{len(cfg['cameras']) + 1:02d}"

    cfg["cameras"].append({
        "camera_id": cam_id,
        "name": payload.name,
        "rtsp_url": payload.rtsp_url,
        # contrato do Settings: roi_config é caminho do YAML
        "roi_config": f"./config/rois/{cam_id}.yaml",
    })

<<truncated>>
```

### edge-agent/src/camera/rtsp.py

```
import logging
import os
import threading
import time
from dataclasses import dataclass
from typing import Optional, Any, Dict, List, Tuple

import cv2
import yaml
import numpy as np


@dataclass
class Frame:
    image: Any  # np.ndarray (BGR)
    ts: float


def _point_in_polygon(px: float, py: float, polygon: List[List[int]]) -> bool:
    """
    polygon: [[x,y], [x,y], ...]
    """
    if not polygon or len(polygon) < 3:
        return False
    contour = np.array(polygon, dtype=np.int32)
    return cv2.pointPolygonTest(contour, (float(px), float(py)), False) >= 0


def _line_side(p1: Tuple[int, int], p2: Tuple[int, int], p: Tuple[int, int]) -> float:
    """
    Retorna o "lado" do ponto p em relação à linha p1->p2.
    Mesma ideia do runner v4.2 (entrada/saída).
    """
    return (p2[0] - p1[0]) * (p[1] - p1[1]) - (p2[1] - p1[1]) * (p[0] - p1[0])


class RtspCameraWorker(threading.Thread):
    def __init__(
        self,
        camera_id: str,
        name: str,
        rtsp_url: str,
        roi_config_path: str,
        target_width: int,
        fps_limit: int,
        frame_skip: int,
    ):
        super().__init__(daemon=True)
        self.camera_id = camera_id
        self.name = name
        self.rtsp_url = rtsp_url
        self.target_width = target_width
        self.fps_limit = fps_limit
        self.frame_skip = frame_skip

        self._stop = False
        self._last_frame: Optional[Frame] = None
        self._ok = False
        self._last_err = None

        if not os.path.exists(roi_config_path):
            logging.warning(
                "[ROI] arquivo não encontrado: %s (camera %s). Rodando sem ROI.",
                roi_config_path,
                self.camera_id,
            )
            self.roi = {}
        else:
            with open(roi_config_path, "r", encoding="utf-8") as f:
                self.roi = yaml.safe_load(f) or {}

        # estado interno (checkout FSM, linhas etc.)
        self._roi_state: Dict[str, Any] = {
            # checkout FSM
            "in_checkout_cycle": False,
            "interaction_start_ts": None,
            "last_checkout_ts": -1e9,

            # entrada/saída (precisa track_id)
            "track_line_side_state": {},   # track_id -> {line_name: side}
            "track_line_last_event": {},   # track_id -> {(entry/exit,line_name): last_ts}

            # debug
            "debug_last_counts": {
                "clients_at_pay": 0,
                "staff_at_cashier": 0,
            }
        }

        # cache de zonas/linhas
        self._zones: Dict[str, List[List[int]]] = (self.roi.get("zones", {}) or {})
        self._lines_raw = (self.roi.get("lines", {}) or {})

        # normaliza linhas: {"linha_entrada_saida": [[x,y],[x,y]]} -> (p1,p2)
        self._lines: Dict[str, Tuple[Tuple[int, int], Tuple[int, int]]] = {}
        for ln, pts in self._lines_raw.items():
            if isinstance(pts, list) and len(pts) == 2:
                p1 = (int(pts[0][0]), int(pts[0][1]))
                p2 = (int(pts[1][0]), int(pts[1][1]))
                self._lines[ln] = (p1, p2)

        # params (defaults iguais ao runner)
        params = self.roi.get("params", {}) or {}
        self._exclude_pay_from_queue: bool = bool(params.get("exclude_pay_from_queue", True))
        self._checkout_dwell_s: float = float(params.get("checkout_dwell_seconds", 2.0))
        self._checkout_failsafe_s: float = float(params.get("checkout_failsafe_seconds", 4.0))
        self._line_cooldown_s: float = float(params.get("line_cooldown_seconds", 4.0))

    def _is_rtsp(self) -> bool:
        return isinstance(self.rtsp_url, str) and self.rtsp_url.lower().startswith("rtsp://")

    def run(self):
        cap = None
        last_emit = 0.0
        skip = 0

        while not self._stop:
            try:
                # (re)open
                if cap is None or not cap.isOpened():
                    cap = cv2.VideoCapture(self.rtsp_url)
                    time.sleep(0.3)

                ok, frame = cap.read()

                # ========= EOF / RTSP fail handling =========
                if not ok or frame is None:
                    self._ok = False

                    # ✅ Se for arquivo (mp4) e acabou: volta pro começo e continua
                    if not self._is_rtsp():
                        try:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            time.sleep(0.05)
                            continue
                        except Exception as e:
                            self._last_err = f"video_loop_error: {e}"

                    # ✅ Se for RTSP (ou falha séria): libera e tenta reabrir
                    try:
                        cap.release()
                    except Exception:
                        pass
                    cap = None
                    time.sleep(0.5)
                    continue

                self._ok = True

                # frame skip
                skip += 1
                if skip <= self.frame_skip:
                    continue
                skip = 0

                # resize
                h, w = frame.shape[:2]
                if w > self.target_width:
                    scale = self.target_width / float(w)
                    frame = cv2.resize(frame, (self.target_width, int(h * scale)))

                # fps limit
                now = time.time()
                if self.fps_limit > 0 and (now - last_emit) < (1.0 / self.fps_limit):
                    # pequena pausa pra não girar em loop apertado
                    time.sleep(0.001)
                    continue
                last_emit = now

                self._last_frame = Frame(image=frame, ts=now)

            except Exception as e:
                self._last_err = str(e)
                self._ok = False
                # tenta resetar a captura em caso de erro
                try:
                    if cap is not None:
                        cap.release()
                except Exception:
                    pass
                cap = None
                time.sleep(0.5)

        try:
            if cap is not None:
                cap.release()
        except Exception:
            pass

    def stop(self):
        self._stop = True

    def try_get_frame(self) -> Optional[Frame]:
        f = self._last_frame
        self._last_frame = None
        return f

    def is_ok(self) -> bool:
        return bool(self._ok)

    def _infer_role(self) -> str:
        """
        Se o YAML tiver role, usa. Senão infere pela presença das ROIs.
        """
        role = self.roi.get("role")
        if role in ("balcao", "salao", "entrada"):
            return role

        z = self._zones
        if "ponto_pagamento" in z or "area_atendimento_fila" in z or "zona_funcionario_caixa" in z:
            return "balcao"
        if "area_consumo" in z:
            return "salao"
        if self._lines:
            return "entrada"
        return "unknown"

    def update_metrics(self, detections, ts: float):
        """
        Entrada:

<<truncated>>
```

### edge-agent/src/events/builder.py

```
from typing import Any, Dict, Optional
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_envelope(
    *,
    event_name: str,
    source: str,
    data: Dict[str, Any],
    meta: Optional[Dict[str, Any]] = None,
    event_version: int = 1,
    lead_id=None,
    org_id=None
) -> Dict[str, Any]:
    return {
        "event_id": data.get("event_id") or None,
        "event_name": str(event_name),
        "event_version": event_version,
        "ts": data.get("ts") or now_iso(),
        "source": source,
        "lead_id": lead_id,
        "org_id": org_id,
        "data": data,
        "meta": meta or {},
    }
```

### edge-agent/src/events/receipts.py

```
import hashlib
import json
from typing import Any, Dict


def compute_receipt_id(payload: Dict[str, Any]) -> str:
    """
    Idempotência: gera um hash estável.
    Use campos relevantes: store_id + camera_id + event_name + bucket/ts
    """
    base = {
        "event_name": payload.get("event_name"),
        "store_id": payload.get("data", {}).get("store_id"),
        "camera_id": payload.get("data", {}).get("camera_id"),
        "ts": payload.get("ts"),
        "event_version": payload.get("event_version", 1),
    }
    raw = json.dumps(base, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
```

### edge-agent/src/storage/__init__.py

```

```

### edge-agent/src/storage/sqlite_queue.py

```
import os
import sqlite3
import json
import time
from typing import Any, Dict, List, Tuple


class SqliteQueue:
    def __init__(self, path: str):
        self.path = path

        # garante que o diretório existe (Windows)
        db_dir = os.path.dirname(os.path.abspath(self.path))
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)

        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_db()

    def _init_db(self):
        """
        Cria a tabela de outbox (offline-first).
        """
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS outbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_id TEXT UNIQUE,
                payload_json TEXT NOT NULL,
                attempts INTEGER DEFAULT 0,
                last_error TEXT,
                created_at REAL NOT NULL,
                next_attempt_at REAL DEFAULT 0
            )
            """
        )
        self._conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_outbox_next_attempt ON outbox(next_attempt_at)"
        )
        self._conn.commit()

    def enqueue(self, payload: Dict[str, Any]) -> bool:
        """
        Insere evento no outbox.
        receipt_id deve vir dentro do payload.
        """
        try:
            receipt_id = payload["receipt_id"]
            self._conn.execute(
                """
                INSERT OR IGNORE INTO outbox
                (receipt_id, payload_json, created_at, next_attempt_at)
                VALUES (?, ?, ?, 0)
                """,
                (
                    receipt_id,
                    json.dumps(payload, ensure_ascii=False),
                    time.time(),
                ),
            )
            self._conn.commit()
            return True
        except Exception as e:
            print("❌ enqueue error:", e)
            return False

    def peek_batch(self, limit: int = 50) -> List[Tuple[int, str, Dict[str, Any], int]]:
        """
        Retorna eventos prontos para envio.
        """
        now = time.time()
        rows = self._conn.execute(
            """
            SELECT id, receipt_id, payload_json, attempts
            FROM outbox
            WHERE next_attempt_at <= ?
            ORDER BY id ASC
            LIMIT ?
            """,
            (now, limit),
        ).fetchall()

        out = []
        for row in rows:
            out.append(
                (
                    row["id"],
                    row["receipt_id"],
                    json.loads(row["payload_json"]),
                    row["attempts"],
                )
            )
        return out

    def mark_sent(self, row_id: int):
        self._conn.execute("DELETE FROM outbox WHERE id = ?", (row_id,))
        self._conn.commit()

    def mark_failed(self, row_id: int, error: str, attempts: int, backoff_seconds: int):
        next_at = time.time() + backoff_seconds
        self._conn.execute(
            """
            UPDATE outbox
            SET last_error = ?, attempts = ?, next_attempt_at = ?
            WHERE id = ?
            """,
            (error[:1000], attempts, next_at, row_id),
        )
        self._conn.commit()
```

### edge-agent/src/transport/api_client.py

```
import time
import requests
from typing import Any, Dict


class ApiClient:
    def __init__(self, base_url: str, token: str, timeout: int):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "X-EDGE-TOKEN": token,
            "Content-Type": "application/json",
        })

    def post_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Endpoint sugerido: POST /api/edge/events/
        """
        url = f"{self.base_url}/api/edge/events/"
        r = self.session.post(url, json=payload, timeout=self.timeout)
        if r.ok:
            try:
                return {"ok": True, "status": r.status_code, "data": r.json()}
            except Exception:
                return {"ok": True, "status": r.status_code, "data": {"text": r.text}}
        return {"ok": False, "status": r.status_code, "error": r.text}

    def flush_outbox(self, queue, batch_size: int = 50) -> Dict[str, Any]:
        """
        Lê eventos do SqliteQueue e tenta postar pro backend.
        Em caso de falha, aplica backoff exponencial simples.
        """
        sent = 0
        failed = 0
        last_error = None

        batch = queue.peek_batch(limit=batch_size)
        for row_id, receipt_id, payload, attempts in batch:
            try:
                res = self.post_event(payload)

                if res.get("ok"):
                    queue.mark_sent(row_id)
                    sent += 1
                else:
                    attempts = int(attempts) + 1
                    backoff = min(300, 2 ** min(attempts, 8))  # 2s,4s,8s... até 300s
                    last_error = str(res.get("error") or res)
                    queue.mark_failed(
                        row_id=row_id,
                        error=last_error,
                        attempts=attempts,
                        backoff_seconds=backoff,
                    )
                    failed += 1

            except Exception as e:
                attempts = int(attempts) + 1
                backoff = min(300, 2 ** min(attempts, 8))
                last_error = str(e)
                queue.mark_failed(
                    row_id=row_id,
                    error=last_error,
                    attempts=attempts,
                    backoff_seconds=backoff,
                )
                failed += 1

        return {"ok": True, "sent": sent, "failed": failed, "last_error": last_error}
```

### edge-agent/src/vision/aggregations.py

```
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Any, Optional
import math


@dataclass
class _Bucket:
    ts_bucket: int  # epoch start do bucket (segundos)
    count: int = 0
    sums: Dict[str, float] = field(default_factory=dict)
    maxs: Dict[str, float] = field(default_factory=dict)


class MetricAggregator:
    """
    Agregador simples por camera_id.
    - Buckets fixos de bucket_seconds (ex.: 60s)
    - Produz métricas *_avg e *_max por bucket
    """

    def __init__(self, bucket_seconds: int = 60):
        self.bucket_seconds = int(bucket_seconds)
        self._buckets: Dict[str, _Bucket] = {}

    def _bucket_start(self, ts: float) -> int:
        # início do bucket em epoch-segundos (ex.: minuto)
        return int(math.floor(ts / self.bucket_seconds) * self.bucket_seconds)

    def add_sample(self, camera_id: str, ts: float, metrics: Dict[str, Any]) -> None:
        """
        Adiciona uma amostra instantânea no bucket corrente da câmera.
        """
        bstart = self._bucket_start(ts)
        b = self._buckets.get(camera_id)

        if b is None or b.ts_bucket != bstart:
            # inicia novo bucket (não fecha o anterior aqui)
            self._buckets[camera_id] = _Bucket(ts_bucket=bstart)
            b = self._buckets[camera_id]

        b.count += 1

        # agrega apenas números
        for k, v in (metrics or {}).items():
            if isinstance(v, bool):
                v = int(v)
            if isinstance(v, (int, float)):
                fv = float(v)
                b.sums[k] = b.sums.get(k, 0.0) + fv
                b.maxs[k] = fv if k not in b.maxs else max(b.maxs[k], fv)

    def try_close_bucket(self, camera_id: str, ts: float) -> Optional[Dict[str, Any]]:
        """
        Fecha e retorna o bucket anterior quando o tempo já avançou para o próximo bucket.
        Retorna None se ainda estamos no mesmo bucket.
        """
        b = self._buckets.get(camera_id)
        if b is None:
            return None

        current_start = self._bucket_start(ts)
        if current_start == b.ts_bucket:
            return None  # ainda no mesmo bucket

        # fecha o bucket b e já cria o novo bucket para o current_start
        closed = b
        self._buckets[camera_id] = _Bucket(ts_bucket=current_start)

        out_metrics: Dict[str, Any] = {}

        denom = max(1, closed.count)
        for k, s in closed.sums.items():
            out_metrics[f"{k}_avg"] = s / denom
        for k, m in closed.maxs.items():
            out_metrics[f"{k}_max"] = m

        return {
            "ts_bucket": closed.ts_bucket,
            "count": closed.count,
            "metrics": out_metrics,
        }
```

### edge-agent/src/vision/detector.py

```
# edge-agent/src/vision/detector.py
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Any, Optional

import numpy as np

try:
    from ultralytics import YOLO
except Exception as e:
    YOLO = None  # type: ignore


@dataclass
class Detection:
    cls_name: str
    conf: float
    xyxy: List[float]  # [x1,y1,x2,y2]


class PersonDetector:
    def __init__(
        self,
        weights_path: str,
        conf: float = 0.35,
        iou: float = 0.45,
        device: str = "cpu",
    ):
        if YOLO is None:
            raise RuntimeError("ultralytics não está instalado. pip install ultralytics")

        self.model = YOLO(weights_path)
        self.conf = conf
        self.iou = iou
        self.device = device

    def detect(self, frame_bgr: np.ndarray) -> List[Detection]:
        """
        Retorna apenas pessoas (class 0 no COCO geralmente).
        """
        results = self.model.predict(
            source=frame_bgr,
            conf=self.conf,
            iou=self.iou,
            device=self.device,
            verbose=False,
        )

        dets: List[Detection] = []
        if not results:
            return dets

        r0 = results[0]
        if r0.boxes is None:
            return dets

        # boxes: xyxy, conf, cls
        xyxy = r0.boxes.xyxy.cpu().numpy()
        confs = r0.boxes.conf.cpu().numpy()
        clss = r0.boxes.cls.cpu().numpy().astype(int)

        # nomes (se existir)
        names = getattr(self.model, "names", None) or {}

        for box, cf, c in zip(xyxy, confs, clss):
            cls_name = names.get(c, str(c))
            if cls_name != "person" and c != 0:
                continue
            x1, y1, x2, y2 = [float(v) for v in box.tolist()]
            dets.append(Detection(cls_name="person", conf=float(cf), xyxy=[x1, y1, x2, y2]))

        return dets
```

### edge-agent/src/vision/rules.py

```
from typing import Dict, Any, List

class RuleEngine:
    def evaluate(self, bucket: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Transformar métricas de bucket em alertas.
        No v1, mantenha 1–2 regras simples.
        """
        events = []
        m = bucket["metrics"]

        # Exemplo: fila longa baseado em people_count_max
        people_max = m.get("people_count_max")
        if people_max is not None and people_max >= 6:
            events.append({
                "event_type": "queue_long",
                "severity": "warning",
                "title": "Possível fila longa",
                "description": f"Pico de pessoas detectadas: {people_max}",
                "metadata": {"ts_bucket": bucket["ts_bucket"], "people_max": people_max},
            })
        return events
```

### frontend/README.md

```
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
```

### frontend/eslint.config.js

```
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
```

### frontend/index.html

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DALE Vision</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### frontend/package-lock.json

```
{
  "name": "frontend",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "frontend",
      "version": "0.0.0",
      "dependencies": {
        "@heroicons/react": "^2.2.0",
        "@tanstack/react-query": "^5.90.16",
        "@tanstack/react-query-devtools": "^5.91.2",
        "axios": "^1.13.2",
        "react": "^19.2.0",
        "react-dom": "^19.2.0",
        "react-hot-toast": "^2.6.0",
        "react-router-dom": "^7.12.0",
        "recharts": "^3.6.0"
      },
      "devDependencies": {
        "@eslint/js": "^9.39.1",
        "@types/node": "^24.10.1",
        "@types/react": "^19.2.5",
        "@types/react-dom": "^19.2.3",
        "@vitejs/plugin-react": "^5.1.1",
        "autoprefixer": "^10.4.23",
        "eslint": "^9.39.1",
        "eslint-plugin-react-hooks": "^7.0.1",
        "eslint-plugin-react-refresh": "^0.4.24",
        "globals": "^16.5.0",
        "postcss": "^8.5.6",
        "tailwindcss": "^3.4.19",
        "typescript": "~5.9.3",
        "typescript-eslint": "^8.46.4",
        "vite": "^7.2.4"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz",
      "integrity": "sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.28.6.tgz",
      "integrity": "sha512-JYgintcMjRiCvS8mMECzaEn+m3PfoQiyqukOMCCVQtoJGYJw8j/8LBJEiqkHLkfwCcs74E3pbAUFNg7d9VNJ+Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.28.5",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.28.6.tgz",
      "integrity": "sha512-2lfu57JtzctfIrcGMz992hyLlByuzgIk58+hhGCxjKZ3rWI82NnVLjXcaTqkI2NvlcvOskZaiZ5kjUALo3Lpxg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.28.6.tgz",
      "integrity": "sha512-H3mcG6ZDLTlYfaSNi0iOKkigqMFvkTKlGUYlD8GW7nNOYRrevuA46iTypPyv+06V3fEmvvazfntkBU34L0azAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.28.6",
        "@babel/generator": "^7.28.6",
        "@babel/helper-compilation-targets": "^7.28.6",
        "@babel/helper-module-transforms": "^7.28.6",
        "@babel/helpers": "^7.28.6",
        "@babel/parser": "^7.28.6",
        "@babel/template": "^7.28.6",
        "@babel/traverse": "^7.28.6",
        "@babel/types": "^7.28.6",
        "@jridgewell/remapping": "^2.3.5",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.28.6.tgz",
      "integrity": "sha512-lOoVRwADj8hjf7al89tvQ2a1lf53Z+7tiXMgpZJL3maQPDxh0DgLMN62B2MKUOFcoodBHLMbDM6WAbKgNy5Suw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.28.6",
        "@babel/types": "^7.28.6",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.28.6.tgz",
      "integrity": "sha512-JYtls3hqi15fcx5GaSNL7SCTJ2MNmjrkHXg4FSpOA/grxK8KwyZ5bubHsCq8FXCkua6xhuaaBit+3b7+VZRfcA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.28.6",
        "@babel/helper-validator-option": "^7.27.1",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.28.0.tgz",
      "integrity": "sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.28.6.tgz",
      "integrity": "sha512-l5XkZK7r7wa9LucGw9LwZyyCUscb4x37JWTPz7swwFE/0FMQAGpiWUZn8u9DzkSBWEcK25jmvubfpw2dnAMdbw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.28.6",
        "@babel/types": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.28.6.tgz",
      "integrity": "sha512-67oXFAYr2cDLDVGLXTEABjdBJZ6drElUSI7WKp70NrpyISso3plG9SAGEF6y7zbha/wOzUByWWTJvEDVNIUGcA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.28.6",
        "@babel/helper-validator-identifier": "^7.28.5",
        "@babel/traverse": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-plugin-utils": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-plugin-utils/-/helper-plugin-utils-7.28.6.tgz",
      "integrity": "sha512-S9gzZ/bz83GRysI7gAD4wPT/AI3uCnY+9xn+Mx/KPs2JwHJIz1W8PZkg2cqyt3RNOBM8ejcXhV6y8Og7ly/Dug==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.27.1.tgz",
      "integrity": "sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.28.5.tgz",
      "integrity": "sha512-qSs4ifwzKJSV39ucNjsvc6WVHs6b7S03sOh2OcHF9UHfVPqWWALUsNUVzhSBiItjRZoLHx7nIarVjqKVusUZ1Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.27.1.tgz",
      "integrity": "sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==",
      "dev": true,
      "license": "MIT",
      "engines": {

<<truncated>>
```

### frontend/package.json

```
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@heroicons/react": "^2.2.0",
    "@tanstack/react-query": "^5.90.16",
    "@tanstack/react-query-devtools": "^5.91.2",
    "axios": "^1.13.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-helmet-async": "^2.0.5",
    "react-hot-toast": "^2.6.0",
    "react-router-dom": "^7.12.0",
    "recharts": "^3.6.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.23",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.19",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.46.4",
    "vite": "^7.2.4"
  }
}
```

### frontend/pnpm-lock.yaml

```
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      '@heroicons/react':
        specifier: ^2.2.0
        version: 2.2.0(react@19.2.3)
      '@tanstack/react-query':
        specifier: ^5.90.16
        version: 5.90.19(react@19.2.3)
      '@tanstack/react-query-devtools':
        specifier: ^5.91.2
        version: 5.91.2(@tanstack/react-query@5.90.19(react@19.2.3))(react@19.2.3)
      axios:
        specifier: ^1.13.2
        version: 1.13.2
      react:
        specifier: ^19.2.0
        version: 19.2.3
      react-dom:
        specifier: ^19.2.0
        version: 19.2.3(react@19.2.3)
      react-helmet-async:
        specifier: ^2.0.5
        version: 2.0.5(react@19.2.3)
      react-hot-toast:
        specifier: ^2.6.0
        version: 2.6.0(react-dom@19.2.3(react@19.2.3))(react@19.2.3)
      react-router-dom:
        specifier: ^7.12.0
        version: 7.12.0(react-dom@19.2.3(react@19.2.3))(react@19.2.3)
      recharts:
        specifier: ^3.6.0
        version: 3.7.0(@types/react@19.2.9)(react-dom@19.2.3(react@19.2.3))(react-is@19.2.3)(react@19.2.3)(redux@5.0.1)
    devDependencies:
      '@eslint/js':
        specifier: ^9.39.1
        version: 9.39.2
      '@types/node':
        specifier: ^24.10.1
        version: 24.10.9
      '@types/react':
        specifier: ^19.2.5
        version: 19.2.9
      '@types/react-dom':
        specifier: ^19.2.3
        version: 19.2.3(@types/react@19.2.9)
      '@vitejs/plugin-react':
        specifier: ^5.1.1
        version: 5.1.2(vite@7.3.1(@types/node@24.10.9)(jiti@1.21.7))
      autoprefixer:
        specifier: ^10.4.23
        version: 10.4.23(postcss@8.5.6)
      eslint:
        specifier: ^9.39.1
        version: 9.39.2(jiti@1.21.7)
      eslint-plugin-react-hooks:
        specifier: ^7.0.1
        version: 7.0.1(eslint@9.39.2(jiti@1.21.7))
      eslint-plugin-react-refresh:
        specifier: ^0.4.24
        version: 0.4.26(eslint@9.39.2(jiti@1.21.7))
      globals:
        specifier: ^16.5.0
        version: 16.5.0
      postcss:
        specifier: ^8.5.6
        version: 8.5.6
      tailwindcss:
        specifier: ^3.4.19
        version: 3.4.19
      typescript:
        specifier: ~5.9.3
        version: 5.9.3
      typescript-eslint:
        specifier: ^8.46.4
        version: 8.53.1(eslint@9.39.2(jiti@1.21.7))(typescript@5.9.3)
      vite:
        specifier: ^7.2.4
        version: 7.3.1(@types/node@24.10.9)(jiti@1.21.7)

packages:

  '@alloc/quick-lru@5.2.0':
    resolution: {integrity: sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==}
    engines: {node: '>=10'}

  '@babel/code-frame@7.28.6':
    resolution: {integrity: sha512-JYgintcMjRiCvS8mMECzaEn+m3PfoQiyqukOMCCVQtoJGYJw8j/8LBJEiqkHLkfwCcs74E3pbAUFNg7d9VNJ+Q==}
    engines: {node: '>=6.9.0'}

  '@babel/compat-data@7.28.6':
    resolution: {integrity: sha512-2lfu57JtzctfIrcGMz992hyLlByuzgIk58+hhGCxjKZ3rWI82NnVLjXcaTqkI2NvlcvOskZaiZ5kjUALo3Lpxg==}
    engines: {node: '>=6.9.0'}

  '@babel/core@7.28.6':
    resolution: {integrity: sha512-H3mcG6ZDLTlYfaSNi0iOKkigqMFvkTKlGUYlD8GW7nNOYRrevuA46iTypPyv+06V3fEmvvazfntkBU34L0azAw==}
    engines: {node: '>=6.9.0'}

  '@babel/generator@7.28.6':
    resolution: {integrity: sha512-lOoVRwADj8hjf7al89tvQ2a1lf53Z+7tiXMgpZJL3maQPDxh0DgLMN62B2MKUOFcoodBHLMbDM6WAbKgNy5Suw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-compilation-targets@7.28.6':
    resolution: {integrity: sha512-JYtls3hqi15fcx5GaSNL7SCTJ2MNmjrkHXg4FSpOA/grxK8KwyZ5bubHsCq8FXCkua6xhuaaBit+3b7+VZRfcA==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-globals@7.28.0':
    resolution: {integrity: sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-module-imports@7.28.6':
    resolution: {integrity: sha512-l5XkZK7r7wa9LucGw9LwZyyCUscb4x37JWTPz7swwFE/0FMQAGpiWUZn8u9DzkSBWEcK25jmvubfpw2dnAMdbw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-module-transforms@7.28.6':
    resolution: {integrity: sha512-67oXFAYr2cDLDVGLXTEABjdBJZ6drElUSI7WKp70NrpyISso3plG9SAGEF6y7zbha/wOzUByWWTJvEDVNIUGcA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0

  '@babel/helper-plugin-utils@7.28.6':
    resolution: {integrity: sha512-S9gzZ/bz83GRysI7gAD4wPT/AI3uCnY+9xn+Mx/KPs2JwHJIz1W8PZkg2cqyt3RNOBM8ejcXhV6y8Og7ly/Dug==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-string-parser@7.27.1':
    resolution: {integrity: sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-validator-identifier@7.28.5':
    resolution: {integrity: sha512-qSs4ifwzKJSV39ucNjsvc6WVHs6b7S03sOh2OcHF9UHfVPqWWALUsNUVzhSBiItjRZoLHx7nIarVjqKVusUZ1Q==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-validator-option@7.27.1':
    resolution: {integrity: sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==}
    engines: {node: '>=6.9.0'}

  '@babel/helpers@7.28.6':
    resolution: {integrity: sha512-xOBvwq86HHdB7WUDTfKfT/Vuxh7gElQ+Sfti2Cy6yIWNW05P8iUslOVcZ4/sKbE+/jQaukQAdz/gf3724kYdqw==}
    engines: {node: '>=6.9.0'}

  '@babel/parser@7.28.6':
    resolution: {integrity: sha512-TeR9zWR18BvbfPmGbLampPMW+uW1NZnJlRuuHso8i87QZNq2JRF9i6RgxRqtEq+wQGsS19NNTWr2duhnE49mfQ==}
    engines: {node: '>=6.0.0'}
    hasBin: true

  '@babel/plugin-transform-react-jsx-self@7.27.1':
    resolution: {integrity: sha512-6UzkCs+ejGdZ5mFFC/OCUrv028ab2fp1znZmCZjAOBKiBK2jXD1O+BPSfX8X2qjJ75fZBMSnQn3Rq2mrBJK2mw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-react-jsx-source@7.27.1':
    resolution: {integrity: sha512-zbwoTsBruTeKB9hSq73ha66iFeJHuaFkUbwvqElnygoNbj/jHRsSeokowZFN3CZ64IvEqcmmkVe89OPXc7ldAw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/template@7.28.6':
    resolution: {integrity: sha512-YA6Ma2KsCdGb+WC6UpBVFJGXL58MDA6oyONbjyF/+5sBgxY/dwkhLogbMT2GXXyU84/IhRw/2D1Os1B/giz+BQ==}
    engines: {node: '>=6.9.0'}

  '@babel/traverse@7.28.6':
    resolution: {integrity: sha512-fgWX62k02qtjqdSNTAGxmKYY/7FSL9WAS1o2Hu5+I5m9T0yxZzr4cnrfXQ/MX0rIifthCSs6FKTlzYbJcPtMNg==}
    engines: {node: '>=6.9.0'}

  '@babel/types@7.28.6':
    resolution: {integrity: sha512-0ZrskXVEHSWIqZM/sQZ4EV3jZJXRkio/WCxaqKZP1g//CEWEPSfeZFcms4XeKBCHU0ZKnIkdJeU/kF+eRp5lBg==}
    engines: {node: '>=6.9.0'}

  '@esbuild/aix-ppc64@0.27.2':
    resolution: {integrity: sha512-GZMB+a0mOMZs4MpDbj8RJp4cw+w1WV5NYD6xzgvzUJ5Ek2jerwfO2eADyI6ExDSUED+1X8aMbegahsJi+8mgpw==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [aix]

  '@esbuild/android-arm64@0.27.2':
    resolution: {integrity: sha512-pvz8ZZ7ot/RBphf8fv60ljmaoydPU12VuXHImtAs0XhLLw+EXBi2BLe3OYSBslR4rryHvweW5gmkKFwTiFy6KA==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [android]

  '@esbuild/android-arm@0.27.2':
    resolution: {integrity: sha512-DVNI8jlPa7Ujbr1yjU2PfUSRtAUZPG9I1RwW4F4xFB1Imiu2on0ADiI/c3td+KmDtVKNbi+nffGDQMfcIMkwIA==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [android]

  '@esbuild/android-x64@0.27.2':
    resolution: {integrity: sha512-z8Ank4Byh4TJJOh4wpz8g2vDy75zFL0TlZlkUkEwYXuPSgX8yzep596n6mT7905kA9uHZsf/o2OJZubl2l3M7A==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [android]

  '@esbuild/darwin-arm64@0.27.2':
    resolution: {integrity: sha512-davCD2Zc80nzDVRwXTcQP/28fiJbcOwvdolL0sOiOsbwBa72kegmVU0Wrh1MYrbuCL98Omp5dVhQFWRKR2ZAlg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [darwin]

  '@esbuild/darwin-x64@0.27.2':
    resolution: {integrity: sha512-ZxtijOmlQCBWGwbVmwOF/UCzuGIbUkqB1faQRf5akQmxRJ1ujusWsb3CVfk/9iZKr2L5SMU5wPBi1UWbvL+VQA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [darwin]

  '@esbuild/freebsd-arm64@0.27.2':
    resolution: {integrity: sha512-lS/9CN+rgqQ9czogxlMcBMGd+l8Q3Nj1MFQwBZJyoEKI50XGxwuzznYdwcav6lpOGv5BqaZXqvBSiB/kJ5op+g==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [freebsd]

  '@esbuild/freebsd-x64@0.27.2':
    resolution: {integrity: sha512-tAfqtNYb4YgPnJlEFu4c212HYjQWSO/w/h/lQaBK7RbwGIkBOuNKQI9tqWzx7Wtp7bTPaGC6MJvWI608P3wXYA==}

<<truncated>>
```

### frontend/postcss.config.js

```
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### frontend/src/App.tsx

```
import { Routes, Route, Navigate } from "react-router-dom"
import PrivateRoute from "./components/PrivateRoute"
import Layout from "./components/Layout/Layout"

import HomePage from "./pages/Home/Home"
import Login from "./pages/Login/Login"
import AgendarDemo from "./pages/AgendarDemo/AgendarDemo"

import Dashboard from "./pages/Dashboard/Dashboard"
import Stores from "./pages/Stores/Stores"
import Analytics from "./pages/Analytics/Analytics"
import Cameras from "./pages/Cameras/Cameras"
import Alerts from "./pages/Alerts/Alerts"
import Settings from "./pages/Settings/Settings"
import ProfilePage from "./pages/Profile/Profile"

// ✅ Alerts stack
import AlertRules from "./pages/AlertRules/AlertRules"
import NotificationLogs from "./pages/NotificationLogs/NotificationLogs"

// 🆕 Onboarding / Register
import Register from "./pages/Register/Register"
import Onboarding from "./pages/Onboarding/Onboarding"
import OnboardingSuccess from "./pages/Onboarding/OnboardingSuccess"

// 🆕 Setup técnico (EDGE-first)
import Setup from "./pages/Setup/Setup"

function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/agendar-demo" element={<AgendarDemo />} />

      {/* Registro + onboarding (público por enquanto) */}
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding/success" element={<OnboardingSuccess />} />

      {/* Rotas protegidas */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="stores" element={<Stores />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="cameras" element={<Cameras />} />
        <Route path="alerts" element={<Alerts />} />

        {/* ✅ Alerts stack */}
        <Route path="alert-rules" element={<AlertRules />} />
        <Route path="notification-logs" element={<NotificationLogs />} />

        {/* 🧩 SETUP TÉCNICO */}
        <Route path="setup" element={<Setup />} />

        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Compat redirects (rotas antigas sem /app) */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/stores" element={<Navigate to="/app/stores" replace />} />
      <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
      <Route path="/cameras" element={<Navigate to="/app/cameras" replace />} />
      <Route path="/alerts" element={<Navigate to="/app/alerts" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

      {/* ✅ Redirects Alerts */}
      <Route path="/alert-rules" element={<Navigate to="/app/alert-rules" replace />} />
      <Route path="/notification-logs" element={<Navigate to="/app/notification-logs" replace />} />

      {/* ✅ Redirects Onboarding */}
      <Route path="/onboarding-success" element={<Navigate to="/onboarding/success" replace />} />

      {/* ✅ Redirect Setup (opcional) */}
      <Route path="/setup" element={<Navigate to="/app/setup" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
```

### frontend/src/components/Agent/AgentModal.tsx

```
import { useState } from "react"
import logo from "../../assets/logo.png"
import { useAgent } from "../../contexts/AgentContext"

export function AgentModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [msg, setMsg] = useState("")
  const { messages, addMessage } = useAgent()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] bg-[#0B0F14] flex flex-col">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logo}
            alt="DALE Copiloto"
            className="h-10 w-10 rounded-md"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">
              DALE Copiloto
            </div>
            <div className="text-xs text-white/50 truncate">
              Insights e recomendações (em breve: dados reais)
            </div>
          </div>
        </div>

        <button
          className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5"
          onClick={onClose}
          aria-label="Fechar agente"
        >
          ✕
        </button>
      </div>

      {/* ================= CHAT (SCROLL) ================= */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl border border-white/10 p-4 text-sm ${
              m.role === "assistant"
                ? "bg-white/5 text-white/70"
                : "bg-blue-600/20 text-white"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* ================= INPUT FIXO ================= */}
      <div
        className="px-4 pt-3 pb-6 border-t border-white/10 bg-[#0B0F14] shadow-[0_-4px_12px_rgba(0,0,0,0.35)]"
        style={{
          paddingBottom: "calc(16px + 72px + env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex gap-2 items-center">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Digite sua pergunta…"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/20"
            aria-label="Mensagem para o agente"
          />
          <button
            className="rounded-2xl bg-gradient-to-r from-lime-400 to-green-500 px-4 py-3 font-semibold text-black hover:brightness-105 transition"
            aria-label="Enviar mensagem"
            onClick={() => {
              if (!msg.trim()) return

              addMessage({
                id: crypto.randomUUID(),
                role: "user",
                content: msg,
              })

              setMsg("")
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
```

### frontend/src/components/Charts/LineChart.tsx

```
// src/components/Charts/LineChart.tsx
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const data = [
  { hora: "08:00", visitantes: 45, conversões: 12 },
  { hora: "10:00", visitantes: 120, conversões: 45 },
  { hora: "12:00", visitantes: 210, conversões: 85 },
  { hora: "14:00", visitantes: 180, conversões: 78 },
  { hora: "16:00", visitantes: 150, conversões: 65 },
  { hora: "18:00", visitantes: 90, conversões: 32 },
  { hora: "20:00", visitantes: 40, conversões: 15 },
]

export const LineChart = () => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="hora" stroke="#666" />
        <YAxis stroke="#666" />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="visitantes"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="conversões"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
```

### frontend/src/components/Charts/PieChart.tsx

```
// src/components/Charts/PieChart.tsx
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"

const data = [
  { name: "Setor A", value: 35, color: "#3b82f6" },
  { name: "Setor B", value: 25, color: "#8b5cf6" },
  { name: "Setor C", value: 20, color: "#10b981" },
  { name: "Setor D", value: 15, color: "#f59e0b" },
  { name: "Outros", value: 5, color: "#6b7280" },
]

export const PieChart = () => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius="75%"
          dataKey="value"
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>

        <Tooltip
          formatter={(value) => [`${value}%`, "Participação"]}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />

        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
```

### frontend/src/components/Layout/BottomNav.tsx

```
import { NavLink } from "react-router-dom"
import ReactDOM from "react-dom"
import { useMemo } from "react"

type BottomNavProps = {
  onOpenAgent: () => void
}

export default function BottomNav({ onOpenAgent }: BottomNavProps) {
  const items = useMemo(
    () => [
      { label: "Radar", to: "/app/dashboard", icon: "🏠" },
      { label: "Lojas", to: "/app/stores", icon: "🏪" },
      { label: "Analytics", to: "/app/analytics", icon: "📊" },
      { label: "Alertas", to: "/app/alerts", icon: "🔔" },
    ],
    []
  )

  const content = (
    <nav className="dv-bottomnav" aria-label="Navegação inferior">
      <div className="dv-bottomnav__inner">
        <NavLink
          to={items[0].to}
          className={({ isActive }) =>
            `dv-bottomnav__item ${isActive ? "is-active" : ""}`
          }
        >
          <div className="dv-bottomnav__icon">{items[0].icon}</div>
          <span className="dv-bottomnav__label">{items[0].label}</span>
        </NavLink>

        <NavLink
          to={items[1].to}
          className={({ isActive }) =>
            `dv-bottomnav__item ${isActive ? "is-active" : ""}`
          }
        >
          <div className="dv-bottomnav__icon">{items[1].icon}</div>
          <span className="dv-bottomnav__label">{items[1].label}</span>
        </NavLink>

        <button
          type="button"
          onClick={onOpenAgent}
          className="dv-bottomnav__fab"
          aria-label="Abrir agente"
        >
          ⚡
        </button>

        <NavLink
          to={items[2].to}
          className={({ isActive }) =>
            `dv-bottomnav__item ${isActive ? "is-active" : ""}`
          }
        >
          <div className="dv-bottomnav__icon">{items[2].icon}</div>
          <span className="dv-bottomnav__label">{items[2].label}</span>
        </NavLink>

        <NavLink
          to={items[3].to}
          className={({ isActive }) =>
            `dv-bottomnav__item ${isActive ? "is-active" : ""}`
          }
        >
          <div className="dv-bottomnav__icon">{items[3].icon}</div>
          <span className="dv-bottomnav__label">{items[3].label}</span>
        </NavLink>
      </div>
    </nav>
  )

  return ReactDOM.createPortal(content, document.body)
}
```

### frontend/src/components/Layout/Header.tsx

```
import { useAuth } from "../../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import logo from "../../assets/logo.png"

type HeaderProps = {
  onOpenAgent?: () => void
}

const Header = ({ onOpenAgent }: HeaderProps) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (window.confirm("Tem certeza que deseja sair?")) {
      await logout()
      navigate("/login", { replace: true })
    }
  }

  const displayName = user?.username || user?.email || "Perfil"
  const initial = (user?.username || user?.email || "P").charAt(0).toUpperCase()

  return (
    <header className="bg-white shadow-sm border-b relative z-50">
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">

        {/* Left: Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <img src={logo} alt="DALE Vision" className="h-12 w-auto" />
          <h1 className="text-xl sm:text-2xl font-bold leading-none bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            DALE Vision
          </h1>

        </div>

        {/* Right: Actions + User */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* ✅ Desktop Agent button */}
          {onOpenAgent && (
            <button
              type="button"
              onClick={onOpenAgent}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg
              bg-gradient-to-r from-blue-500 to-purple-600
              text-white text-sm font-semibold shadow-sm
              border border-white/10
              hover:bg-white hover:from-transparent hover:to-transparent
              hover:border-gray-200
              transition group"
              aria-label="Abrir agente"
            >
              <span className="text-base leading-none">⚡</span>
             <span className="hidden md:inline group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent">
              DALE Copiloto
            </span>
            </button>
          )}

          {/* Dropdown */}
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label={`Perfil de ${displayName}`}
              title={`Perfil de ${displayName}`}
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {initial}
              </div>
              <span className="hidden md:inline text-gray-700">{displayName}</span>
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <button
                onClick={() => navigate("/app/profile")}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Meu Perfil
              </button>

              <button
                onClick={() => navigate("/app/settings")}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Configurações
              </button>
              <div className="border-t border-gray-100" />
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
```

### frontend/src/components/Layout/Layout.tsx

```
import { Outlet } from "react-router-dom"
import { useState } from "react"
import { Header, Sidebar } from "./index"
import { useIsMobile } from "../../hooks/useIsMobile"

import BottomNav from "./BottomNav"
import { AgentModal } from "../Agent/AgentModal"
import { useAgent } from "../../contexts/AgentContext"
import logo from "../../assets/logo.png"

const Layout = () => {
  const isMobile = useIsMobile(768)
  const [agentOpen, setAgentOpen] = useState(false)
  const { messages, addMessage } = useAgent()

  return (
    <>
      {/* CONTAINER PRINCIPAL - trava 100vh e controla scroll */}
      <div className="h-screen bg-gray-50 overflow-hidden">
        <Header onOpenAgent={() => setAgentOpen(true)} />

        {/* Área abaixo do header */}
        <div className="flex h-[calc(100vh-73px)] overflow-hidden">
          {!isMobile && <Sidebar />}

          {/* MAIN COM SCROLL PRÓPRIO */}
          <main
            className={`flex-1 overflow-y-auto p-4 sm:p-6 ${
              isMobile ? "pb-bottomnav" : ""
            }`}
          >
            <Outlet />
          </main>

          {/* ===================== AGENTE DESKTOP (PAINEL LATERAL) ===================== */}
          {!isMobile && (
            <aside
              className={`transition-all duration-200 ease-out border-l bg-[#0B0F14] overflow-hidden ${
                agentOpen
                  ? "w-[460px] opacity-100"
                  : "w-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className="h-full flex flex-col">
                {/* HEADER DO AGENTE */}
                <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={logo}
                      alt="DALE Copiloto"
                      className="h-10 w-10 rounded-md"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        DALE Copiloto
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        Insights e recomendações (em breve: dados reais)
                      </div>
                    </div>
                  </div>

                  <button
                    className="rounded-lg px-3 py-1 text-sm text-white/70 hover:bg-white/5"
                    onClick={() => setAgentOpen(false)}
                    type="button"
                    aria-label="Fechar agente"
                  >
                    ✕
                  </button>
                </div>

                {/* CORPO DO CHAT (SCROLL INDEPENDENTE) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-2xl border border-white/10 p-4 text-sm ${
                        m.role === "assistant"
                          ? "bg-white/5 text-white/70"
                          : "bg-blue-600/20 text-white"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                </div>

                {/* INPUT FIXO NO FUNDO */}
                <div className="p-4 border-t border-white/10 bg-[#0B0F14] shadow-[0_-4px_12px_rgba(0,0,0,0.35)]">
                  <div className="flex gap-2">
                    <input
                      placeholder="Como posso melhorar a conversão hoje?"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/20"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                          addMessage({
                            id: crypto.randomUUID(),
                            role: "user",
                            content: e.currentTarget.value,
                          })
                          e.currentTarget.value = ""
                        }
                      }}
                    />
                    <button
                      className="rounded-2xl bg-gradient-to-r from-lime-400 to-green-500 px-4 py-3 font-semibold text-black hover:brightness-105 transition"
                      aria-label="Enviar mensagem"
                      type="button"
                      onClick={() => {
                        const input = document.querySelector<HTMLInputElement>(
                          "aside input"
                        )
                        if (input?.value.trim()) {
                          addMessage({
                            id: crypto.randomUUID(),
                            role: "user",
                            content: input.value,
                          })
                          input.value = ""
                        }
                      }}
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ===================== MOBILE ===================== */}
      {isMobile && (
        <>
          <BottomNav onOpenAgent={() => setAgentOpen(true)} />
          <AgentModal open={agentOpen} onClose={() => setAgentOpen(false)} />
        </>
      )}
    </>
  )
}

export default Layout
```

### frontend/src/components/Layout/Sidebar.tsx

```
import { NavLink, useLocation } from "react-router-dom"
import {
  HomeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CameraIcon,
  BellAlertIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline"

const Sidebar = () => {
  const location = useLocation()

  // Considera aberto se estiver em qualquer rota de alertas
  const isAlertsOpen = location.pathname.startsWith("/app/alert")

  const navigation = [
    { name: "Dashboard", href: "/app/dashboard", icon: HomeIcon },
    { name: "Lojas", href: "/app/stores", icon: BuildingStorefrontIcon },
    { name: "Analytics", href: "/app/analytics", icon: ChartBarIcon },
    { name: "Câmeras", href: "/app/cameras", icon: CameraIcon },

    // Grupo ALERTAS (abre no HOVER)
    {
      name: "Alertas",
      href: "/app/alerts",
      icon: BellAlertIcon,
      children: [
        { name: "Feed", href: "/app/alerts" },
        { name: "Regras", href: "/app/alert-rules" },
        { name: "Logs", href: "/app/notification-logs" },
      ],
    },

    { name: "Configurações", href: "/app/settings", icon: Cog6ToothIcon },
  ]

  return (
    <aside className="hidden md:block w-64 bg-white border-r min-h-[calc(100vh-73px)]">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li
              key={item.name}
              className="relative group"
            >
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive || (item.name === "Alertas" && isAlertsOpen)
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                      : "text-gray-700 hover:bg-gray-50"
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </NavLink>

              {/* Submenu (abre no hover) */}
              {item.children && (
                <ul
                  className="
                    absolute left-full top-0 ml-1 w-40
                    bg-white border rounded-lg shadow-md
                    opacity-0 invisible
                    group-hover:opacity-100 group-hover:visible
                    transition-all duration-150
                    z-50
                  "
                >
                  {item.children.map((sub) => (
                    <li key={sub.href}>
                      <NavLink
                        to={sub.href}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm ${
                            isActive
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`
                        }
                      >
                        {sub.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
```

### frontend/src/components/Layout/index.ts

```
// src/components/Layout/index.ts
export { default as Header } from './Header';
export { default as Sidebar } from './Sidebar';
export { default as Layout } from './Layout';
```

### frontend/src/components/PrivateRoute.tsx

```
// src/components/PrivateRoute.tsx
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

interface PrivateRouteProps {
  children: React.ReactNode
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default PrivateRoute
```

### frontend/src/components/Skeletons/DashboardSkeleton.tsx

```
// src/components/Skeletons/DashboardSkeleton.tsx
export const DashboardSkeleton = () => {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-40 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### frontend/src/contexts/AgentContext.tsx

```
import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"


type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type AgentContextType = {
  messages: Message[]
  addMessage: (msg: Message) => void
  clearChat: () => void
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou o DALE Copiloto. Como posso ajudar com os dados da sua rede hoje?",
    },
  ])

  const addMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg])
  }

  const clearChat = () => setMessages([])

  return (
    <AgentContext.Provider value={{ messages, addMessage, clearChat }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error("useAgent must be used inside AgentProvider")
  return ctx
}
```

### frontend/src/contexts/AuthContext.tsx

```
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import { authService } from "../services/auth"
import type { User, LoginCredentials } from "../services/auth"

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1) Configurar token no axios (IMPORTANTE)
    authService.setupToken()

    // 2) Carregar dados do localStorage
    const currentUser = authService.getCurrentUser()
    const currentToken = authService.getToken()

    setUser(currentUser)
    setToken(currentToken)
    setIsLoading(false)

    // Debug
    console.log("AuthProvider - Usuário carregado:", currentUser)
    console.log("AuthProvider - Token existe:", !!currentToken)
  }, [])

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    console.log("AuthContext - Iniciando login com:", credentials)

    try {
      const response = await authService.login(credentials)
      console.log("AuthContext - Login bem sucedido:", response)

      // authService.login() já salvou no localStorage
      setUser(response.user)
      setToken(authService.getToken())

      // Debug
      console.log("AuthContext - Token salvo:", authService.getToken())
      console.log("AuthContext - Usuário salvo:", authService.getCurrentUser())
    } catch (error) {
      console.error("AuthContext - Erro no login:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    console.log("AuthContext - Iniciando logout")

    try {
      await authService.logout()
      setUser(null)
      setToken(null)
      console.log("AuthContext - Logout completo")
    } catch (error) {
      console.error("AuthContext - Erro no logout:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const isAuthenticated = !!token

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }

  console.log("AuthProvider - Valor do contexto:", {
    user: user?.username,
    isAuthenticated,
    isLoading,
  })

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

### frontend/src/hooks/useIsMobile.ts

```
import { useEffect, useState } from "react"

export function useIsMobile(breakpointPx: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < breakpointPx
  })

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpointPx)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [breakpointPx])

  return isMobile
}
```

### frontend/src/hooks/useRevealOnScroll.ts

```
import { useEffect } from "react"

type Options = {
  selector?: string
  rootMargin?: string
  threshold?: number
}

export function useRevealOnScroll(options: Options = {}) {
  const {
    selector = "[data-reveal]",
    rootMargin = "0px 0px -10% 0px",
    threshold = 0.12,
  } = options

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll(selector))
    if (!nodes.length) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("dv-reveal--in")
            io.unobserve(entry.target)
          }
        })
      },
      { rootMargin, threshold }
    )

    nodes.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [selector, rootMargin, threshold])
}
```

### frontend/src/index.css

```
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
}
body {
  overflow-x: hidden;
}

/* ===== Dale Vision BottomNav (mobile) ===== */
.dv-bottomnav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;

  /* MUITO importante: ficar acima do resto */
  z-index: 9999;

  border-top: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(11, 15, 20, 0.90);
  backdrop-filter: blur(10px);

  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}

.dv-bottomnav__inner {
  max-width: 520px;           /* um pouco mais flex */
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 6px;                   /* evita esmagar */
}

.dv-bottomnav__item {
  flex: 1;                    /* <-- em vez de width fixa */
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  font-size: 12px;
  color: rgba(255, 255, 255, 0.60);
  text-decoration: none;
}

.dv-bottomnav__item.is-active {
  color: #fff;
}

.dv-bottomnav__icon {
  font-size: 18px;
  line-height: 18px;
}

.dv-bottomnav__label {
  line-height: 1;
}

.dv-bottomnav__fab {
  margin-top: -32px;

  width: 56px;
  height: 56px;

  border-radius: 999px;
  border: 0;

  background: linear-gradient(90deg, #A3FF3B, #22C55E);
  color: #000;

  box-shadow: 0 10px 24px rgba(34, 197, 94, 0.20);

  /* anel para destacar do fundo */
  outline: 4px solid #0B0F14;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
}
:root {
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-top: env(safe-area-inset-top);
}

/* padding para não cortar no iPhone */
.pb-safe-bottom {
  padding-bottom: max(12px, var(--safe-bottom));
}

/* altura aproximada do bottom nav (ajustável) */
:root {
  --bottom-nav-h: 76px;
}

/* quando tiver bottomnav, dá folga no conteúdo */
.pb-bottomnav {
  padding-bottom: calc(var(--bottom-nav-h) + max(12px, var(--safe-bottom)));
}
@media (max-width: 360px) {
  .dv-bottomnav__item {
    font-size: 11px;
  }
  .dv-bottomnav__icon {
    font-size: 17px;
  }
}

/* ===== Dale Vision Agent Modal ===== */
.dv-agentmodal {
  padding-bottom: calc(16px + var(--bottom-nav-h) + max(12px, var(--safe-bottom)));
}

/* AgentModal panel: respeita bottom nav + safe area */
.dv-agent-panel {
  padding-bottom: calc(16px + var(--bottom-nav-h) + env(safe-area-inset-bottom));
}

/* área rolável do chat (pra não esmagar) */
.dv-agent-scroll {
  max-height: min(52vh, 420px);
  overflow: auto;
}
:root {
  --bottom-nav-h: 72px; /* ajuste ao seu BottomNav real */
}

.dv-safe-bottom {
  padding-bottom: calc(16px + var(--bottom-nav-h) + env(safe-area-inset-bottom));
}

/* =========================
   Dale Vision - Landing FX
========================= */

/* background grid */
.dv-grid {
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px);
  background-size: 56px 56px;
  background-position: center;
  mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 75%);
}

/* noise overlay (pure CSS) */
.dv-noise::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.08;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
}

/* spotlight glow */
.dv-spotlight::before {
  content: "";
  position: absolute;
  inset: -20%;
  background: radial-gradient(closest-side at 30% 20%, rgba(59,130,246,0.22), transparent 55%),
              radial-gradient(closest-side at 70% 30%, rgba(168,85,247,0.18), transparent 60%),
              radial-gradient(closest-side at 50% 80%, rgba(34,211,238,0.10), transparent 60%);
  filter: blur(10px);
  pointer-events: none;
}

/* gradient line separators */
.dv-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59,130,246,0.40), rgba(168,85,247,0.40), transparent);
  opacity: 0.9;
}

/* reveal animations */
.dv-reveal {
  opacity: 0;
  transform: translateY(12px) scale(0.99);
  filter: blur(6px);
  transition: opacity 700ms ease, transform 700ms ease, filter 700ms ease;
  will-change: opacity, transform, filter;
}

.dv-reveal.dv-reveal--in {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

/* premium card hover */
.dv-card {
  transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease;
}

.dv-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.22);
  box-shadow: 0 20px 60px rgba(0,0,0,0.45);
}

/* CTA shine */
@keyframes dv-shine {
  0% { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
  20% { opacity: .6; }
  60% { opacity: .25; }
  100% { transform: translateX(140%) skewX(-12deg); opacity: 0; }
}

.dv-cta {
  position: relative;
  overflow: hidden;
}

<<truncated>>
```

### frontend/src/main.tsx

```
// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { HelmetProvider } from "react-helmet-async"
import { Toaster } from "react-hot-toast"

import { AuthProvider } from "./contexts/AuthContext"
import { AgentProvider } from "./contexts/AgentContext"
import { alertsService } from "./services/alerts"

import App from "./App"
import "./index.css"

declare global {
  interface Window {
    alertsService: typeof alertsService
  }
}

window.alertsService = alertsService

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AgentProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "#363636",
                    color: "#fff",
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: "green",
                      secondary: "black",
                    },
                  },
                }}
              />
            </AgentProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
)
```

### frontend/src/pages/AgendarDemo/AgendarDemo.tsx

```
import { useMemo, useState } from "react"
import toast from "react-hot-toast"

import logo from "../../assets/logo.png"
import { demoService } from "../../services/demo"

type StoresRange = "1" | "2-5" | "6-20" | "20+"
type CamerasRange = "1-3" | "4-10" | "11-50" | "50+"

type GoalValue =
  | "loss_prevention"
  | "queues"
  | "productivity"
  | "standardization"
  | "security"
  | "heatmap"
  | "other"

type SetupWhereValue = "store_pc" | "nvr_server" | "not_sure"
type AccessWhoValue = "owner" | "store_manager" | "staff" | "not_sure"
type HowHeardValue =
  | "referral"
  | "instagram"
  | "linkedin"
  | "google"
  | "youtube"
  | "partner"
  | "event"
  | "other"
  
const HOW_HEARD: { label: string; value: HowHeardValue }[] = [
  { label: "Indicação", value: "referral" },
  { label: "Instagram", value: "instagram" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Google / Busca", value: "google" },
  { label: "YouTube", value: "youtube" },
  { label: "Parceiro", value: "partner" },
  { label: "Evento", value: "event" },
  { label: "Outro", value: "other" },
]
const CAMERA_BRANDS = [
  "Intelbras",
  "Hikvision",
  "Dahua",
  "Chinesas genéricas",
  "Outras",
  "Não sei informar",
] as const

const GOALS: { label: string; value: GoalValue }[] = [
  { label: "Reduzir perdas / fraudes", value: "loss_prevention" },
  { label: "Reduzir filas e melhorar atendimento", value: "queues" },
  { label: "Aumentar produtividade da equipe", value: "productivity" },
  { label: "Padronizar operação entre lojas", value: "standardization" },
  { label: "Segurança e incidentes", value: "security" },
  { label: "Entender fluxo / heatmap / conversão", value: "heatmap" },
  { label: "Outro", value: "other" },
]

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "")
}

// regra: aceitar BR com 11 dígitos (DDD + 9 dígitos)
// se vier com 55 (13 dígitos), normaliza para 11
function normalizeWhatsappToBR11(input: string) {
  const d = onlyDigits(input)
  if (d.length === 13 && d.startsWith("55")) return d.slice(2)
  return d
}

function isValidWhatsappBR11Mobile(input: string) {
  const br = normalizeWhatsappToBR11(input)
  if (br.length !== 11) return false
  const thirdDigit = br[2] // índice 0-1 DDD, índice 2 começa número
  return thirdDigit === "9"
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim())
}

/**
 * Score interno: simples e estável.
 * (não exibir no form; só enviar pro backend)
 */
function computeQualifiedScore(args: {
  storesRange: StoresRange
  camerasRange: CamerasRange
  cameraBrandsCount: number
  goalsCount: number
}) {
  const storesWeight: Record<StoresRange, number> = {
    "1": 10,
    "2-5": 25,
    "6-20": 40,
    "20+": 55,
  }

  const camsWeight: Record<CamerasRange, number> = {
    "1-3": 10,
    "4-10": 20,
    "11-50": 35,
    "50+": 45,
  }

  const brands = Math.min(args.cameraBrandsCount, 4) * 5 // até 20
  const goals = Math.min(args.goalsCount, 4) * 5 // até 20

  const score = storesWeight[args.storesRange] + camsWeight[args.camerasRange] + brands + goals
  return Math.max(0, Math.min(100, score))
}

export default function AgendarDemo() {
  const [loading, setLoading] = useState(false)

  // dados pessoais
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [howHeard, setHowHeard] = useState<HowHeardValue | "">("")
  const [howHeardOther, setHowHeardOther] = useState("")

  // negócio
  const [operationType, setOperationType] = useState("")
  const [storesRange, setStoresRange] = useState<StoresRange | "">("")
  const [camerasRange, setCamerasRange] = useState<CamerasRange | "">("")
  const [cameraBrands, setCameraBrands] = useState<string[]>([])
  const [city, setCity] = useState("")
  const [stateUF, setStateUF] = useState("")

  // ativação (opcional) — pós-demo
  const [setupWhere, setSetupWhere] = useState<SetupWhereValue | "">("")
  const [accessWho, setAccessWho] = useState<AccessWhoValue | "">("")

  // objetivos (multi)
  const [goals, setGoals] = useState<GoalValue[]>([])
  const [goalOther, setGoalOther] = useState("")

  const [consent, setConsent] = useState(false)

  const hasOther = goals.includes("other")

  // “principal” = primeiro objetivo selecionado que não seja other; se só tiver other, other
  const primaryGoal: GoalValue | "" = useMemo(() => {
    if (!goals.length) return ""
    const nonOther = goals.find((g) => g !== "other")
    return nonOther || "other"
  }, [goals])

  const qualifiedScore = useMemo(() => {
    if (!storesRange || !camerasRange) return 0
    return computeQualifiedScore({
      storesRange,
      camerasRange,
      cameraBrandsCount: cameraBrands.length,
      goalsCount: goals.filter((g) => g !== "other").length + (hasOther ? 1 : 0),
    })
  }, [storesRange, camerasRange, cameraBrands.length, goals, hasOther])

  function toggleBrand(brand: (typeof CAMERA_BRANDS)[number]) {
    setCameraBrands((prev) => {
      const exists = prev.includes(brand)
      // “Não sei informar” deve ser exclusivo
      if (brand === "Não sei informar") {
        return exists ? [] : ["Não sei informar"]
      }
      // se escolher qualquer marca, remove “Não sei informar”
      const cleaned = prev.filter((b) => b !== "Não sei informar")
      return exists ? cleaned.filter((b) => b !== brand) : [...cleaned, brand]
    })
  }

  function toggleGoal(goal: GoalValue) {
    setGoals((prev) => {
      const exists = prev.includes(goal)
      return exists ? prev.filter((g) => g !== goal) : [...prev, goal]
    })
  }

  async function handleSubmit() {
    const nameClean = name.trim()
    const emailClean = email.trim()
    const whatsappClean = normalizeWhatsappToBR11(whatsapp)

    if (!nameClean) return toast.error("Informe seu nome completo.")
    if (!emailClean || !isValidEmail(emailClean)) return toast.error("Informe um e-mail válido.")
    if (!isValidWhatsappBR11Mobile(whatsapp)) {
      return toast.error("WhatsApp inválido. Use DDD + número de celular (11 dígitos, começando com 9).")
    }
    if (!operationType.trim()) return toast.error("Informe o tipo/segmento da operação.")
    if (!storesRange) return toast.error("Selecione a faixa de quantidade de lojas.")
    if (!camerasRange) return toast.error("Selecione a faixa de quantidade de câmeras.")
    if (!goals.length) return toast.error("Selecione pelo menos 1 objetivo.")
    if (hasOther && !goalOther.trim()) return toast.error('Preencha o campo "Outro" (objetivo).')
    if (!consent) return toast.error("É necessário concordar em receber comunicações sobre a demo.")
    if (!howHeard) return toast.error("Diga como você soube de nós.")
    if (howHeard === "other" && !howHeardOther.trim()) {
      return toast.error('Preencha o campo "Outro" (como soube de nós).')
    }

    try {
      setLoading(true)

      const payload = {
        contact_name: nameClean,
        email: emailClean,
        whatsapp: whatsappClean, // BR 11 dígitos (sem +55)

        operation_type: operationType.trim(),
        stores_range: storesRange,
        cameras_range: camerasRange,
        camera_brands_json: cameraBrands, // array (opcional — pode vir vazio)

        pilot_city: city.trim() ? city.trim() : null,
        pilot_state: stateUF.trim() ? stateUF.trim().toUpperCase() : null,

        primary_goal: primaryGoal || null,
        primary_goals: goals,

<<truncated>>
```

### frontend/src/pages/AlertRules/AlertRules.tsx

```
// frontend/src/pages/AlertRules/AlertRules.tsx
// src/pages/AlertRules/AlertRules.tsx
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { alertsService, type AlertRule } from "../../services/alerts"

type Severity = "critical" | "warning" | "info"

const defaultChannels = { dashboard: true, email: false, whatsapp: false }

export default function AlertRulesPage() {
  const qc = useQueryClient()

  const [storeId, setStoreId] = useState<string>("")
  const [type, setType] = useState("queue_long")
  const [severity, setSeverity] = useState<Severity>("warning")
  const [cooldown, setCooldown] = useState<number>(15)
  const [active, setActive] = useState(true)
  const [channels, setChannels] = useState(defaultChannels)

  const [showCreate, setShowCreate] = useState(true)

  // ✅ stores do CORE (UUID)
  const storesQ = useQuery({
    queryKey: ["alerts", "coreStores"],
    queryFn: alertsService.listCoreStores,
  })

  // seta store default
  useEffect(() => {
    if (!storeId && storesQ.data?.length) {
      setStoreId(String(storesQ.data[0].id))
    }
  }, [storeId, storesQ.data])

  // ✅ regras por store UUID
  const rulesQ = useQuery({
    queryKey: ["alerts", "rules", storeId],
    queryFn: () => alertsService.listRules(storeId),
    enabled: Boolean(storeId),
  })

  const createMut = useMutation({
    mutationFn: (payload: Partial<AlertRule> & { store_id: string }) =>
      alertsService.createRule(payload),
    onSuccess: async () => {
      toast.success("Regra criada ✅")
      await qc.invalidateQueries({ queryKey: ["alerts", "rules", storeId] })
      setShowCreate(false)
    },
    onError: (err: any) => {
      console.error(err)
      toast.error("Erro ao salvar regra. Verifique o backend e tente novamente.")
    },
  })

  const rules = useMemo(() => rulesQ.data ?? [], [rulesQ.data])

  function toggleChannel(key: "dashboard" | "email" | "whatsapp") {
    setChannels((c) => ({ ...c, [key]: !c[key] }))
  }

  async function handleCreate() {
    if (!storeId) {
      toast.error("Selecione uma loja")
      return
    }
    if (!type.trim()) {
      toast.error("Informe o tipo do evento")
      return
    }

    createMut.mutate({
      store_id: storeId, // service converte pra "store"
      type: type.trim(),
      severity,
      cooldown_minutes: Number(cooldown) || 0,
      active,
      channels,
      threshold: {},
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regras de Alertas</h1>
          <p className="text-gray-600">
            Configure quais eventos geram alertas e por quais canais.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => rulesQ.refetch()}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Nova Regra
          </button>
        </div>
      </div>

      {/* Store select */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-gray-900">Loja</div>
            <div className="text-sm text-gray-500">Selecione a loja para gerenciar as regras.</div>
            {storeId && <div className="text-sm text-blue-700 mt-2">Selecionada: {storesQ.data?.find(s => s.id === storeId)?.name}</div>}
          </div>

          <div className="w-full md:w-80">
            <label className="sr-only" htmlFor="rules-store">Loja</label>
            <select
              id="rules-store"
              aria-label="Selecionar loja"
              title="Selecionar loja"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              disabled={storesQ.isLoading}
            >
              {(storesQ.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Criar regra</h2>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">Tipo do evento</label>
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="queue_long"
              />
              <div className="mt-2 text-xs text-gray-500">
                Ex.: queue_long, staff_missing, suspicious_cancel
              </div>
            </div>

            <div>
              <label htmlFor="rule-severity" className="text-sm font-semibold text-gray-700">
                Severidade
              </label>

              <select
                id="rule-severity"
                aria-label="Severidade da regra"
                title="Severidade da regra"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="critical">critical</option>
                <option value="warning">warning</option>
                <option value="info">info</option>
              </select>
            </div>


            <div>
              <label htmlFor="rule-cooldown" className="text-sm font-semibold text-gray-700">
                Cooldown (min)
              </label>

              <input
                id="rule-cooldown"
                aria-label="Cooldown em minutos"
                title="Cooldown em minutos"
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2"
                min={0}
                placeholder="15"
              />

              <div className="mt-2 text-xs text-gray-500">
                Evita spam do mesmo alerta por X minutos.
              </div>
            </div>


            <div className="flex items-start gap-3 pt-7">
              <input
                id="rule-active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}

<<truncated>>
```

### frontend/src/pages/Alerts/Alerts.tsx

```
// src/pages/Alerts/Alerts.tsx
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  useAlertsEvents,
  useAlertLogs,
  useIgnoreEvent,
  useResolveEvent,
  useIngestAlert,
} from "../../queries/alerts.queries"
import { alertsService } from "../../services/alerts"
import toast from "react-hot-toast"

type FilterSeverity = "all" | "critical" | "warning" | "info"
type FilterStatus = "all" | "open" | "resolved" | "ignored"

const severityStyles: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
  info: "border-blue-200 bg-blue-50 text-blue-700",
}

const severityLabel: Record<string, string> = {
  critical: "CRÍTICO",
  warning: "ATENÇÃO",
  info: "INFO",
}

function formatHHMM(iso?: string) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

// ✅ Normaliza respostas do backend (array direto, {data:[...]}, {results:[...]})
function normalizeArray<T = any>(input: any): T[] {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (Array.isArray(input.data)) return input.data
  if (Array.isArray(input.results)) return input.results
  return []
}

export default function Alerts() {
  const [query, setQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>("all")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("open")
  const [storeId, setStoreId] = useState<string>("")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // lojas (CORE UUID) - pra filtro de alerts
  const { data: storesRaw, isLoading: storesLoading } = useQuery({
    queryKey: ["alerts", "coreStores"],
    queryFn: alertsService.listCoreStores,
  })
  const stores = normalizeArray<any>(storesRaw)

  // eventos
  const eventsQuery = useAlertsEvents({
    store_id: storeId || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  })

  // ✅ evita crash: garante array
  const events = useMemo(
    () => normalizeArray<any>(eventsQuery.data),
    [eventsQuery.data]
  )

  // logs do evento selecionado
  const logsQuery = useAlertLogs({
    event_id: selectedEventId || undefined,
  })

  const resolveMut = useResolveEvent()
  const ignoreMut = useIgnoreEvent()
  const ingestMut = useIngestAlert()

  const isDev = import.meta.env.DEV // Vite: só aparece em dev

  function handleSimularEvento() {
    console.log("[SIMULATE] clicked", { storeId })
    if (!storeId) {
      toast.error("Selecione uma loja para simular o evento.")
      return
    }

    const now = new Date()
    const payload = {
      store_id: storeId,
      event_type: "queue_long",
      severity: "warning",
      title: "Simulação: fila longa",
      description: "Evento simulado via UI (dev-only).",
      occurred_at: now.toISOString(),
      metadata: {
        source: "ui_simulator",
        ts: now.getTime(),
      },
      receipt_id: `ui-dev-${Date.now()}`,
    }

    ingestMut.mutate(payload as any, {
      onSuccess: (res: any) => {
        toast.success("Evento simulado com sucesso ✅")
        // abre o drawer automaticamente
        const createdId = res?.event?.id
        if (createdId) setSelectedEventId(String(createdId))

        // garante refresh do feed
        eventsQuery.refetch()
      },
      onError: (err: any) => {
        console.error(err)
        toast.error("Falha ao simular evento. Veja console / backend.")
      },
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return events.filter((e: any) => {
      const matchQuery =
        !q ||
        (e.title || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.type || "").toLowerCase().includes(q) ||
        String(e.store_id || "").toLowerCase().includes(q)

      const matchSeverity =
        severityFilter === "all" ? true : e.severity === severityFilter

      return matchQuery && matchSeverity
    })
  }, [events, query, severityFilter])

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null
    return (
      events.find((e: any) => String(e.id) === String(selectedEventId)) || null
    )
  }, [events, selectedEventId])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Alertas
          </h1>
          <p className="text-gray-600 mt-1">
            Feed de eventos e recomendações acionáveis (dados reais)
          </p>

          {/* ✅ DEV-ONLY */}
          {isDev && (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleSimularEvento}
                disabled={!storeId || ingestMut.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                aria-label="Simular evento"
                title="Simular evento (dev-only)"
              >
                {ingestMut.isPending ? "Simulando..." : "🧪 Simular Evento"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* store */}
          <div className="w-full sm:w-60">
            <label className="sr-only" htmlFor="alerts-store">
              Loja
            </label>
            <select
              id="alerts-store"
              title="Filtrar por loja"
              aria-label="Filtrar por loja"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              disabled={storesLoading}
            >
              <option value="">Todas as lojas</option>
              {stores.map((s: any) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* search */}
          <div className="relative w-full sm:w-72">
            <label htmlFor="alerts-search" className="sr-only">
              Buscar alertas
            </label>
            <input
              id="alerts-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, tipo, descrição..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-gray-400">
              ⌕
            </span>
          </div>

          {/* severity */}
          <div className="w-full sm:w-auto">
            <select
              id="alerts-severity"

<<truncated>>
```

### frontend/src/pages/Analytics/Analytics.tsx

```
// src/pages/Analytics/Analytics.tsx
// src/pages/Analytics/Analytics.tsx
const Analytics = () => {
  return (
    <div className="space-y-6">
      {/* Header mobile-first */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-600 mt-1">Análises avançadas e insights detalhados</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="period" className="sr-only">
            Selecionar período
          </label>

          <select
            id="period"
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2"
            aria-label="Selecionar período"
          >
            <option>Últimos 7 dias</option>
            <option>Últimos 30 dias</option>
            <option>Últimos 90 dias</option>
          </select>

          <button className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[
          { title: "Total de Visitantes", value: "12,458", change: "+12.5%" },
          { title: "Taxa de Conversão", value: "67.8%", change: "+4.2%" },
          { title: "Ticket Médio", value: "R$ 142.50", change: "+8.3%" },
        ].map((metric, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              {metric.title}
            </h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold text-gray-800 mr-2">
                {metric.value}
              </span>
              <span
                className={`text-sm font-medium ${
                  metric.change.startsWith("+") ? "text-green-600" : "text-red-600"
                }`}
              >
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Blocos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Evolução de Métricas
          </h3>
          <div className="h-[260px] sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Gráfico de evolução (em desenvolvimento)</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Comparativo entre Lojas
          </h3>
          <div className="h-[260px] sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Gráfico comparativo (em desenvolvimento)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
```

### frontend/src/pages/Cameras/Cameras.tsx

```
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  storesService,
  type Store,
  type StoreEdgeStatus,
} from "../../services/stores"
import { formatAge, formatReason } from "../../utils/edgeReasons"

const Cameras = () => {
  const [selectedStore, setSelectedStore] = useState("")

  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
  })

  const {
    data: edgeStatus,
    isLoading: edgeStatusLoading,
    error: edgeStatusError,
  } = useQuery<StoreEdgeStatus>({
    queryKey: ["store-edge-status", selectedStore],
    queryFn: () => storesService.getStoreEdgeStatus(selectedStore),
    enabled: Boolean(selectedStore && selectedStore !== "all"),
  })


  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-800">Câmeras</h1>
          <p className="text-gray-600 mt-1">
            Status e saúde das câmeras por loja
          </p>
        </div>

        {stores && stores.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label
              htmlFor="store-select"
              className="text-gray-700 font-semibold text-sm"
            >
              Loja
            </label>

            <div className="flex items-center gap-2">
              <select
                id="store-select"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full sm:w-[320px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={storesLoading}
                aria-label="Selecionar loja para visualizar câmeras"
              >
                <option value="">Selecione uma loja</option>
                <option value="all">Todas as lojas</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>

              {storesLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Status das câmeras
        </h2>
        <button
          type="button"
          onClick={async () => {
            const url =
              import.meta.env.VITE_EDGE_SETUP_URL || "http://localhost:7860/"
            try {
              await fetch(url, { method: "GET", mode: "no-cors" })
              window.open(url, "_blank", "noreferrer")
            } catch (error) {
              window.alert(
                "Não foi possível abrir o Edge Setup. Verifique se o serviço está rodando."
              )
            }
          }}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Abrir Edge Setup
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Certifique-se de que o Edge Setup está rodando
      </p>

      {!selectedStore || selectedStore === "all" ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-gray-500">
          Selecione uma loja para ver status das câmeras.
        </div>
      ) : edgeStatusLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-gray-500">
          Carregando status...
        </div>
      ) : edgeStatusError ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-red-600">
          Falha ao carregar status das câmeras
        </div>
      ) : edgeStatus && edgeStatus.cameras.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">Status da loja</p>
                <p className="text-lg font-semibold text-gray-800">
                  {edgeStatus.store_status === "online"
                    ? "Loja Online"
                    : edgeStatus.store_status === "degraded"
                    ? "Loja Instável"
                    : edgeStatus.store_status === "offline"
                    ? "Loja Offline"
                    : "Status desconhecido"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Último heartbeat há{" "}
                  <span className="font-semibold text-gray-700">
                    {formatAge(edgeStatus.store_status_age_seconds)}
                  </span>
                </p>
                {edgeStatus.store_status_reason && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatReason(edgeStatus.store_status_reason)}
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  edgeStatus.store_status === "online"
                    ? "bg-green-100 text-green-800"
                    : edgeStatus.store_status === "degraded"
                    ? "bg-yellow-100 text-yellow-800"
                    : edgeStatus.store_status === "offline"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {edgeStatus.store_status ?? "unknown"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {edgeStatus.cameras.map((cam) => (
              <div
                key={cam.camera_id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {cam.name}
                    </p>
                    <p className="text-xs text-gray-500">{cam.camera_id}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      cam.status === "online"
                        ? "bg-green-100 text-green-800"
                        : cam.status === "degraded"
                        ? "bg-yellow-100 text-yellow-800"
                        : cam.status === "offline"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {cam.status}
                  </span>
                </div>

                <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Idade:</span>
                  <span>{formatAge(cam.age_seconds)}</span>
                </div>

                {cam.reason && (
                  <p className="text-xs text-gray-500 mt-2">
                    {formatReason(cam.reason)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 text-gray-500">
          <p className="mb-3">Nenhuma câmera encontrada.</p>
          <button
            type="button"
            onClick={async () => {
              const url =
                import.meta.env.VITE_EDGE_SETUP_URL || "http://localhost:7860/"
              try {
                await fetch(url, { method: "GET", mode: "no-cors" })
                window.open(url, "_blank", "noreferrer")
              } catch (error) {
                window.alert(
                  "Não foi possível abrir o Edge Setup. Verifique se o serviço está rodando."
                )
              }
            }}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Abrir Edge Setup
          </button>
        </div>
      )}

<<truncated>>
```

### frontend/src/pages/Dashboard/Dashboard.tsx

```
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import {
  storesService,
  type NetworkDashboard,
  type Store,
  type StoreEdgeStatus,
} from "../../services/stores"
import { formatAge, formatReason } from "../../utils/edgeReasons"
import {
  useAlertsEvents,
  useIgnoreEvent,
  useResolveEvent,
} from "../../queries/alerts.queries"
import type { StoreDashboard } from "../../types/dashboard"
import { LineChart } from "../../components/Charts/LineChart"
import { PieChart } from "../../components/Charts/PieChart"

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  color: string
  subtitle?: string
}

const MetricCard = ({
  title,
  value,
  icon,
  trend,
  color,
  subtitle,
}: MetricCardProps) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow min-w-0">
    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>

      {trend !== undefined && (
        <span
          className={`text-xs sm:text-sm font-medium ${
            trend > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend > 0 ? "+" : ""}
          {trend}%
        </span>
      )}
    </div>

    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 break-words">
      {value}
    </h3>
    <p className="text-gray-700 font-semibold text-sm sm:text-base">{title}</p>
    {subtitle && (
      <p className="text-gray-400 text-xs sm:text-sm mt-1">{subtitle}</p>
    )}
  </div>
)

interface RecommendationCardProps {
  title: string
  description: string
  priority: string
  impact: string
}

const RecommendationCard = ({
  title,
  description,
  priority,
  impact,
}: RecommendationCardProps) => {
  const priorityColors = {
    high: "border-red-500 bg-red-50",
    medium: "border-yellow-500 bg-yellow-50",
    low: "border-blue-500 bg-blue-50",
  }

  const priorityLabels = {
    high: "Alta Prioridade",
    medium: "Média Prioridade",
    low: "Baixa Prioridade",
  }

  return (
    <div
      className={`border-l-4 ${
        priorityColors[priority as keyof typeof priorityColors]
      } pl-4 py-3 pr-3 rounded-r-lg`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-gray-800 leading-snug">{title}</h4>
        <span
          className={`shrink-0 px-2 py-1 text-[11px] font-semibold rounded ${
            priority === "high"
              ? "bg-red-100 text-red-800"
              : priority === "medium"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {priorityLabels[priority as keyof typeof priorityLabels]}
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-2">{description}</p>
      <p className="text-gray-500 text-xs">🎯 Impacto: {impact}</p>
    </div>
  )
}

const ALL_STORES_VALUE = "all"

const buildNetworkDashboard = (
  network: NetworkDashboard | null,
  stores: Store[]
): StoreDashboard => {
  const storeCount = network?.total_stores ?? stores.length
  const activeAlerts = network?.active_alerts ?? Math.max(0, storeCount - 1)

  const healthScore = Math.min(95, 70 + storeCount * 2)
  const productivity = Math.min(92, 65 + storeCount * 3)
  const idleTime = Math.max(8, 20 - storeCount)
  const visitorFlow = Math.max(0, storeCount * 500)
  const conversionRate = Math.min(78, 45 + storeCount * 2)
  const avgCartValue = 120 + storeCount * 4

  return {
    store: {
      id: ALL_STORES_VALUE,
      name: "Todas as lojas",
      owner_email: "Visao agregada",
      plan: "network",
      status: "active",
    },
    metrics: {
      health_score: healthScore,
      productivity,
      idle_time: idleTime,
      visitor_flow: visitorFlow,
      conversion_rate: conversionRate,
      avg_cart_value: avgCartValue,
    },
    insights: {
      peak_hour: "10:00-12:00",
      best_selling_zone: "Mix de zonas",
      employee_performance: {
        best: "Equipe com melhor desempenho",
        needs_attention: "Equipe com menor desempenho",
      },
    },
    recommendations: [
      {
        id: "network_rec_1",
        title: "Reforcar equipes nos horarios de pico",
        description: "Distribuir equipes conforme a demanda agregada da rede.",
        priority: "high",
        action: "staffing",
        estimated_impact: "Reducao de filas e melhor conversao.",
      },
      {
        id: "network_rec_2",
        title: "Padronizar boas praticas",
        description: "Replicar processos das lojas com melhor desempenho.",
        priority: "medium",
        action: "process",
        estimated_impact: "Aumento gradual de produtividade.",
      },
    ],
    alerts:
      activeAlerts > 0
        ? [
            {
              type: "network_alerts",
              message: `${activeAlerts} alertas ativos na rede`,
              severity: activeAlerts > 5 ? "high" : "medium",
              time: new Date().toISOString(),
            },
          ]
        : [],
  }
}

const Dashboard = () => {
  const { user } = useAuth()
  const [selectedStore, setSelectedStore] = useState<string>(ALL_STORES_VALUE)
  const [dashboard, setDashboard] = useState<StoreDashboard | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [resolvingEventId, setResolvingEventId] = useState<string | null>(null)
  const [ignoringEventId, setIgnoringEventId] = useState<string | null>(null)

  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
  })

  const {
    data: edgeStatus,
    isLoading: edgeStatusLoading,
  } = useQuery<StoreEdgeStatus>({
    queryKey: ["store-edge-status", selectedStore],
    queryFn: () => storesService.getStoreEdgeStatus(selectedStore),
    enabled: selectedStore !== ALL_STORES_VALUE,
  })

  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useAlertsEvents({
    store_id: selectedStore === ALL_STORES_VALUE ? undefined : selectedStore,
    status: "open",
  }, {
    enabled: Boolean(selectedStore && selectedStore !== ALL_STORES_VALUE),
  })

  const resolveEvent = useResolveEvent()

<<truncated>>
```

### frontend/src/pages/Home/Home.tsx

```
import { Link, useNavigate } from "react-router-dom"
import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Helmet } from "react-helmet-async"
import logo from "../../assets/logo.png"
import { useRevealOnScroll } from "../../hooks/useRevealOnScroll"

const WHATSAPP_DEMO =
  "https://api.whatsapp.com/send/?phone=5511996918070&text=Quero%20meu%20teste%20de%2048h%20da%20DaleVision&type=phone_number&app_absent=0"

// === BRAND (use sempre a mesma assinatura) ===
function GradientTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 bg-clip-text text-transparent">
      {children}
    </span>
  )
}

function BrandPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  )
}

function BrandButton({
  children,
  href,
  className = "",
}: {
  children: React.ReactNode
  href: string
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "dv-cta inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 px-8 py-4 text-center font-bold text-black text-lg shadow-xl hover:opacity-95 hover:shadow-blue-500/25 transition-all " +
        className
      }
    >
      {children}
    </a>
  )
}

// Hook: rotaciona índice para o slide de frases (sem framer-motion)
function useRotatingIndex(length: number, delay = 4500) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (length <= 1) return
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % length)
    }, delay)
    return () => window.clearInterval(id)
  }, [length, delay])

  return index
}

// FAQ item com hover + click mobile
function FaqItem({
  q,
  a,
  icon,
  isOpen,
  onToggle,
  onHoverOpen,
  onHoverClose,
}: {
  q: string
  a: string
  icon: string
  isOpen: boolean
  onToggle: () => void
  onHoverOpen: () => void
  onHoverClose: () => void
}) {
  return (
    <div
      className="dv-card rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/7 hover:border-white/20"
      onMouseEnter={onHoverOpen}
      onMouseLeave={onHoverClose}
    >
      <button
        type="button"
        className="w-full text-left"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <div className="text-lg">{icon}</div>
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white/90">
              {q}
            </h3>
          </div>

          <div
            className={`text-white/60 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-4 pt-4 border-t border-white/10 text-white/70 leading-relaxed pl-14">
          {a}
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useRevealOnScroll({ selector: "[data-reveal]" })

  useEffect(() => {
    if (isAuthenticated) navigate("/app/dashboard")
  }, [isAuthenticated, navigate])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DaleVision | Visão Computacional Aplicada ao Varejo",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Reduza horas ociosas e não perca clientes por falta de atendimento. Teste 48h gratuito usando suas câmeras Intelbras/CFTV existentes.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      description: "Teste 48h gratuito com relatório de ociosidade e filas",
    },
  }

  // DORES (frases rotativas — slide lateral)
  const pains = useMemo(
    () => [
      {
        title: "Enquanto você lê isso,",
        highlight: "há clientes indo embora",
        sub: "Fila estoura → cliente reclama. Quando você fica sabendo, a venda já se perdeu.",
      },
      {
        title: "Eu só descubro o problema",
        highlight: "depois que já aconteceu",
        sub: "Sem evidência, a operação vira reação — e isso não escala em 20+ lojas.",
      },
      {
        title: "Sempre falta alguém no turno",
        highlight: "e atrasos viraram rotina",
        sub: "Ociosidade de um lado, fila do outro. Margem vazando sem você perceber.",
      },
      {
        title: "Quebra, erro ou furto",
        highlight: "só aparece no fechamento",
        sub: "Sem histórico e prova, você age tarde — e paga caro pela falta de prevenção.",
      },
      {
        title: "Você confia nos líderes,",
        highlight: "mas não tem visibilidade",
        sub: "Relato não é dado. Intuição não replica. Você precisa de métricas por loja e turno.",
      },
    ],
    []
  )

  const painIndex = useRotatingIndex(pains.length, 4800)

  // FAQ ordenada (já está ordenada por fluxo de objeções)
  const faqs = useMemo(
    () => [
      {
        icon: "🚨",
        q: "Como são os alertas em tempo real?",
        a: "Alertas por WhatsApp/e-mail/painel quando detectamos filas acima do limite, cliente esperando, picos de fluxo sem cobertura, ociosidade crítica ou eventos em zonas sensíveis.",
      },
      {
        icon: "🤖",
        q: "Como funciona a classificação de comportamentos?",
        a: "A IA identifica padrões de atividade operacional (atendimento, espera, organização, inatividade) sem reconhecimento facial e sem identificar pessoas — foco é gestão da operação.",
      },
      {
        icon: "📊",
        q: "Como funciona o cálculo de ociosidade da equipe?",
        a: "Analisamos presença e atividade em zonas configuradas. Quando há baixa atividade produtiva por um período, contabilizamos como ociosidade. Os relatórios saem por turno, loja e contexto operacional (sem identificar pessoas).",
      },

<<truncated>>
```

### frontend/src/pages/Login/Login.tsx

```
// src/pages/Login/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth(); // ← login é uma função do contexto
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log('=== TENTATIVA DE LOGIN ===');

    try {
      // 🔵 OPÇÃO 1: Usar o login do contexto (recomendado)
      console.log('Usando login do contexto...');
      await login({ username, password });
      
      // 🔵 OPÇÃO 2: Se quiser testar com fetch direto (descomente):
      /*
      console.log('Testando com fetch direto...');
      const response = await fetch('http://localhost:8000/api/accounts/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('Fetch response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Fetch error data:', errorData);
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      console.log('Fetch success data:', data);

      // Salvar token manualmente (já é feito pelo authService)
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      */

      console.log('✅ Login bem sucedido! Redirecionando...');
      navigate('/app/dashboard');

    } catch (err: any) {
      console.error('❌ Erro no login:', err);
      console.error('Detalhes do erro:', err.response?.data);
      
      // Mensagens de erro mais específicas
      const errorMessage = 
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        err.message ||
        'Usuário ou senha incorretos';
      
      setError(errorMessage);
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br bg-gradient-to-r from-blue-500 to-purple-600 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
              <img src={logo} alt="DALE Vision" className="h-12 w-auto" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 
                bg-clip-text text-transparent">DALE Vision</h1>
            <p className="text-gray-600 mt-2">Gestão inteligente para suas lojas</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Usuário
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Digite seu usuário"
                  required
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Digite sua senha"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-2 font-medium">Para testar:</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p><span className="font-medium">Usuário:</span> testsimple</p>
              <p><span className="font-medium">Senha:</span> Test123!</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>Nota:</strong> Testado com curl e funciona. 
                Se falhar aqui, é problema no frontend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
```

### frontend/src/pages/NotificationLogs/NotificationLogs.tsx

```
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { storesService, type Store } from "../../services/stores"
import { alertsService, type NotificationLog } from "../../services/alerts"

function formatDateBR(value?: string) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-BR")
}

export default function NotificationLogs() {
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [eventIdFilter, setEventIdFilter] = useState<string>("")

  // Stores
  const {
    data: stores,
    isLoading: storesLoading,
    error: storesError,
  } = useQuery({
    queryKey: ["stores"],
    queryFn: storesService.getStores,
  })

  useEffect(() => {
    if (!selectedStoreId && stores && stores.length > 0) {
      setSelectedStoreId(String(stores[0].id))
    }
  }, [stores, selectedStoreId])

  const selectedStore = useMemo(() => {
    if (!stores || !selectedStoreId) return null
    return stores.find((s: Store) => String(s.id) === String(selectedStoreId)) ?? null
  }, [stores, selectedStoreId])

  const logsQueryKey = useMemo(
    () => [
      "notificationLogs",
      { store_id: selectedStoreId || "", event_id: eventIdFilter || "" },
    ],
    [selectedStoreId, eventIdFilter]
  )

  const {
    data: logs,
    isLoading: logsLoading,
    error: logsError,
    refetch,
  } = useQuery({
    queryKey: logsQueryKey,
    enabled: !!selectedStoreId,
    queryFn: async (): Promise<NotificationLog[]> => {
      return await alertsService.listLogs({
        store_id: selectedStoreId,
        event_id: eventIdFilter ? eventIdFilter.trim() : undefined,
      })
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Logs de Notificação</h2>
          <p className="text-sm text-gray-600">
            Auditoria de envios (dashboard/email/whatsapp) por loja e evento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
          disabled={!selectedStoreId}
          aria-label="Atualizar logs"
          title="Atualizar logs"
        >
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Store */}
          <div>
            <label htmlFor="storeLogsSelect" className="block text-sm font-medium text-gray-900">
              Loja
            </label>

            {storesError ? (
              <div className="mt-2 text-sm text-red-600">Erro ao carregar lojas.</div>
            ) : (
              <select
                id="storeLogsSelect"
                name="storeLogsSelect"
                className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 bg-white"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                disabled={storesLoading}
                aria-label="Selecionar loja para logs"
                title="Selecionar loja"
              >
                {(stores ?? []).map((s: Store) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name ?? `Loja ${s.id}`}
                  </option>
                ))}
              </select>
            )}

            {selectedStore && (
              <div className="mt-1 text-xs text-gray-500">
                Selecionada:{" "}
                <span className="font-medium text-gray-700">{selectedStore.name}</span>
              </div>
            )}
          </div>

          {/* Event ID */}
          <div>
            <label htmlFor="eventIdFilter" className="block text-sm font-medium text-gray-900">
              Filtrar por Event ID (opcional)
            </label>
            <input
              id="eventIdFilter"
              name="eventIdFilter"
              className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200"
              value={eventIdFilter}
              onChange={(e) => setEventIdFilter(e.target.value)}
              placeholder="ex: 123 ou UUID"
              aria-label="Filtrar logs por Event ID"
              title="Filtrar por Event ID"
            />
            <p className="mt-1 text-xs text-gray-500">
              Deixe vazio para ver todos os logs da loja.
            </p>
          </div>

          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Dica</p>
            <p className="mt-1 text-xs text-gray-600">
              Se algum envio falhar, o campo <span className="font-mono">error</span> ajuda a debugar
              o n8n/integrações.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Registros</h3>
          <span className="text-xs text-gray-500">{logs?.length ?? 0} itens</span>
        </div>

        {logsError ? (
          <div className="p-4 text-sm text-red-600">Erro ao carregar logs.</div>
        ) : logsLoading ? (
          <div className="p-4 text-sm text-gray-600">Carregando logs...</div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">
            Nenhum log encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Quando</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Canal</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Status</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Destino</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Event ID</th>
                  <th scope="col" className="t

<<SNAPSHOT TRUNCATED: max chars reached>>
