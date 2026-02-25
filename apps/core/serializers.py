# apps/core/serializers.py
from rest_framework import serializers

from apps.core.models import DemoLead


class DemoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoLead
        fields = "__all__"
        read_only_fields = ("id", "created_at", "status")
