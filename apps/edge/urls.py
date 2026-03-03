from django.urls import path
from .views import EdgeEventsIngestView, EdgeCameraTestConnectionView

urlpatterns = [
    path("events/", EdgeEventsIngestView.as_view(), name="edge-events"),
    path(
        "cameras/<uuid:camera_id>/test_connection/",
        EdgeCameraTestConnectionView.as_view(),
        name="edge-camera-test-connection",
    ),
]
