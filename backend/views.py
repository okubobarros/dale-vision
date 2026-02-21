from django.http import JsonResponse
from django.db import connection

from apps.accounts.auth_supabase import _get_supabase_config


def health(request):
    return JsonResponse({"ok": True})


def auth_health(request):
    url, key = _get_supabase_config()
    org_trial_ends_at = _column_exists("organizations", "trial_ends_at")
    return JsonResponse(
        {
            "ok": True,
            "supabase_configured": bool(url and key),
            "schema_outdated": not org_trial_ends_at,
            "organizations_trial_ends_at": org_trial_ends_at,
        }
    )


def _column_exists(table: str, column: str) -> bool:
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, table)
        return any(col.name == column for col in columns)
    except Exception:
        return False


def schema_health(request):
    org_trial_ends_at = _column_exists("organizations", "trial_ends_at")
    return JsonResponse(
        {
            "ok": True,
            "organizations_trial_ends_at": org_trial_ends_at,
            "schema_outdated": not org_trial_ends_at,
        }
    )
