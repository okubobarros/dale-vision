from django.db import models
from django.db.models import Q
from django.utils import timezone
import uuid

class EdgeToken(models.Model):
    store_id = models.UUIDField(db_index=True)
    token_hash = models.CharField(max_length=128, unique=True)
    token_plaintext = models.CharField(max_length=255, null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.store_id} ({'active' if self.active else 'inactive'})"


class EdgeEventMinuteStats(models.Model):
    store_id = models.UUIDField(db_index=True)
    event_name = models.CharField(max_length=64, db_index=True)
    minute_bucket = models.DateTimeField(db_index=True)
    count = models.IntegerField(default=0)
    last_event_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "edge_event_minute_stats"
        unique_together = (("store_id", "event_name", "minute_bucket"),)

    def __str__(self):
        return f"{self.store_id} {self.event_name} {self.minute_bucket} ({self.count})"


class StoreCalibrationRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_id = models.UUIDField(db_index=True)
    camera_id = models.UUIDField(db_index=True)
    metric_type = models.CharField(max_length=64, db_index=True)
    roi_version = models.CharField(max_length=32, null=True, blank=True)
    manual_sample_size = models.IntegerField(null=True, blank=True)
    manual_reference_value = models.FloatField(null=True, blank=True)
    system_value = models.FloatField(null=True, blank=True)
    error_pct = models.FloatField(null=True, blank=True)
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=32, default="approved")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "store_calibration_runs"
        indexes = [
            models.Index(fields=["store_id", "camera_id", "metric_type", "-approved_at"]),
        ]

    def __str__(self):
        return f"{self.store_id} {self.camera_id} {self.metric_type} ({self.status})"


class EdgeUpdatePolicy(models.Model):
    CHANNEL_STABLE = "stable"
    CHANNEL_CANARY = "canary"
    CHANNEL_CHOICES = (
        (CHANNEL_STABLE, CHANNEL_STABLE),
        (CHANNEL_CANARY, CHANNEL_CANARY),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_id = models.UUIDField(db_index=True, unique=True)
    channel = models.CharField(max_length=16, choices=CHANNEL_CHOICES, default=CHANNEL_STABLE)
    target_version = models.CharField(max_length=64)
    current_min_supported = models.CharField(max_length=64, null=True, blank=True)
    rollout_start_local = models.CharField(max_length=5, default="02:00")
    rollout_end_local = models.CharField(max_length=5, default="05:00")
    rollout_timezone = models.CharField(max_length=64, default="America/Sao_Paulo")
    package_url = models.TextField()
    package_sha256 = models.CharField(max_length=128)
    package_size_bytes = models.BigIntegerField(null=True, blank=True)
    health_max_boot_seconds = models.IntegerField(default=120)
    health_require_heartbeat_seconds = models.IntegerField(default=180)
    health_require_camera_health_count = models.IntegerField(default=3)
    rollback_enabled = models.BooleanField(default=True)
    rollback_max_failed_attempts = models.IntegerField(default=1)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "edge_update_policies"
        indexes = [
            models.Index(fields=["store_id", "active", "-updated_at"]),
        ]

    def __str__(self):
        return f"{self.store_id} {self.channel} {self.target_version}"


class EdgeUpdateEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_id = models.UUIDField(db_index=True)
    agent_id = models.CharField(max_length=64, null=True, blank=True)
    from_version = models.CharField(max_length=64, null=True, blank=True)
    to_version = models.CharField(max_length=64, null=True, blank=True)
    channel = models.CharField(max_length=16, null=True, blank=True)
    status = models.CharField(max_length=32, db_index=True)
    phase = models.CharField(max_length=64, null=True, blank=True)
    event = models.CharField(max_length=64, db_index=True)
    attempt = models.IntegerField(default=1)
    elapsed_ms = models.IntegerField(null=True, blank=True)
    reason_code = models.CharField(max_length=64, null=True, blank=True)
    reason_detail = models.TextField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=128, null=True, blank=True, db_index=True)
    meta = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "edge_update_events"
        indexes = [
            models.Index(fields=["store_id", "-timestamp"]),
            models.Index(fields=["store_id", "agent_id", "-timestamp"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["store_id", "idempotency_key"],
                condition=Q(idempotency_key__isnull=False),
                name="edge_update_event_store_idemp_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.store_id} {self.event} {self.status}"

