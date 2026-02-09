# apps/stores/serializers.py
from rest_framework import serializers
from apps.core.models import Store

class StoreSerializer(serializers.ModelSerializer):
    org_id = serializers.UUIDField(write_only=True, required=False)

    def validate(self, attrs):
        org_id = attrs.pop("org_id", None)
        if org_id is not None and "org" not in attrs:
            attrs["org"] = org_id
        return attrs

    class Meta:
        model = Store
        fields = [
            "id",
            "org",
            "org_id",
            "code",
            "name",
            "mall_name",
            "city",
            "state",
            "address",
            "business_type",
            "business_type_other",
            "pos_system",
            "pos_other",
            "hours_weekdays",
            "hours_saturday",
            "hours_sunday_holiday",
            "employees_count",
            "cameras_count",
            "status",
            "trial_started_at",
            "trial_ends_at",
            "blocked_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "org": {"required": False, "allow_null": True},
        }
