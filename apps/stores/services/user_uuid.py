from django.core.exceptions import PermissionDenied
from django.db import connection


def ensure_user_uuid(user):
    """
    Map Django auth_user.id -> public.user_id_map.user_uuid, creating if missing.
    Sem dependências de DRF.
    """
    if not user or not getattr(user, "id", None):
        raise PermissionDenied("Usuário não autenticado.")

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_uuid FROM public.user_id_map WHERE django_user_id = %s",
            [user.id],
        )
        row = cursor.fetchone()
        if row and row[0]:
            return row[0]

        cursor.execute(
            "INSERT INTO public.user_id_map (user_id, django_user_id, email, created_at) "
            "VALUES (gen_random_uuid(), %s, %s, now()) RETURNING user_id",
            [user.id, getattr(user, "email", None)],
        )
        return cursor.fetchone()[0]
