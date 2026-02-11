from django.http import JsonResponse

from apps.accounts.auth_supabase import _get_supabase_config


def health(request):
    return JsonResponse({"ok": True})


def auth_health(request):
    url, key = _get_supabase_config()
    return JsonResponse({"ok": True, "supabase_configured": bool(url and key)})
