from django.urls import path
from .views import EdgeEventsIngestView

urlpatterns = [
    path("events/", EdgeEventsIngestView.as_view(), name="edge-events"),
]
