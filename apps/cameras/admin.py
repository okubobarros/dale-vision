from django.contrib import admin
from .models import Camera

@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin):
    list_display = ['name', 'store', 'is_active', 'last_connected']
    list_filter = ['is_active', 'store']