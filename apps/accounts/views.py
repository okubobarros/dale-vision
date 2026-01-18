# apps/accounts/views.py
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from knox.models import AuthToken
from django.contrib.auth import authenticate

from drf_yasg.utils import swagger_auto_schema  # ✅
from drf_yasg import openapi  # (opcional)

from .serializers import RegisterSerializer, LoginSerializer


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
