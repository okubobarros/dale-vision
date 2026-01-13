from django.contrib import admin
from .models import DetectionEvent

@admin.register(DetectionEvent)
class DetectionEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'camera', 'confidence', 'detected_at']
    list_filter = ['event_type', 'detected_at']