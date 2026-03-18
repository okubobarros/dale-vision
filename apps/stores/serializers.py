# apps/stores/serializers.py
from django.utils import timezone
from django.db import DatabaseError
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
            "pos_integration_interest",
            "avg_hourly_labor_cost",
            "hours_weekdays",
            "hours_saturday",
            "hours_sunday_holiday",
            "employees_count",
            "cameras_count",
            "status",
            "trial_started_at",
            "trial_ends_at",
            "blocked_reason",
            "last_seen_at",
            "last_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "org": {"required": False, "allow_null": True},
        }


class EmployeeSerializer(serializers.ModelSerializer):
    # Accept store_id from onboarding, but also allow store for backward compatibility.
    store = serializers.PrimaryKeyRelatedField(queryset=Store.objects.all(), required=False)
    store_id = serializers.UUIDField(write_only=True, required=False)
    email = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    role_other = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        store_id = attrs.pop("store_id", None)
        store = attrs.get("store")
        if store_id is None and store is None:
            raise serializers.ValidationError({"store_id": "Este campo é obrigatório."})
        if store_id is not None:
            if store is not None and str(store.id) != str(store_id):
                raise serializers.ValidationError({"store_id": "store_id não corresponde à store informada."})
            if store is None:
                try:
                    # Avoid selecting all Store columns during onboarding employee create;
                    # this prevents unrelated schema drift from causing a 500 here.
                    attrs["store"] = Store.objects.only("id", "org_id").get(id=store_id)
                except Store.DoesNotExist:
                    raise serializers.ValidationError({"store_id": "Loja inválida."})
                except DatabaseError:
                    raise serializers.ValidationError(
                        {"store_id": "Falha ao validar loja (schema de banco desatualizado)."}
                    )
        return attrs

    def create(self, validated_data):
        validated_data.setdefault("created_at", timezone.now())
        validated_data.setdefault("active", True)
        try:
            return super().create(validated_data)
        except DatabaseError as exc:
            message = str(exc).lower()

            # Handle enum drift between app role choices and DB enum values.
            if "employee_role" in message and validated_data.get("role") != "other":
                normalized_data = dict(validated_data)
                original_role = normalized_data.get("role")
                normalized_data["role"] = "other"
                normalized_data["role_other"] = normalized_data.get("role_other") or original_role
                try:
                    return super().create(normalized_data)
                except DatabaseError:
                    pass

            if "duplicate key" in message or "unique" in message:
                raise serializers.ValidationError(
                    {"email": "Este e-mail já está cadastrado nesta loja."}
                )

            raise serializers.ValidationError(
                {"non_field_errors": ["Não foi possível salvar os funcionários agora."]}
            )

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
