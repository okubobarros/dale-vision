from django.contrib import admin
from .models import Store

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner_email', 'plan', 'is_active', 'created_at']
    list_filter = ['is_active', 'plan']
    search_fields = ['name', 'owner_email']