from django.db import models
from django.utils import timezone

class EdgeEventReceipt(models.Model):
    receipt_id = models.CharField(max_length=128, unique=True)
    event_name = models.CharField(max_length=64)
    source = models.CharField(max_length=32, default="edge")
    store_id = models.CharField(max_length=64, null=True, blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_name} {self.receipt_id[:10]}"


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

