# apps/stores/admin.py

from django.contrib import admin
from .models import Store


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner_email', 'plan', 'status', 'is_active', 'created_at']
    list_filter = ['status', 'plan', 'created_at']
    search_fields = ['name', 'owner_email', 'city']
    readonly_fields = ['created_at', 'updated_at', 'is_active']

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'owner', 'owner_email', 'description')
        }),
        ('Localização', {
            'fields': ('address', 'city', 'state', 'phone', 'email')
        }),
        ('Configurações', {
            'fields': ('plan', 'status')
        }),
        ('Status Calculado', {
            'fields': ('is_active',),
        }),
        ('Datas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
