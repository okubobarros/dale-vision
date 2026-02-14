from rest_framework import serializers
from apps.core.models import Camera, CameraHealthLog
from .models import CameraROIConfig, CameraHealth

class CameraSerializer(serializers.ModelSerializer):
    rtsp_url_masked = serializers.SerializerMethodField()
    latency_ms = serializers.SerializerMethodField()

    class Meta:
        model = Camera
        fields = (
            "id",
            "store",
            "name",
            "external_id",
            "brand",
            "ip",
            "username",
            "password",
            "rtsp_url",
            "rtsp_url_masked",
            "active",
            "status",
            "latency_ms",
            "last_seen_at",
            "last_error",
            "last_snapshot_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "last_seen_at",
            "last_error",
            "status",
            "rtsp_url_masked",
            "latency_ms",
            "last_snapshot_url",
        )
        extra_kwargs = {
            "rtsp_url": {"write_only": True, "required": False, "allow_null": True, "allow_blank": True},
            "password": {"write_only": True, "required": False, "allow_null": True, "allow_blank": True},
            "username": {"write_only": True, "required": False, "allow_null": True, "allow_blank": True},
            "external_id": {"required": False, "allow_null": True, "allow_blank": True},
            "active": {"required": False},
        }

    def get_rtsp_url_masked(self, obj):
        value = getattr(obj, "rtsp_url", None) or ""
        if not value:
            return None
        if "://" in value:
            scheme, rest = value.split("://", 1)
            return f"{scheme}://***"
        if len(value) <= 8:
            return "***"
        return f"{value[:4]}***{value[-3:]}"

    def get_latency_ms(self, obj):
        latest = (
            CameraHealthLog.objects.filter(camera_id=obj.id)
            .order_by("-checked_at")
            .values("latency_ms")
            .first()
        )
        if not latest:
            return None
        return latest.get("latency_ms")

class CameraHealthLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraHealthLog
        fields = "__all__"
        read_only_fields = ("id","checked_at")


class CameraROIConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraROIConfig
        fields = ("camera", "version", "config_json", "updated_at", "updated_by")
        read_only_fields = ("version", "updated_at", "updated_by")


class CameraHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraHealth
        fields = (
            "camera",
            "last_seen_at",
            "fps",
            "lag_ms",
            "reconnects",
            "error",
            "updated_at",
        )
        read_only_fields = ("updated_at",)
