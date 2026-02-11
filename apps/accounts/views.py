# apps/accounts/views.py
import logging
from uuid import uuid4
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import AuthenticationFailed
from knox.models import AuthToken
from knox.auth import TokenAuthentication
from django.contrib.auth import authenticate
from django.db import connection

from drf_yasg.utils import swagger_auto_schema  # ✅
from drf_yasg import openapi  # (opcional)

from .serializers import RegisterSerializer, LoginSerializer
from .auth_supabase import get_user_from_supabase_token, SupabaseJWTAuthentication
from apps.core.models import OrgMember, Store, Camera
from apps.stores.services.user_uuid import upsert_user_id_map

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=RegisterSerializer, responses={201: openapi.Response("Created")})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = AuthToken.objects.create(user)[1]

        return Response(
            {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "token": token,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=LoginSerializer, responses={200: openapi.Response("OK")})
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        token = AuthToken.objects.create(user)[1]

        return Response(
            {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "token": token,
            },
            status=status.HTTP_200_OK,
        )


class SupabaseBootstrapView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        auth = request.headers.get("Authorization") or ""
        token = ""
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
        if not token:
            token = (request.data or {}).get("access_token") or ""
        if not token:
            return Response({"detail": "Token ausente."}, status=status.HTTP_400_BAD_REQUEST)

        user = get_user_from_supabase_token(token, ensure_org=True)

        # retornar orgs atuais
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT user_uuid FROM public.user_id_map WHERE django_user_id = %s",
                [user.id],
            )
            row = cursor.fetchone()
            user_uuid = row[0] if row else None

        orgs = []
        if user_uuid:
            memberships = (
                OrgMember.objects
                .filter(user_id=user_uuid)
                .select_related("org")
            )
            orgs = [
                {"id": str(m.org.id), "name": m.org.name, "role": m.role}
                for m in memberships
            ]

        return Response(
            {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "orgs": orgs,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user or not getattr(user, "id", None):
            return Response({"detail": "Usuário não autenticado."}, status=status.HTTP_403_FORBIDDEN)

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT user_uuid FROM public.user_id_map WHERE django_user_id = %s",
                [user.id],
            )
            row = cursor.fetchone()
            if not row or not row[0]:
                cursor.execute(
                    "INSERT INTO public.user_id_map (django_user_id) VALUES (%s) RETURNING user_uuid",
                    [user.id],
                )
                row = cursor.fetchone()
            user_uuid = row[0]

        memberships = (
            OrgMember.objects
            .filter(user_id=user_uuid)
            .select_related("org")
        )
        orgs = [
            {
                "id": str(m.org.id),
                "name": m.org.name,
                "role": m.role,
            }
            for m in memberships
        ]

        return Response(
            {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "orgs": orgs,
            },
            status=status.HTTP_200_OK,
        )


class SetupStateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        request_id = (request.headers.get("X-Request-ID") or uuid4().hex)[:12]

        def respond(payload: dict, status_code: int):
            payload["request_id"] = request_id
            return Response(payload, status=status_code)

        def not_authenticated(reason: str):
            logger.info("[SETUP_STATE] request_id=%s not_authenticated reason=%s", request_id, reason)
            return respond({"ok": False, "error": "not_authenticated"}, status.HTTP_401_UNAUTHORIZED)

        user = None
        try:
            supa_auth = SupabaseJWTAuthentication()
            supa_result = supa_auth.authenticate(request)
            if supa_result:
                user = supa_result[0]
        except AuthenticationFailed as exc:
            logger.warning(
                "[SETUP_STATE] request_id=%s supabase_auth_failed error=%s",
                request_id,
                str(exc) or "auth_failed",
            )
            return not_authenticated("supabase_auth_failed")
        except Exception:
            logger.exception("[SETUP_STATE] request_id=%s supabase_auth_exception", request_id)
            return not_authenticated("supabase_auth_exception")

        if not user:
            try:
                knox_auth = TokenAuthentication()
                knox_result = knox_auth.authenticate(request)
                if knox_result:
                    user = knox_result[0]
            except Exception:
                logger.exception("[SETUP_STATE] request_id=%s knox_auth_exception", request_id)
                return not_authenticated("knox_auth_exception")

        if not user or not getattr(user, "is_authenticated", False):
            return not_authenticated("missing_user")

        def _no_store_response(*, org_count: int = 0):
            return respond(
                {
                    "ok": True,
                    "state": "no_store",
                    "has_store": False,
                    "has_edge": False,
                    "store_count": 0,
                    "org_count": org_count,
                    "primary_store_id": None,
                },
                status.HTTP_200_OK,
            )

        try:
            if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
                store_ids = list(Store.objects.values_list("id", flat=True))
                org_count = OrgMember.objects.values("org_id").distinct().count()
            else:
                try:
                    user_uuid = upsert_user_id_map(user, email=getattr(user, "email", None))
                except Exception:
                    logger.warning(
                        "[SETUP_STATE] request_id=%s user_id_map failed user_id=%s",
                        request_id,
                        user.id,
                    )
                    return _no_store_response()

                org_ids = list(
                    OrgMember.objects.filter(user_id=user_uuid).values_list("org_id", flat=True)
                )
                org_count = len(org_ids)
                if not org_ids:
                    return _no_store_response(org_count=0)

                store_ids = list(Store.objects.filter(org_id__in=org_ids).values_list("id", flat=True))

            store_count = len(store_ids)
            has_store = store_count > 0
            if not has_store:
                return _no_store_response(org_count=org_count)

            has_edge = Store.objects.filter(id__in=store_ids, last_seen_at__isnull=False).exists()
            if not has_edge:
                has_edge = Camera.objects.filter(
                    store_id__in=store_ids,
                    last_seen_at__isnull=False,
                ).exists()

            logger.info(
                "[SETUP_STATE] request_id=%s user_id=%s has_store=%s has_edge=%s store_count=%s",
                request_id,
                user.id,
                has_store,
                has_edge,
                store_count,
            )

            return respond(
                {
                    "ok": True,
                    "state": "ready",
                    "has_store": has_store,
                    "has_edge": has_edge,
                    "store_count": store_count,
                    "org_count": org_count,
                    "primary_store_id": str(store_ids[0]) if store_ids else None,
                },
                status.HTTP_200_OK,
            )
        except Exception:
            logger.exception("[SETUP_STATE] request_id=%s failed user_id=%s", request_id, getattr(user, "id", None))
            return respond(
                {
                    "ok": False,
                    "error": "internal_error",
                    "state": "no_store",
                    "has_store": False,
                    "has_edge": False,
                    "store_count": 0,
                    "org_count": 0,
                    "primary_store_id": None,
                },
                status.HTTP_200_OK,
            )
