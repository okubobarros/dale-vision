# apps/stores/serializers.py
from rest_framework import serializers
from apps.core.models import Store

class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = [
            "id",
            "org",
            "code",
            "name",
            "mall_name",
            "city",
            "state",
            "address",
            "status",
            "trial_started_at",
            "trial_ends_at",
            "blocked_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
