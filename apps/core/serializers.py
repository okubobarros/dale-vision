from rest_framework import serializers
from apps.core import models

class DemoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.DemoLead
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")
