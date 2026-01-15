# apps/stores/serializers.py

from rest_framework import serializers
from .models import Store


class StoreSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.SerializerMethodField()
    days_since_creation = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = [
            'id',
            'name',
            'description',
            'address',
            'city',
            'state',
            'phone',
            'email',
            'plan',
            'status',
            'status_display',
            'is_active',
            'days_since_creation',
            'owner_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner_email', 'is_active']

    def get_is_active(self, obj):
        return obj.status == 'active'

    def get_days_since_creation(self, obj):
        from django.utils import timezone
        if obj.created_at:
            delta = timezone.now() - obj.created_at
            return delta.days
        return 0

    def create(self, validated_data):
        return super().create(validated_data)

