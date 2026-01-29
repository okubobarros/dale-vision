# DALE Vision — Context Snapshot

Generated at: `2026-01-29T01:19:56.068663Z`

## Project Tree

### apps

```
apps/
apps\accounts/
    __init__.py
    admin.py
    apps.py
    models.py
    serializers.py
    tests.py
    urls.py
    views.py
apps\accounts\migrations/
      __init__.py
apps\alerts/
    __init__.py
    admin.py
    apps.py
    models.py
    serializers.py
    services.py
    tests.py
    urls.py
    views.py
apps\alerts\migrations/
      __init__.py
apps\analytics/
    __init__.py
    admin.py
    apps.py
    models.py
    tests.py
    views.py
apps\analytics\migrations/
      __init__.py
apps\billing/
    __init__.py
    admin.py
    apps.py
    models.py
    tests.py
    views.py
apps\billing\migrations/
      __init__.py
apps\cameras/
    __init__.py
    admin.py
    apps.py
    models.py
    serializers.py
    services.py
    tests.py
    urls.py
    views.py
apps\cameras\migrations/
      0001_initial.py
      0002_delete_camera.py
      __init__.py
apps\core/
    __init__.py
    admin.py
    apps.py
    models.py
    tests.py
    views.py
apps\core\management/
      __init__.py
apps\core\management\commands/
        __init__.py
        seed_demo.py
apps\core\migrations/
      0001_initial.py
      0002_alertrule_auditlog_billingcustomer_camera_and_more.py
      __init__.py
apps\edge/
    __init__.py
    admin.py
    apps.py
    models.py
    permissions.py
    serializers.py
    tests.py
    urls.py
    views.py
apps\edge\migrations/
      0001_initial.py
      __init__.py
apps\stores/
    __init__.py
    admin.py
    apps.py
    models.py
    serializers.py
    tests.py
    urls.py
    views.py
apps\stores\migrations/
      0001_initial.py
      0002_remove_store_is_active.py
      __init__.py
apps\vision/
    __init__.py
    apps.py
    tests.py
    views.py
apps\vision\migrations/
      0001_initial.py
      0002_alter_detectionevent_camera.py
      0003_delete_detectionevent.py
      __init__.py
```

### backend

```
backend/
  .env
  __init__.py
  asgi.py
  settings.py
  urls.py
  wsgi.py
```

### frontend/src

```
frontend\src/
    App.tsx
    index.css
    main.tsx
frontend\src\assets/
      logo.png
      react.svg
frontend\src\components/
      PrivateRoute.tsx
frontend\src\components\Agent/
        AgentModal.tsx
frontend\src\components\Charts/
        LineChart.tsx
        PieChart.tsx
frontend\src\components\Layout/
        BottomNav.tsx
        Header.tsx
        Layout.tsx
        Sidebar.tsx
        index.ts
frontend\src\components\Skeletons/
        DashboardSkeleton.tsx
frontend\src\contexts/
      AgentContext.tsx
      AuthContext.tsx
frontend\src\hooks/
      useIsMobile.ts
      useRevealOnScroll.ts
frontend\src\pages/
frontend\src\pages\AgendarDemo/
        AgendarDemo.tsx
frontend\src\pages\AlertRules/
        AlertRules.tsx
frontend\src\pages\Alerts/
        Alerts.tsx
frontend\src\pages\Analytics/
        Analytics.tsx
frontend\src\pages\Cameras/
        Cameras.tsx
frontend\src\pages\Dashboard/
        Dashboard.tsx
frontend\src\pages\Home/
        Home.tsx
frontend\src\pages\Login/
        Login.tsx
frontend\src\pages\NotificationLogs/
        NotificationLogs.tsx
frontend\src\pages\Onboarding/
        Onboarding.tsx
        OnboardingSuccess.tsx
frontend\src\pages\Onboarding\components/
          CamerasSetup.tsx
          EmployeesSetup.tsx
          OnboardingProgress.tsx
          StoresSetup.tsx
frontend\src\pages\Profile/
        Profile.tsx
frontend\src\pages\Register/
        Register.tsx
frontend\src\pages\Settings/
        Settings.tsx
frontend\src\pages\Stores/
        Stores.tsx
frontend\src\queries/
      alerts.queries.ts
frontend\src\services/
      alerts.ts
      api.ts
      auth.ts
      demo.ts
      stores.ts
frontend\src\types/
      dashboard.ts
```

### frontend/public

```
frontend\public/
    vite.svg
```

### frontend/package.json

```
frontend/package.json
```

### frontend/vite.config.ts

```
frontend/vite.config.ts
```

### frontend/tsconfig.json

```
frontend/tsconfig.json
```

### frontend/tsconfig.app.json

```
frontend/tsconfig.app.json
```

### frontend/tsconfig.node.json

```
frontend/tsconfig.node.json
```

### edge-agent

```
edge-agent/
edge-agent\config/
    agent.yaml
edge-agent\config\rois/
      cam01.yaml
      cam02.yaml
      cam03.yaml
edge-agent\data/
    edge_queue.db
edge-agent\models/
    yolov8n.pt
edge-agent\runs/
edge-agent\runs\detect/
edge-agent\runs\detect\predict/
edge-agent\runs\detect\predict2/
edge-agent\runs\detect\predict3/
edge-agent\runs\detect\predict4/
edge-agent\src/
    __init__.py
edge-agent\src\agent/
      __init__.py
      lifecycle.py
      main.py
      settings.py
edge-agent\src\camera/
      rtsp.py
edge-agent\src\events/
      builder.py
      receipts.py
edge-agent\src\storage/
      __init__.py
      sqlite_queue.py
edge-agent\src\transport/
      api_client.py
edge-agent\src\vision/
      aggregations.py
      detector.py
      rules.py
```

### scripts

```
scripts/
  generate_context_snapshot.py
```

### contracts

```
(missing) contracts
```

### docs

```
docs/
  SNAPSHOT_CONTEXT.json
  SNAPSHOT_CONTEXT.md
```

## Important Files (Preview)

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
    'apps.vision',
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
            "alerts": "/api/alerts/",
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
    path("api/cameras/", include("apps.cameras.urls")),

    path("health/", lambda r: JsonResponse({"status": "healthy", "service": "dale-vision-api"})),
    path("api/edge/", include("apps.edge.urls")),
]

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

### apps/accounts/views.py

```
# apps/accounts/views.py
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from knox.models import AuthToken
from django.contrib.auth import authenticate

from drf_yasg.utils import swagger_auto_schema  # ✅
from drf_yasg import openapi  # (opcional)

from .serializers import RegisterSerializer, LoginSerializer


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

### apps/accounts/urls.py

```
# apps/accounts/urls.py
from django.urls import path
from knox import views as knox_views
from .views import RegisterView, LoginView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", knox_views.LogoutView.as_view(), name="logout"),
    path("logoutall/", knox_views.LogoutAllView.as_view(), name="logoutall"),
]

```

### apps/core/models.py

```
# apps/core/models.py
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
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

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
    brand = models.TextField(null=True, blank=True)
    model = models.TextField(null=True, blank=True)
    ip = models.TextField(null=True, blank=True)
    onvif = models.BooleanField(default=False)

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
    camera = models.ForeignKey(Camera, on_delete=models.DO_NOTHING, db_column="camera_id")
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
    email = models.TextFiel
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

### apps/stores/models.py

```
# apps/stores/models.py

from django.db import models
from django.contrib.auth.models import User


class Store(models.Model):
    PLAN_CHOICES = [
        ('trial', 'Trial'),
        ('basic', 'Básico'),
        ('pro', 'Profissional'),
        ('enterprise', 'Enterprise'),
    ]

    STATUS_CHOICES = [
        ('active', 'Ativa'),
        ('inactive', 'Inativa'),
        ('maintenance', 'Manutenção'),
    ]

    name = models.CharField(max_length=200)

    # ⚠️ Owner pode ser NULL no início
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='stores',
        null=True,
        blank=True
    )

    description = models.TextField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=2, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        default='trial'
    )

    # 🔥 Fonte única de verdade
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    owner_email = models.EmailField(blank=True, null=True)

    @property
    def is_active(self):
        """Campo derivado: loja ativa apenas se status == active"""
        return self.status == 'active'

    def save(self, *args, **kwargs):
        if self.owner and not self.owner_email:
            self.owner_email = self.owner.email
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

```

### apps/stores/serializers.py

```
# apps/stores/serializers.py

from rest_framework import serializers
from .models import Store


class StoreSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.SerializerMethodField()
    days_since_creation = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = [
            'id',
            'name',
            'description',
            'address',
            'city',
            'state',
            'phone',
            'email',
            'plan',
            'status',
            'status_display',
            'is_active',
            'days_since_creation',
            'owner_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner_email', 'is_active']

    def get_is_active(self, obj):
        return obj.status == 'active'

    def get_days_since_creation(self, obj):
        from django.utils import timezone
        if obj.created_at:
            delta = timezone.now() - obj.created_at
            return delta.days
        return 0

    def create(self, validated_data):
        return super().create(validated_data)


```

### apps/stores/views.py

```
# apps/stores/views.py 
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Store
from .serializers import StoreSerializer

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtra apenas lojas do usuário atual"""
        user = self.request.user
        if user.is_authenticated:
            return Store.objects.filter(owner=self.request.user)
        return Store.objects.none()
    
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
    
    def perform_create(self, serializer):
        """Auto-popula owner_email com email do usuário - ADICIONE ESTE!"""
        serializer.save(owner=self.request.user)
    
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Dashboard específico da loja (como no seu design)"""
        store = self.get_object()
        
        # ⭐ MOCK DATA - depois substituímos por dados reais
        dashboard_data = {
            'store': {
                'id': str(store.id),
                'name': store.name,
                'owner_email': store.owner_email,
                'plan': store.plan,
                'status': 'active' if store.is_active else 'inactive',
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
        stores = self.get_queryset()
        
        network_data = {
            'network': {
                'total_stores': stores.count(),
                'active_stores': stores.filter(status='active').count(),
                'total_visitors': 3124,
   
```

### apps/stores/urls.py

```
# apps/stores/urls.py (crie se não existe)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreViewSet

router = DefaultRouter()
router.register(r'stores', StoreViewSet)

urlpatterns = [
    path('', include(router.urls)),
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

### apps/alerts/models.py

```
from django.db import models

# Create your models here.

```

### apps/alerts/serializers.py

```
# apps/alerts/serializers.py
from rest_framework import serializers

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
    class Meta:
        model = AlertRule
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

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

### apps/alerts/views.py

```
# apps/alerts/views.py
from datetime import timedelta
from uuid import UUID

from django.utils import timezone
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
)
from .serializers import (
    DemoLeadSerializer,
    AlertRuleSerializer,
    DetectionEventSerializer,
    EventMediaSerializer,
    NotificationLogSerializer,
)
from .services import send_event_to_n8n

from apps.core.models import JourneyEvent
from .serializers import JourneyEventSerializer
from django.db.utils import DataError
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


def require_uuid_param(name: str, value: str):
    if not is_uuid(value):
        raise ValidationError({name: f'{name} deve ser um UUID válido (core.Store). Recebido: "{value}".'})


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
                    "source": "demo_form",
                    "reason": "duplicate_active_lead",
                    "status": existing.status,
                    "email": email or existing.email,
                    "whatsapp": whatsapp or existing.whatsapp,
                },
                created_at=now,
            )

            # 2) dispara n8n (webhook único)
            # Obs: não pode quebrar o fluxo do usuário
            try:
                send_event_to_n8n(
                    event_name="lead_duplicate_attempt",
                    event_id=str(je.id),
                    lead_id=str(existing.id),
                    org_id=None,
                    source="backend",
                    data={
                        "lead_id": str(existing.id),
                        "status": existing.status,
                        "email": existing.email,
                        "whatsapp": existing.whatsapp,
                        "created_at": existing.created_at.isoformat() if existing.created_at else None,
                    },
                    meta={
                        "ip": request.META.get("REMOTE_ADDR"),
                        "user_agent": request.META.get("HTTP_USER_AGENT"),
                    },
                )
            except Exception:
                pass

            return Response(DemoLeadSerializer(existing).data, status=status.HTTP_200_OK)

        # -------------------------
        # 1) Cria lead
        # -------------------------
        serializer = DemoLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save(status="new", created_at=now)

        # -------------------------
        # 2) JourneyEvent: lead_created
        # -------------------------
        je = JourneyEvent.objects.create(
            lead_id=lead.id,
            org_id=None,
            event_name="lead_created",
            payload={
                "source": "demo_form",
                "lead_id": str(lead.id),
                "email": lead.email,
                "whatsapp": lead.whatsapp,
                "operation_type": getattr(lead, "operation_type", None),
                "stores_range": getattr(lead, "stores_range", None),
                "cameras_range": getattr(lead, "cameras_range", None),
                "primary_goal": getattr(lead, "primary_goal", None),
                "primary_goals": getattr(lead, "primary_goals", None),
                "qualified_score": getattr(lead, "qualified_score", None),
            },
            created_at=now,
        )

        # -------------------------
        # 3) Dispara n8n (webhook único)
        # -------------------------
        send_event_to_n8n(
            event_name="lead_created",
            event_id=str(je.id),              # <- idempotência
            lead_id=str(lead.id),
            org_id=None,
            source="backend",
            data={
                "lead_id": str(lead.id),
                "contact_name": lead.contact_name,
                "email": lead.email,
                "whatsapp": lead.whatsapp,
     
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

### apps/edge/models.py

```
from django.db import models

class EdgeEventReceipt(models.Model):
    receipt_id = models.CharField(max_length=128, unique=True)
    event_name = models.CharField(max_length=64)
    source = models.CharField(max_length=32, default="edge")
    store_id = models.CharField(max_length=64, null=True, blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_name} {self.receipt_id[:10]}"


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

### apps/edge/permissions.py

```
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

```

### apps/edge/views.py

```
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

```

### apps/edge/urls.py

```
from django.urls import path
from .views import EdgeEventsIngestView

urlpatterns = [
    path("events/", EdgeEventsIngestView.as_view(), name="edge-events"),
]

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

// 🆕 Onboarding / Register (front-only)
import Register from "./pages/Register/Register"
import Onboarding from "./pages/Onboarding/Onboarding"
import OnboardingSuccess from "./pages/Onboarding/OnboardingSuccess"

function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/agendar-demo" element={<AgendarDemo />} />

      {/* 🆕 Registro + Onboarding (público, sem backend por enquanto) */}
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

        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Compat: se algum lugar ainda manda pra rotas sem /app */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/stores" element={<Navigate to="/app/stores" replace />} />
      <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
      <Route path="/cameras" element={<Navigate to="/app/cameras" replace />} />
      <Route path="/alerts" element={<Navigate to="/app/alerts" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

      {/* ✅ Redirects Alerts */}
      <Route path="/alert-rules" element={<Navigate to="/app/alert-rules" replace />} />
      <Route path="/notification-logs" element={<Navigate to="/app/notification-logs" replace />} />

      {/* ✅ Redirects Onboarding (opcional, caso alguém aponte errado) */}
      <Route path="/onboarding-success" element={<Navigate to="/onboarding/success" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

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

### frontend/src/services/api.ts

```
// src/services/api.ts
import axios from "axios"

const API_BASE_URL = "http://localhost:8000/api"

const getTokenFromStorage = (): string | null => {
  return localStorage.getItem("authToken")
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: false, // ✅ Knox não precisa de cookies
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getTokenFromStorage()

    // ✅ Axios v1: headers pode ser AxiosHeaders (tem .set)
    if (token) {
      if (config.headers && typeof (config.headers as any).set === "function") {
        ;(config.headers as any).set("Authorization", `Token ${token}`)
      } else {
        config.headers = config.headers ?? {}
        ;(config.headers as any)["Authorization"] = `Token ${token}`
      }
    } else {
      // remove Authorization se não tiver token
      if (config.headers && typeof (config.headers as any).delete === "function") {
        ;(config.headers as any).delete("Authorization")
      } else if (config.headers) {
        delete (config.headers as any)["Authorization"]
      }
    }

    // ✅ DEBUG depois de setar token (agora é real)
    console.log("🔵 API Request:", {
      url: `${config.baseURL}${config.url}`,
      method: config.method,
      authHeader:
        config.headers && typeof (config.headers as any).get === "function"
          ? (config.headers as any).get("Authorization")
          : (config.headers as any)?.Authorization,
      data: config.data,
    })

    return config
  },
  (error) => {
    console.error("🔴 API Request Error:", error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("🟢 API Response:", {
      url: response.config.url,
      status: response.status,
    })
    return response
  },
  (error) => {
    console.error("🔴 API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    })
    return Promise.reject(error)
  }
)

export default api

```

### frontend/src/services/alerts.ts

```
// src/services/alerts.ts
import api from "./api"

export type AlertChannel = "dashboard" | "email" | "whatsapp"

export interface AlertRule {
  id: string
  // backend (DRF) normalmente retorna "store" (FK), mas vamos aceitar os 2
  store?: string
  store_id?: string

  zone?: string | null
  zone_id?: string | null

  type: string
  severity: "critical" | "warning" | "info"
  cooldown_minutes: number
  active: boolean

  channels: {
    dashboard: boolean
    email: boolean
    whatsapp: boolean
  } | null

  threshold?: any
  created_at: string
  updated_at: string
}

export interface DetectionEvent {
  id: string
  store_id: string
  camera_id?: string | null
  zone_id?: string | null
  type: string
  severity: string
  status: "open" | "resolved" | "ignored"
  title: string
  description: string
  occurred_at: string
  resolved_at?: string | null
  resolved_by_user_id?: string | null
  suppressed_by_rule_id?: string | null
  suppressed_reason?: string | null
  metadata?: any
  created_at: string
  media?: EventMedia[]
}

export interface EventMedia {
  id: string
  event_id: string
  media_type: "clip" | "snapshot"
  url: string
  created_at: string
}

export interface NotificationLog {
  id: string
  store_id: string
  event_id?: string | null
  rule_id?: string | null
  channel: AlertChannel
  destination?: string | null
  provider: string
  status: "sent" | "queued" | "failed" | "suppressed"
  error?: string | null
  provider_message_id?: string | null
  sent_at: string
}

export interface AlertIngestPayload {
  store_id: string
  camera_id?: string
  zone_id?: string
  event_type: string
  severity: string
  title?: string
  message?: string
  description?: string
  occurred_at?: string
  clip_url?: string
  snapshot_url?: string
  metadata?: any
  destinations?: {
    email?: string | null
    whatsapp?: string | null
  }
}

type CoreStore = { id: string; name: string }

// helper: normaliza {results: []} | {data: []} | []
function normalizeArray<T = any>(input: any): T[] {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (Array.isArray(input.results)) return input.results
  if (Array.isArray(input.data)) return input.data
  return []
}

// helper: normaliza store_id de regra (store ou store_id)
function getRuleStoreId(rule: any): string | undefined {
  return rule?.store_id || rule?.store
}

export const alertsService = {
  // =====================
  // ALERT RULES (CRUD)
  // =====================

  async listRules(storeId?: string): Promise<AlertRule[]> {
    const params = storeId ? { store_id: storeId } : undefined
    const res = await api.get("/alerts/alert-rules/", { params })
    return normalizeArray<AlertRule>(res.data).map((r: any) => ({
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }))
  },

  async getRule(id: string): Promise<AlertRule> {
    const res = await api.get(`/alerts/alert-rules/${id}/`)
    const r: any = res.data
    return {
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }
  },

  // IMPORTANTE: enviar "store" (FK) e não "store_id"
  async createRule(payload: Partial<AlertRule> & { store_id?: string }): Promise<AlertRule> {
    const body: any = {
      ...payload,
      store: payload.store ?? payload.store_id, // <- aqui
      zone: payload.zone ?? payload.zone_id ?? null,
    }
    delete body.store_id
    delete body.zone_id

    const res = await api.post("/alerts/alert-rules/", body)
    const r: any = res.data
    return {
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }
  },

  async updateRule(id: string, payload: Partial<AlertRule> & { store_id?: string }): Promise<AlertRule> {
    const body: any = {
      ...payload,
      ...(payload.store || payload.store_id ? { store: payload.store ?? payload.store_id } : {}),
      ...(payload.zone || payload.zone_id ? { zone: payload.zone ?? payload.zone_id } : {}),
    }
    delete body.store_id
    delete body.zone_id

    const res = await api.patch(`/alerts/alert-rules/${id}/`, body)
    const r: any = res.data
    return {
      ...r,
      store_id: getRuleStoreId(r),
      zone_id: r?.zone_id ?? r?.zone ?? null,
    }
  },

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/alerts/alert-rules/${id}/`)
  },

  // =====================
  // INGEST (CORE)
  // =====================

  async ingest(payload: AlertIngestPayload) {
    const res = await api.post("/alerts/alert-rules/ingest/", payload)
    return res.data as {
      event: DetectionEvent
      n8n: any
      suppressed: boolean
    }
  },

  // =====================
  // DETECTION EVENTS
  // =====================

  async listEvents(params?: {
    store_id?: string
    status?: "open" | "resolved" | "ignored"
  }): Promise<DetectionEvent[]> {
    const res = await api.get("/alerts/events/", { params })
    return normalizeArray<DetectionEvent>(res.data)
  },

  async resolveEvent(eventId: string): Promise<DetectionEvent> {
    const res = await api.post(`/alerts/events/${eventId}/resolve/`)
    return res.data
  },

  async ignoreEvent(eventId: string): Promise<DetectionEvent> {
    const res = await api.post(`/alerts/events/${eventId}/ignore/`)
    return res.data
  },

  async addEventMedia(eventId: string, media: Partial<EventMedia>) {
    const res = await api.post(`/alerts/events/${eventId}/media/`, media)
    return res.data
  },

  // =====================
  // NOTIFICATION LOGS
  // =====================

  async listLogs(params?: { store_id?: string; event_id?: string }): Promise<NotificationLog[]> {
    const res = await api.get("/alerts/notification-logs/", { params })
    return normalizeArray<NotificationLog>(res.data)
  },

  // =====================
  // CORE STORES (UUID) - usado na UI de alertas
  // =====================

  async listCoreStores(): Promise<CoreStore[]> {
    const res = await api.get("/alerts/stores/")
    retu
```

### frontend/src/services/stores.ts

```
// src/services/stores.ts
import api from './api';
import type { StoreDashboard } from '../types/dashboard';

export type StoreStatus = 'active' | 'inactive' | 'maintenance';
export type StorePlan = 'trial' | 'basic' | 'pro' | 'enterprise';

export interface Store {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  plan: StorePlan;
  status: StoreStatus;
  created_at: string;
  updated_at: string;
  owner_email: string;
}

type StoreWriteFields = {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  status?: StoreStatus;
};

export type CreateStorePayload = StoreWriteFields;
export type UpdateStorePayload = StoreWriteFields;

export interface StoreMetrics {
  total_cameras: number;
  active_cameras: number;
  today_events: number;
  avg_customer_count: number;
  peak_hour: string;
  alerts_today: number;
}

export interface NetworkDashboard {
  total_stores: number;
  total_cameras: number;
  active_alerts: number;
  stores: Array<{
    id: string;
    name: string;
    status: string;
    camera_count: number;
    last_activity: string;
  }>;
}

// Funções auxiliares (não exportadas)
const getMockDashboard = (storeId: string): StoreDashboard => {
  console.log('🔄 Usando dados mock para dashboard');
  
  const mockNames = ['Loja Principal', 'Filial Centro', 'Loja Shopping'];
  const mockSectors = ['Setor A', 'Setor B', 'Setor C', 'Setor D'];
  const employees = ['Maria Silva', 'João Santos', 'Ana Oliveira', 'Pedro Costa'];
  
  return {
    store: {
      id: storeId,
      name: mockNames[Math.floor(Math.random() * mockNames.length)],
      owner_email: "user@example.com",
      plan: ["trial", "basic", "pro"][Math.floor(Math.random() * 3)],
      status: "active"
    },
    metrics: {
      health_score: 80 + Math.floor(Math.random() * 20),
      productivity: 70 + Math.floor(Math.random() * 25),
      idle_time: 10 + Math.floor(Math.random() * 15),
      visitor_flow: 800 + Math.floor(Math.random() * 400),
      conversion_rate: 55 + Math.random() * 30,
      avg_cart_value: 80 + Math.random() * 70
    },
    insights: {
      peak_hour: `${10 + Math.floor(Math.random() * 6)}:00-${12 + Math.floor(Math.random() * 6)}:00`,
      best_selling_zone: mockSectors[Math.floor(Math.random() * mockSectors.length)],
      employee_performance: {
        best: `${employees[Math.floor(Math.random() * employees.length)]} (${85 + Math.floor(Math.random() * 15)}%)`,
        needs_attention: `${employees[Math.floor(Math.random() * employees.length)]} (${50 + Math.floor(Math.random() * 20)}%)`
      }
    },
    recommendations: [
      {
        id: "rec_1",
        title: "Otimizar horários de pico",
        description: "Ajustar escalas para cobrir o horário de maior movimento",
        priority: ["high", "medium", "low"][Math.floor(Math.random() * 3)],
        action: "adjust_schedules",
        estimated_impact: "Aumento de 15-25% na produtividade"
      },
      {
        id: "rec_2",
        title: "Repor estoque crítico",
        description: "Produtos mais vendidos com estoque abaixo do mínimo",
        priority: ["high", "medium", "low"][Math.floor(Math.random() * 3)],
        action: "restock",
        estimated_impact: `Evitar perda de R$ ${(2000 + Math.random() * 3000).toFixed(0)} em vendas`
      },
      {
        id: "rec_3",
        title: "Treinamento de equipe",
        description: "Capacitação para melhorar atendimento ao cliente",
        priority: ["high", "medium", "low"][Math.floor(Math.random() * 3)],
        action: "training",
        estimated_impact: "Aumento de 10% na taxa de conversão"
      }
    ],
    alerts: [
      {
        type: "high_idle_time",
        message: "Funcionário com tempo ocioso acima da média",
        severity: "medium",
        time: new Date().toISOString()
      },
      {
        type: "low_conversion",
        message: "Taxa de conversão abaixo da média histórica",
        severity: "high",
        time: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  };
};

const omitEmpty = <T extends Record<string, unknown>>(payload: T): Partial<T> => {
  const result: Partial<T> = {};

  (Object.keys(payload) as Array<keyof T>).forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value === '') return;
    result[key] = value;
  });

  return result;
};

export const storesService = {
  // Listar todas as lojas do usuário
  async getStores(): Promise<Store[]> {
    console.log('🔄 Buscando lojas...');
    try {
      const response = await api.get('/v1/stores/');
      console.log('📦 Resposta completa:', response);
      
      // A API retorna {data: [...]}
      const stores = response.data.data || response.data;
      console.log(`✅ Encontradas ${stores?.length || 0} lojas`);
      
      return stores || [];
    } catch (error) {
      console.error('❌ Erro ao buscar lojas:', error);
      throw error;
    }
  },

  // Obter dashboard completo (novo formato)
  async getStoreDashboard(storeId: string): Promise<StoreDashboard> {
    console.log(`🔄 Buscando dashboard para loja ${storeId}`);
    
    try {
      const response = await api.get(`/v1/stores/${storeId}/dashboard/`);
      console.log('✅ Dashboard response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar dashboard:', error);
      
      // Fallback com dados mock
      return getMockDashboard(storeId);
    }
  },

  // Obter métricas no formato antigo (para compatibilidade se necessário)
  async getStoreMetrics(storeId: string): Promise<StoreMetrics> {
    const dashboard = await this.getStoreDashboard(storeId);
    
    // Converter do novo formato para o formato antigo
    return {
      total_cameras: 4,
      active_cameras: 3,
      today_events: Math.round(
```

### edge-agent\src\__init__.py

```

```

### edge-agent\src\agent\__init__.py

```

```

### edge-agent\src\agent\lifecycle.py

```
import time
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
            hb = {
                "agent_id": agent_id,
                "store_id": store_id,
                "cameras": [
                    {
                        "camera_id": w.camera_id,
                        "name": w.name,
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

### edge-agent\src\agent\main.py

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

### edge-agent\src\agent\settings.py

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
    if base:
        d.setdefault("cloud", {})["base_url"] = base
    if token:
        d.setdefault("cloud", {})["token"] = token
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
        heartbeat_interval_seconds=int(cloud.get("heartbeat_interval_seconds", 15)),

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

### edge-agent\src\camera\rtsp.py

```
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
   
```

### edge-agent\src\events\builder.py

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

### edge-agent\src\events\receipts.py

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

### edge-agent\src\storage\__init__.py

```

```

### edge-agent\src\storage\sqlite_queue.py

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

### edge-agent\src\transport\api_client.py

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

### edge-agent\src\vision\aggregations.py

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

### edge-agent\src\vision\detector.py

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

### edge-agent\src\vision\rules.py

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

### apps\edge\__init__.py

```

```

### apps\edge\admin.py

```
from django.contrib import admin

# Register your models here.

```

### apps\edge\apps.py

```
from django.apps import AppConfig


class EdgeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.edge"

```

### apps\edge\migrations\0001_initial.py

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

### apps\edge\migrations\__init__.py

```

```

### apps\edge\models.py

```
from django.db import models

class EdgeEventReceipt(models.Model):
    receipt_id = models.CharField(max_length=128, unique=True)
    event_name = models.CharField(max_length=64)
    source = models.CharField(max_length=32, default="edge")
    store_id = models.CharField(max_length=64, null=True, blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_name} {self.receipt_id[:10]}"


```

### apps\edge\permissions.py

```
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

```

### apps\edge\serializers.py

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

### apps\edge\tests.py

```
from django.test import TestCase

# Create your tests here.

```

### apps\edge\urls.py

```
from django.urls import path
from .views import EdgeEventsIngestView

urlpatterns = [
    path("events/", EdgeEventsIngestView.as_view(), name="edge-events"),
]

```

### apps\alerts\__init__.py

```

```

### apps\alerts\admin.py

```
from django.contrib import admin

# Register your models here.

```

### apps\alerts\apps.py

```
from django.apps import AppConfig


class AlertsConfig(AppConfig):
    name = 'apps.alerts'
    verbose_name = 'Alerts'

```

### apps\alerts\migrations\__init__.py

```

```

### apps\alerts\models.py

```
from django.db import models

# Create your models here.

```

### apps\alerts\serializers.py

```
# apps/alerts/serializers.py
from rest_framework import serializers

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
    class Meta:
        model = AlertRule
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

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

### apps\alerts\services.py

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

### apps\alerts\tests.py

```
from django.test import TestCase

# Create your tests here.

```

### apps\alerts\urls.py

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

### apps\alerts\views.py

```
# apps/alerts/views.py
from datetime import timedelta
from uuid import UUID

from django.utils import timezone
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
)
from .serializers import (
    DemoLeadSerializer,
    AlertRuleSerializer,
    DetectionEventSerializer,
    EventMediaSerializer,
    NotificationLogSerializer,
)
from .services import send_event_to_n8n

from apps.core.models import JourneyEvent
from .serializers import JourneyEventSerializer
from django.db.utils import DataError
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


def require_uuid_param(name: str, value: str):
    if not is_uuid(value):
        raise ValidationError({name: f'{name} deve ser um UUID válido (core.Store). Recebido: "{value}".'})


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
                    "source": "demo_form",
                    "reason": "duplicate_active_lead",
                    "status": existing.status,
                    "email": email or existing.email,
                    "whatsapp": whatsapp or existing.whatsapp,
                },
                created_at=now,
            )

            # 2) dispara n8n (webhook único)
            # Obs: não pode quebrar o fluxo do usuário
            try:
                send_event_to_n8n(
                    event_name="lead_duplicate_attempt",
                    event_id=str(je.id),
                    lead_id=str(existing.id),
                    org_id=None,
                    source="backend",
                    data={
                        "lead_id": str(existing.id),
                        "status": existing.status,
                        "email": existing.email,
                        "whatsapp": existing.whatsapp,
                        "created_at": existing.created_at.isoformat() if existing.created_at else None,
                    },
                    meta={
                        "ip": request.META.get("REMOTE_ADDR"),
                        "user_agent": request.META.get("HTTP_USER_AGENT"),
                    },
                )
            except Exception:
                pass

            return Response(DemoLeadSerializer(existing).data, status=status.HTTP_200_OK)

        # -------------------------
        # 1) Cria lead
        # -------------------------
        serializer = DemoLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save(status="new", created_at=now)

        # -------------------------
        # 2) JourneyEvent: lead_created
        # -------------------------
        je = JourneyEvent.objects.create(
            lead_id=lead.id,
            org_id=None,
            event_name="lead_created",
            payload={
                "source": "demo_form",
                "lead_id": str(lead.id),
                "email": lead.email,
                "whatsapp": lead.whatsapp,
                "operation_type": getattr(lead, "operation_type", None),
                "stores_range": getattr(lead, "stores_range", None),
                "cameras_range": getattr(lead, "cameras_range", None),
                "primary_goal": getattr(lead, "primary_goal", None),
                "primary_goals": getattr(lead, "primary_goals", None),
                "qualified_score": getattr(lead, "qualified_score", None),
            },
            created_at=now,
        )

        # -------------------------
        # 3) Dispara n8n (webhook único)
        # -------------------------
        send_event_to_n8n(
            event_name="lead_created",
            event_id=str(je.id),              # <- idempotência
            lead_id=str(lead.id),
            org_id=None,
            source="backend",
            data={
                "lead_id": str(lead.id),
                "contact_name": lead.contact_name,
                "email": lead.email,
                "whatsapp": lead.whatsapp,
     
```

### backend\__init__.py

```

```

### backend\asgi.py

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

### backend\settings.py

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
    'apps.vision',
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
```

### backend\urls.py

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
            "alerts": "/api/alerts/",
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
    path("api/cameras/", include("apps.cameras.urls")),

    path("health/", lambda r: JsonResponse({"status": "healthy", "service": "dale-vision-api"})),
    path("api/edge/", include("apps.edge.urls")),
]

```

### backend\wsgi.py

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
