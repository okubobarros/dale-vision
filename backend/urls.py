# backend/urls.py - VERSÃO CORRIGIDA
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from knox import views as knox_views

# ⭐ IMPORT CORRETO
from apps.accounts.views import RegisterView, LoginView

def home(request):
    return JsonResponse({
        'app': 'Dale Vision IA',
        'version': '1.0.0',
        'status': 'online',
        'description': 'Sistema de monitoramento inteligente para multilojistas',
        'documentation': '/swagger/',
        'authentication_required': True,
        'endpoints': {
            'register': '/api/accounts/register/',
            'login': '/api/accounts/login/',
            'logout': '/api/accounts/logout/',
            'stores': '/api/v1/stores/',
            'store_dashboard': '/api/v1/stores/{id}/dashboard/',
            'network_dashboard': '/api/v1/stores/network_dashboard/',
        }
    })

schema_view = get_schema_view(
    openapi.Info(
        title="Dale Vision API",
        default_version='v1',
        description="API de Visão Computacional para Varejo",
        contact=openapi.Contact(email="dev@dalevision.ai"),
        license=openapi.License(name="Proprietary"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),

    # Swagger Documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='redoc'),

    # ⭐ Authentication (Knox) - COM NOME CORRETO
    path('api/accounts/register/', RegisterView.as_view(), name='register'),
    path('api/accounts/login/', LoginView.as_view(), name='login'),
    path('api/accounts/logout/', knox_views.LogoutView.as_view(), name='logout'),
    path('api/accounts/logoutall/', knox_views.LogoutAllView.as_view(), name='logoutall'),

    # API v1
    path('api/v1/', include('apps.stores.urls')),
    
    # Health Check
    path('health/', lambda r: JsonResponse({'status': 'healthy', 'service': 'dale-vision-api'})),
]