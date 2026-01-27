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
