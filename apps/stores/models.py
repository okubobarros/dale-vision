from django.db import models
import uuid

class Store(models.Model):
    """Modelo básico de loja - VAMOS SIMPLIFICAR INICIALMENTE"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    owner_email = models.EmailField()
    
    # Config básica
    plan = models.CharField(max_length=20, default='trial')
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name