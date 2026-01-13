from django.db import models

class AppConfig(models.Model):
    """Modelo placeholder para o app Core aparecer no admin"""
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.key