import logging
from typing import Optional
from django.core.exceptions import PermissionDenied
from django.db import connection

logger = logging.getLogger(__name__)
_USER_ID_MAP_UUID_COLUMN = None


def _get_user_id_map_uuid_column() -> str:
    global _USER_ID_MAP_UUID_COLUMN
    if _USER_ID_MAP_UUID_COLUMN:
        return _USER_ID_MAP_UUID_COLUMN

    resolved = "user_id"
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "user_id_map")
        names = {col.name for col in columns}
        if "user_uuid" in names:
            resolved = "user_uuid"
        elif "user_id" in names:
            resolved = "user_id"
    except Exception:
        logger.exception("[USER_ID_MAP] failed to inspect columns")

    _USER_ID_MAP_UUID_COLUMN = resolved
    return resolved


def upsert_user_id_map(
    user,
    *,
    user_uuid: Optional[str] = None,
) -> str:
    """
    Map Django auth_user.id -> public.user_id_map.(user_uuid|user_id).
    If user_uuid is provided, it will be used (idempotent).
    """
    if not user or not getattr(user, "id", None):
        raise PermissionDenied("Usuário não autenticado.")

    uuid_col = _get_user_id_map_uuid_column()
    desired_uuid = str(user_uuid) if user_uuid else None

    with connection.cursor() as cursor:
        cursor.execute(
            f"SELECT {uuid_col} FROM public.user_id_map WHERE django_user_id = %s",
            [user.id],
        )
        row = cursor.fetchone()
        if row and row[0]:
            existing_uuid = str(row[0])
            if desired_uuid and desired_uuid != existing_uuid:
                cursor.execute(
                    f"SELECT django_user_id FROM public.user_id_map WHERE {uuid_col} = %s",
                    [desired_uuid],
                )
                conflict = cursor.fetchone()
                if conflict and int(conflict[0]) != user.id:
                    logger.warning(
                        "[USER_ID_MAP] conflict user_uuid=%s existing_django_user_id=%s requested_django_user_id=%s",
                        desired_uuid,
                        conflict[0],
                        user.id,
                    )
                    return existing_uuid
                cursor.execute(
                    f"UPDATE public.user_id_map SET {uuid_col} = %s WHERE django_user_id = %s",
                    [desired_uuid, user.id],
                )
                return desired_uuid

            return existing_uuid

        if desired_uuid:
            cursor.execute(
                f"INSERT INTO public.user_id_map ({uuid_col}, django_user_id, created_at) "
                f"VALUES (%s, %s, now()) RETURNING {uuid_col}",
                [desired_uuid, user.id],
            )
        else:
            cursor.execute(
                f"INSERT INTO public.user_id_map ({uuid_col}, django_user_id, created_at) "
                f"VALUES (gen_random_uuid(), %s, now()) RETURNING {uuid_col}",
                [user.id],
            )
        return str(cursor.fetchone()[0])


def ensure_user_uuid(user):
    """
    Map Django auth_user.id -> public.user_id_map.(user_uuid|user_id), creating if missing.
    Sem dependências de DRF.
    """
    return upsert_user_id_map(user)
