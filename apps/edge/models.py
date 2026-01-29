from django.db import models

class EdgeEventReceipt(models.Model):
    receipt_id = models.CharField(max_length=128, unique=True)
    event_name = models.CharField(max_length=64)
    source = models.CharField(max_length=32, default="edge")
    store_id = models.CharField(max_length=64, null=True, blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_name} {self.receipt_id[:10]}"

