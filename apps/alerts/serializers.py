# apps/alerts/serializers.py
from rest_framework import serializers
from django.utils import timezone

from apps.core.models import (
    DemoLead,
    AlertRule,
    DetectionEvent,
    EventMedia,
    NotificationLog,
    JourneyEvent,
)


class DemoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoLead
        fields = "__all__"
        read_only_fields = ("id", "created_at", "status")


class AlertRuleSerializer(serializers.ModelSerializer):
    # write-only (entrada)
    store_id = serializers.UUIDField(write_only=True, required=True)
    zone_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    # read-only (saída fácil para debug/UI)
    store = serializers.UUIDField(source="store_id", read_only=True)
    zone = serializers.UUIDField(source="zone_id", read_only=True)

    class Meta:
        model = AlertRule
        fields = [
            "id",

            # entrada
            "store_id",
            "zone_id",

            # saída
            "store",
            "zone",

            "type",
            "severity",
            "active",
            "threshold",
            "cooldown_minutes",
            "channels",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "store", "zone"]

    def create(self, validated_data):
        store_id = validated_data.pop("store_id")
        zone_id = validated_data.pop("zone_id", None)

        now = timezone.now()

        return AlertRule.objects.create(
            store_id=store_id,
            zone_id=zone_id,
            created_at=now,
            updated_at=now,
            **validated_data,
        )

    def update(self, instance, validated_data):
        if "store_id" in validated_data:
            instance.store_id = validated_data.pop("store_id")
        if "zone_id" in validated_data:
            instance.zone_id = validated_data.pop("zone_id")

        for k, v in validated_data.items():
            setattr(instance, k, v)

        instance.updated_at = timezone.now()
        instance.save()
        return instance


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


class JourneyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourneyEvent
        fields = "__all__"
        read_only_fields = ("id", "created_at")
