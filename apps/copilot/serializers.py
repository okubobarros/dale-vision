from rest_framework import serializers

from .models import CopilotMessage, CopilotOperationalInsight, CopilotReport72h


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

