from rest_framework import serializers

from .models import (
    CopilotMessage,
    CopilotOperationalInsight,
    CopilotReport72h,
    StoreProfile,
)


class CopilotOperationalInsightSerializer(serializers.ModelSerializer):
    evidence = serializers.JSONField(source="evidence_json")
    actions = serializers.JSONField(source="actions_json")

    class Meta:
        model = CopilotOperationalInsight
        fields = (
            "id",
            "org_id",
            "store_id",
            "category",
            "severity",
            "headline",
            "description",
            "evidence",
            "actions",
            "confidence",
            "created_at",
        )


class CopilotReport72hSerializer(serializers.ModelSerializer):
    summary = serializers.JSONField(source="summary_json")
    sections = serializers.JSONField(source="sections_json")

    class Meta:
        model = CopilotReport72h
        fields = (
            "id",
            "org_id",
            "store_id",
            "status",
            "generated_at",
            "summary",
            "sections",
        )


class CopilotMessageSerializer(serializers.ModelSerializer):
    metadata = serializers.JSONField(source="metadata_json")

    class Meta:
        model = CopilotMessage
        fields = (
            "id",
            "role",
            "content",
            "metadata",
            "created_at",
        )


class CopilotChatCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=4000)
    session_id = serializers.CharField(max_length=128, required=False, allow_blank=True)
    context = serializers.JSONField(required=False)


class CopilotStaffPlanActionSerializer(serializers.Serializer):
    staff_planned_week = serializers.IntegerField(min_value=0, max_value=500)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    source = serializers.CharField(max_length=64, required=False, allow_blank=True)


class StoreProfileSerializer(serializers.ModelSerializer):
    opening_hours = serializers.JSONField(source="opening_hours_json")
    defaults = serializers.JSONField(source="defaults_json")
    timezone = serializers.CharField(source="timezone_name")

    class Meta:
        model = StoreProfile
        fields = (
            "id",
            "org_id",
            "store_id",
            "business_model",
            "has_salao",
            "has_pos_integration",
            "opening_hours",
            "timezone",
            "defaults",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "org_id", "store_id", "created_at", "updated_at")
