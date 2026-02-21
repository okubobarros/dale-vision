# apps/accounts/serializers.py
import logging
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate

logger = logging.getLogger(__name__)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]
        read_only_fields = ["id"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name"]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email já está em uso.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

class LoginSerializer(serializers.Serializer):
    # Compatibilidade: aceita "username" (legado) ou "identifier" (novo).
    username = serializers.CharField(required=False, allow_blank=True)
    identifier = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        identifier = (attrs.get("identifier") or attrs.get("username") or "").strip()
        password = attrs.get("password") or ""
        if not identifier or not password:
            raise serializers.ValidationError("Credenciais inválidas.")

        auth_username = identifier
        if "@" in identifier:
            matches = User.objects.filter(email__iexact=identifier)
            count = matches.count()
            if count == 1:
                auth_username = matches.first().username
            else:
                if count > 1:
                    logger.error(
                        "Duplicate emails found for login identifier: %s (count=%s)",
                        identifier,
                        count,
                    )
                raise serializers.ValidationError("Credenciais inválidas.")

        user = authenticate(
            request=self.context.get("request"),
            username=auth_username,
            password=password,
        )
        if not user:
            raise serializers.ValidationError("Credenciais inválidas.")
        if not user.is_active:
            raise serializers.ValidationError("Credenciais inválidas.")
        attrs["user"] = user
        return attrs
