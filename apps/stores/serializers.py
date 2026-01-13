# apps/stores/serializers.py
from rest_framework import serializers
from .models import Store

class StoreSerializer(serializers.ModelSerializer):
    # Campos calculados/readonly
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_since_creation = serializers.SerializerMethodField()
    
    class Meta:
        model = Store
        fields = [
            'id', 
            'name', 
            'plan', 
            'is_active',
            'status_display',
            'days_since_creation',
            'created_at', 
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']  
    
    def get_days_since_creation(self, obj):
        from django.utils import timezone
        if obj.created_at:
            delta = timezone.now() - obj.created_at
            return delta.days
        return 0
    
    def create(self, validated_data):
        """Ao criar, define owner_email como email do usuário logado"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if request.user.is_authenticated:
                validated_data['owner_email'] = request.user.email
        return super().create(validated_data)