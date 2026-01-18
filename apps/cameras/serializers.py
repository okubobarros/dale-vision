from rest_framework import serializers
from apps.core.models import Camera, CameraHealthLog

class CameraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Camera
        fields = "__all__"
        read_only_fields = ("id","created_at","updated_at","last_seen_at","last_snapshot_url","last_error")

class CameraHealthLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraHealthLog
        fields = "__all__"
        read_only_fields = ("id","checked_at")
