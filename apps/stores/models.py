# apps/stores/models.py

from django.db import models
from django.contrib.auth.models import User


class Store(models.Model):
    PLAN_CHOICES = [
        ('trial', 'Trial'),
        ('basic', 'Básico'),
        ('pro', 'Profissional'),
        ('enterprise', 'Enterprise'),
    ]

    STATUS_CHOICES = [
        ('active', 'Ativa'),
        ('inactive', 'Inativa'),
        ('maintenance', 'Manutenção'),
    ]

    name = models.CharField(max_length=200)

    # ⚠️ Owner pode ser NULL no início
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='stores',
        null=True,
        blank=True
    )

    description = models.TextField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=2, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        default='trial'
    )

    # 🔥 Fonte única de verdade
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    owner_email = models.EmailField(blank=True, null=True)

    @property
    def is_active(self):
        """Campo derivado: loja ativa apenas se status == active"""
        return self.status == 'active'

    def save(self, *args, **kwargs):
        if self.owner and not self.owner_email:
            self.owner_email = self.owner.email
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
