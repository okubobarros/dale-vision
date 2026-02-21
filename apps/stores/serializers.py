# apps/stores/serializers.py
from django.utils import timezone
from rest_framework import serializers
from apps.core.models import Store, Employee

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


class EmployeeSerializer(serializers.ModelSerializer):
    store_id = serializers.UUIDField(write_only=True, required=True)
    email = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    role_other = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        store_id = attrs.pop("store_id", None)
        if store_id is not None and "store" not in attrs:
            try:
                attrs["store"] = Store.objects.get(id=store_id)
            except Store.DoesNotExist:
                raise serializers.ValidationError({"store_id": "Loja inválida."})
        return attrs

    def create(self, validated_data):
        validated_data.setdefault("created_at", timezone.now())
        validated_data.setdefault("active", True)
        return super().create(validated_data)

    class Meta:
        model = Employee
        fields = [
            "id",
            "store",
            "store_id",
            "full_name",
            "email",
            "role",
            "role_other",
            "external_id",
            "active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
