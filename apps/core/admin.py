# apps/core/admin.py
from django.contrib import admin
from . import models

# Registra tudo rapidamente (para não travar agora)
admin.site.register(models.Organization)
admin.site.register(models.OrgMember)
admin.site.register(models.Store)
admin.site.register(models.StoreZone)
admin.site.register(models.Camera)
admin.site.register(models.CameraHealthLog)
admin.site.register(models.Employee)
admin.site.register(models.Shift)
admin.site.register(models.TimeClockEntry)
admin.site.register(models.DetectionEvent)
admin.site.register(models.EventMedia)
admin.site.register(models.AlertRule)
admin.site.register(models.NotificationLog)
admin.site.register(models.DemoLead)
admin.site.register(models.OnboardingProgress)
admin.site.register(models.BillingCustomer)
admin.site.register(models.Subscription)
admin.site.register(models.AuditLog)
