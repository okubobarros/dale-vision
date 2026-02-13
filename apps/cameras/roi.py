from typing import Optional
from django.utils import timezone

from .models import CameraROIConfig


def get_latest_roi_config(camera_id: str) -> Optional[CameraROIConfig]:
    return (
        CameraROIConfig.objects.filter(camera_id=camera_id)
        .order_by("-version")
        .first()
    )


def create_roi_config(
    *,
    camera_id: str,
    config_json: dict,
    updated_by: Optional[str] = None,
) -> CameraROIConfig:
    latest = get_latest_roi_config(camera_id)
    next_version = int(latest.version) + 1 if latest else 1
    return CameraROIConfig.objects.create(
        camera_id=camera_id,
        version=next_version,
        config_json=config_json,
        updated_at=timezone.now(),
        updated_by=updated_by,
    )
