# apps/accounts/views.py
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from knox.models import AuthToken
from django.contrib.auth import authenticate
from django.db import connection

from drf_yasg.utils import swagger_auto_schema  # ✅
from drf_yasg import openapi  # (opcional)

from .serializers import RegisterSerializer, LoginSerializer
from .auth_supabase import get_user_from_supabase_token
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return Response({"detail": "Usuário não autenticado."}, status=status.HTTP_401_UNAUTHORIZED)

        def _no_store_response(*, org_count: int = 0):
            return Response(
                {
                    "state": "no_store",
                    "has_store": False,
                    "has_edge": False,
                    "store_count": 0,
                    "org_count": org_count,
                    "primary_store_id": None,
                },
                status=status.HTTP_200_OK,
            )

        try:
            if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
                store_ids = list(Store.objects.values_list("id", flat=True))
                org_count = OrgMember.objects.values("org_id").distinct().count()
            else:
                try:
                    user_uuid = upsert_user_id_map(user, email=getattr(user, "email", None))
                except Exception:
                    logger.warning("[SETUP_STATE] user_id_map failed user_id=%s", user.id)
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
                "[SETUP_STATE] user_id=%s has_store=%s has_edge=%s store_count=%s",
                user.id,
                has_store,
                has_edge,
                store_count,
            )

            return Response(
                {
                    "state": "ready",
                    "has_store": has_store,
                    "has_edge": has_edge,
                    "store_count": store_count,
                    "org_count": org_count,
                    "primary_store_id": str(store_ids[0]) if store_ids else None,
                },
                status=status.HTTP_200_OK,
            )
        except Exception:
            logger.exception("[SETUP_STATE] failed user_id=%s", getattr(user, "id", None))
            return _no_store_response()
