# apps/accounts/views.py
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
from apps.core.models import OrgMember


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
