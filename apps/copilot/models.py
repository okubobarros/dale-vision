import uuid

from django.db import models
from django.utils import timezone


INSIGHT_SEVERITY = (
    ("info", "info"),
    ("warning", "warning"),
    ("critical", "critical"),
)

INSIGHT_STATUS = (
    ("active", "active"),
    ("archived", "archived"),
)

REPORT_STATUS = (
    ("pending", "pending"),
    ("ready", "ready"),
    ("failed", "failed"),
)

MESSAGE_ROLE = (
    ("system", "system"),
    ("assistant", "assistant"),
    ("user", "user"),
)

BUSINESS_MODEL = (
    ("default", "default"),
    ("cafe", "cafe"),
    ("gelateria", "gelateria"),
    ("moda", "moda"),
    ("lavanderia_self_service", "lavanderia_self_service"),
    ("outro", "outro"),
)


class CopilotDashboardContextSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org_id = models.UUIDField(db_index=True)
    store_id = models.UUIDField(db_index=True)
    account_state = models.CharField(max_length=32, default="unknown")
    operational_state = models.CharField(max_length=32, default="not_started")
    snapshot_json = models.JSONField(default=dict)
    generated_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "copilot_dashboard_context_snapshots"
        indexes = [
            models.Index(fields=["store_id", "-generated_at"], name="copilot_ctx_store_gen_idx"),
            models.Index(fields=["org_id", "-generated_at"], name="copilot_ctx_org_gen_idx"),
        ]


class CopilotOperationalInsight(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org_id = models.UUIDField(db_index=True)
    store_id = models.UUIDField(db_index=True)
    category = models.CharField(max_length=64, db_index=True)
    severity = models.CharField(max_length=16, choices=INSIGHT_SEVERITY, default="info")
    headline = models.TextField()
    description = models.TextField(blank=True, default="")
    evidence_json = models.JSONField(default=dict)
    actions_json = models.JSONField(default=list)
    confidence = models.FloatField(default=0.0)
    status = models.CharField(max_length=16, choices=INSIGHT_STATUS, default="active", db_index=True)
    source_window_start = models.DateTimeField(null=True, blank=True)
    source_window_end = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "copilot_operational_insights"
        indexes = [
            models.Index(fields=["store_id", "status", "-created_at"], name="copilot_ins_store_st_ct_idx"),
            models.Index(fields=["org_id", "status", "-created_at"], name="copilot_ins_org_st_ct_idx"),
        ]


class CopilotReport72h(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org_id = models.UUIDField(db_index=True)
    store_id = models.UUIDField(db_index=True)
    status = models.CharField(max_length=16, choices=REPORT_STATUS, default="pending", db_index=True)
    summary_json = models.JSONField(default=dict)
    sections_json = models.JSONField(default=list)
    generated_at = models.DateTimeField(null=True, blank=True, db_index=True)
    source_window_start = models.DateTimeField(null=True, blank=True)
    source_window_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "copilot_reports_72h"
        indexes = [
            models.Index(fields=["store_id", "-generated_at"], name="copilot_r72_store_gen_idx"),
            models.Index(fields=["org_id", "-generated_at"], name="copilot_r72_org_gen_idx"),
        ]


class CopilotConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org_id = models.UUIDField(db_index=True)
    store_id = models.UUIDField(db_index=True)
    user_uuid = models.UUIDField(db_index=True)
    session_id = models.CharField(max_length=128, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "copilot_conversations"
        indexes = [
            models.Index(fields=["store_id", "user_uuid", "-updated_at"], name="copilot_conv_store_user_idx"),
            models.Index(fields=["session_id"], name="copilot_conv_session_idx"),
        ]


class CopilotMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        CopilotConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=16, choices=MESSAGE_ROLE, default="user")
    content = models.TextField()
    metadata_json = models.JSONField(default=dict)
    context_json = models.JSONField(default=dict)
    citations_json = models.JSONField(default=list)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "copilot_messages"
        indexes = [
            models.Index(fields=["conversation", "-created_at"], name="copilot_msg_conv_ct_idx"),
        ]


class StoreProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org_id = models.UUIDField(db_index=True)
    store_id = models.UUIDField(db_index=True, unique=True)
    business_model = models.CharField(max_length=64, choices=BUSINESS_MODEL, default="default")
    has_salao = models.BooleanField(default=False)
    has_pos_integration = models.BooleanField(default=False)
    opening_hours_json = models.JSONField(default=dict)
    timezone_name = models.CharField(db_column="timezone", max_length=64, default="America/Sao_Paulo")
    defaults_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "store_profile"
        indexes = [
            models.Index(fields=["org_id", "business_model"], name="store_profile_org_model_idx"),
        ]


class OperationalWindowHourly(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org_id = models.UUIDField(db_index=True)
    store_id = models.UUIDField(db_index=True)
    ts_bucket = models.DateTimeField(db_index=True)
    window_minutes = models.PositiveSmallIntegerField(default=60)
    metrics_json = models.JSONField(default=dict)
    metric_status_json = models.JSONField(default=dict)
    source_flags_json = models.JSONField(default=dict)
    confidence_score = models.PositiveSmallIntegerField(default=0)
    confidence_breakdown_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "operational_window_hourly"
        unique_together = (("store_id", "ts_bucket", "window_minutes"),)
        indexes = [
            models.Index(fields=["store_id", "-ts_bucket"], name="op_window_store_bucket_idx"),
            models.Index(fields=["org_id", "-ts_bucket"], name="op_window_org_bucket_idx"),
        ]
