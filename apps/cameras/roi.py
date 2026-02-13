from typing import Optional
from django.utils import timezone

from .models import CameraROIConfig


def get_latest_roi_config(
    camera_id: str,
    *,
    status: Optional[str] = None,
) -> Optional[CameraROIConfig]:
    qs = CameraROIConfig.objects.filter(camera_id=camera_id)
    if status:
        qs = qs.filter(status=status)
    return qs.order_by("-version").first()


def create_roi_config(
    *,
    camera_id: str,
    payload: dict,
    status: str = "draft",
    image_w: Optional[int] = None,
    image_h: Optional[int] = None,
) -> CameraROIConfig:
    latest = get_latest_roi_config(camera_id)
    next_version = int(latest.version) + 1 if latest else 1
    now = timezone.now()
    return CameraROIConfig.objects.create(
        camera_id=camera_id,
        version=next_version,
        status=status,
        image_w=image_w,
        image_h=image_h,
        payload=payload,
        created_at=now,
        updated_at=now,
    )
