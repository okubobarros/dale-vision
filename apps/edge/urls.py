from django.urls import path
from .views import (
    EdgeEventsIngestView,
    EdgeCameraTestConnectionView,
    EdgeCamerasView,
    EdgeStoreCamerasView,
)
from .views_update import EdgeUpdatePolicyView, EdgeUpdateReportView

urlpatterns = [
    path("events/", EdgeEventsIngestView.as_view(), name="edge-events"),
    path("cameras/", EdgeCamerasView.as_view(), name="edge-cameras"),
    path("stores/<uuid:store_id>/cameras/", EdgeStoreCamerasView.as_view(), name="edge-store-cameras"),
    path("update-policy/", EdgeUpdatePolicyView.as_view(), name="edge-update-policy"),
    path("update-report/", EdgeUpdateReportView.as_view(), name="edge-update-report"),
    path(
        "cameras/<uuid:camera_id>/test_connection/",
        EdgeCameraTestConnectionView.as_view(),
        name="edge-camera-test-connection",
    ),
]
