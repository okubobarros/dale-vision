# apps/cameras/models.py
from django.db import models
from django.utils import timezone
import uuid


class CameraROIConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    camera = models.ForeignKey(
        "core.Camera",
        on_delete=models.DO_NOTHING,
        db_column="camera_id",
        related_name="roi_configs",
    )
    version = models.IntegerField(default=1)
    status = models.CharField(max_length=20, default="draft")
    image_w = models.IntegerField(null=True, blank=True)
    image_h = models.IntegerField(null=True, blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "camera_roi_configs"
        constraints = [
            models.UniqueConstraint(
                fields=["camera", "version"],
                name="uniq_camera_roi_version",
            )
        ]


class CameraHealth(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    camera = models.ForeignKey(
        "core.Camera",
        on_delete=models.DO_NOTHING,
        db_column="camera_id",
        related_name="health",
    )
    last_seen_at = models.DateTimeField(null=True, blank=True)
    fps = models.FloatField(null=True, blank=True)
    lag_ms = models.IntegerField(null=True, blank=True)
    reconnects = models.IntegerField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "camera_health"
        constraints = [
            models.UniqueConstraint(
                fields=["camera"],
                name="uniq_camera_health",
            )
        ]


class CameraSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    camera = models.ForeignKey(
        "core.Camera",
        on_delete=models.DO_NOTHING,
        db_column="camera_id",
        related_name="snapshots",
    )
    snapshot_url = models.TextField(null=True, blank=True)
    storage_key = models.TextField(null=True, blank=True)
    captured_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "camera_snapshots"
