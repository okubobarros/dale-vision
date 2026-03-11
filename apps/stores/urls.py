# apps/stores/urls.py (crie se não existe)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreViewSet, EmployeeViewSet
from .views_edge_status import StoreEdgeStatusView
from .views_support import (
    StoreSupportRequestView,
    AdminSupportRequestListView,
    AdminSupportRequestGrantView,
    AdminSupportRequestCloseView,
)

router = DefaultRouter()
router.register(r'stores', StoreViewSet)
router.register(r'employees', EmployeeViewSet, basename="employees")

urlpatterns = [
    path('', include(router.urls)),
    path("stores/<uuid:store_id>/edge-status/", StoreEdgeStatusView.as_view(), name="store-edge-status"),
    path("stores/<uuid:store_id>/support/requests/", StoreSupportRequestView.as_view(), name="store-support-requests"),
    path("support/requests/", AdminSupportRequestListView.as_view(), name="admin-support-requests"),
    path("support/requests/<uuid:request_id>/grant/", AdminSupportRequestGrantView.as_view(), name="admin-support-request-grant"),
    path("support/requests/<uuid:request_id>/close/", AdminSupportRequestCloseView.as_view(), name="admin-support-request-close"),
]
