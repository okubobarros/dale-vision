from django.db import models
import uuid

class DetectionEvent(models.Model):
    """Evento de detecção - SIMPLIFICADO"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    camera = models.ForeignKey('cameras.Camera', on_delete=models.CASCADE, related_name='events')
    
    # Detecção
    event_type = models.CharField(max_length=50)  # 'person', 'phone', etc
    confidence = models.FloatField()
    
    # Timestamp
    detected_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.event_type} - {self.camera.name}"