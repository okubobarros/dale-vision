from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CameraViewSet, CameraHealthLogViewSet

router = DefaultRouter()
router.register(r"cameras", CameraViewSet, basename="cameras")
router.register(r"camera-health-logs", CameraHealthLogViewSet, basename="camera-health-logs")

urlpatterns = [
    path("", include(router.urls)),
]
