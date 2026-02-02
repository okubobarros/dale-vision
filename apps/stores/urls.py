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
