from typing import Optional

from django.core.exceptions import FieldError
from django.db import connection
from django.db.utils import OperationalError, ProgrammingError
from rest_framework.exceptions import ValidationError

from apps.core.models import Camera, Store

TRIAL_CAMERA_LIMIT = 3
TRIAL_CAMERA_LIMIT_MESSAGE = (
    "Limite do trial: máximo de 3 câmeras ativas por loja. "
    "Faça upgrade ou fale com nosso time."
)


def camera_active_column_exists() -> bool:
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "cameras")
        return any(col.name == "active" for col in columns)
    except Exception:
        return False


def get_store_status(store_id: str) -> Optional[str]:
    row = Store.objects.filter(id=store_id).values("status").first()
    if not row:
        return None
    return row.get("status")


def count_active_cameras(store_id: str, *, exclude_camera_id: Optional[str] = None) -> int:
    qs = Camera.objects.filter(store_id=store_id)
    if camera_active_column_exists():
        try:
            qs = qs.filter(active=True)
        except FieldError:
            pass
    if exclude_camera_id:
        qs = qs.exclude(id=exclude_camera_id)
    try:
        return int(qs.count())
    except (OperationalError, ProgrammingError):
        return 0


def enforce_trial_camera_limit(
    store_id: str,
    *,
    requested_active: bool = True,
    exclude_camera_id: Optional[str] = None,
) -> None:
    if not requested_active:
        return

    status = get_store_status(store_id)
    if status != "trial":
        return

    active_count = count_active_cameras(store_id, exclude_camera_id=exclude_camera_id)
    if active_count >= TRIAL_CAMERA_LIMIT:
        raise ValidationError(TRIAL_CAMERA_LIMIT_MESSAGE)
