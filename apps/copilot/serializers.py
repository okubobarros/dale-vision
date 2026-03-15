from rest_framework import serializers

from .models import (
    ActionOutcome,
    CopilotMessage,
    CopilotOperationalInsight,
    CopilotReport72h,
    StoreProfile,
    ValueLedgerDaily,
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


class CopilotActionOutcomeSerializer(serializers.ModelSerializer):
    baseline = serializers.JSONField(source="baseline_json")
    outcome = serializers.JSONField(source="outcome_json")

    class Meta:
        model = ActionOutcome
        fields = (
            "id",
            "org_id",
            "store_id",
            "action_event_id",
            "insight_id",
            "action_type",
            "channel",
            "source",
            "status",
            "baseline",
            "outcome",
            "impact_expected_brl",
            "impact_realized_brl",
            "confidence_score",
            "dispatched_at",
            "completed_at",
            "created_at",
            "updated_at",
        )


class CopilotActionOutcomeCreateSerializer(serializers.Serializer):
    action_event_id = serializers.UUIDField(required=False, allow_null=True)
    insight_id = serializers.CharField(max_length=128)
    action_type = serializers.CharField(max_length=64, required=False, default="whatsapp_delegation")
    channel = serializers.CharField(max_length=32, required=False, default="whatsapp")
    source = serializers.CharField(max_length=64, required=False, default="copilot_decision_center")
    status = serializers.ChoiceField(
        choices=["dispatched", "completed", "failed", "canceled"],
        required=False,
        default="dispatched",
    )
    baseline = serializers.JSONField(required=False)
    outcome = serializers.JSONField(required=False)
    impact_expected_brl = serializers.FloatField(required=False, default=0, min_value=0)
    impact_realized_brl = serializers.FloatField(required=False, default=0, min_value=0)
    confidence_score = serializers.IntegerField(required=False, default=0, min_value=0, max_value=100)
    dispatched_at = serializers.DateTimeField(required=False)
    completed_at = serializers.DateTimeField(required=False, allow_null=True)


class CopilotActionOutcomeUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["dispatched", "completed", "failed", "canceled"],
        required=False,
    )
    outcome = serializers.JSONField(required=False)
    impact_realized_brl = serializers.FloatField(required=False, min_value=0)
    confidence_score = serializers.IntegerField(required=False, min_value=0, max_value=100)
    completed_at = serializers.DateTimeField(required=False, allow_null=True)


class ValueLedgerDailySerializer(serializers.ModelSerializer):
    class Meta:
        model = ValueLedgerDaily
        fields = (
            "id",
            "org_id",
            "store_id",
            "ledger_date",
            "value_recovered_brl",
            "value_at_risk_brl",
            "actions_dispatched",
            "actions_completed",
            "confidence_score_avg",
            "method_version",
            "created_at",
            "updated_at",
        )
