from django.db import models
import uuid

class Camera(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='cameras')
    name = models.CharField(max_length=100)
    rtsp_url = models.CharField(max_length=500)
    
    # Status
    is_active = models.BooleanField(default=True)
    last_connected = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.store.name})"