# backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from backend.views import health, auth_health
from apps.alerts.views import DemoLeadCreateView
from apps.accounts.views import SetupStateView
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
    path("api/me/setup-state/", SetupStateView.as_view(), name="setup-state"),

    # ✅ Core (demo lead etc) — se você for colocar aqui depois
    # path("api/core/", include("apps.core.urls")),

    # ✅ Stores
    path("api/v1/", include("apps.stores.urls")),

    # ✅ Alerts (demo lead + rules + ingest/event)
    path("api/alerts/", include("apps.alerts.urls")),
    path("api/v1/alerts/", include("apps.alerts.urls")),
    path("api/cameras/", include("apps.cameras.urls")),
    path("api/v1/", include("apps.cameras.urls")),
    path("api/v1/demo-leads/", DemoLeadCreateView.as_view()),

    path("health/", health),
    path("health", health),
    path("api/health/auth/", auth_health),
    path("api/edge/", include("apps.edge.urls")),
]
