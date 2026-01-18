from rest_framework import serializers
from apps.core.models import (
    DemoLead,
    AlertRule,
    DetectionEvent,
    EventMedia,
    NotificationLog,
)

class DemoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoLead
        fields = "__all__"
        read_only_fields = ("id", "created_at", "status")

class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

class EventMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventMedia
        fields = "__all__"
        read_only_fields = ("id", "created_at")

class DetectionEventSerializer(serializers.ModelSerializer):
    media = serializers.SerializerMethodField()

    class Meta:
        model = DetectionEvent
        fields = "__all__"
        read_only_fields = ("id", "created_at")

    def get_media(self, obj):
        qs = EventMedia.objects.filter(event_id=obj.id).order_by("-created_at")
        return EventMediaSerializer(qs, many=True).data

class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = "__all__"
        read_only_fields = ("id", "sent_at")
