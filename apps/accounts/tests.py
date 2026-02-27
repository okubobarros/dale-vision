import uuid
from unittest.mock import patch, MagicMock
from django.contrib.auth.models import User
from django.db import connection
from django.test import override_settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APITestCase, APIRequestFactory
from .auth_supabase import provision_user_from_supabase_info, SupabaseJWTAuthentication
from apps.stores.services.user_uuid import upsert_user_id_map


class LoginIdentifierTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="johndoe",
            email="john@example.com",
            password="pass1234",
        )

    def test_login_with_username_ok(self):
        response = self.client.post(
            "/api/accounts/login/",
            {"username": "johndoe", "password": "pass1234"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], "johndoe")

    def test_login_with_email_ok(self):
        response = self.client.post(
            "/api/accounts/login/",
            {"username": "john@example.com", "password": "pass1234"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["email"], "john@example.com")

    def test_login_invalid_email_same_error_as_wrong_password(self):
        response_email = self.client.post(
            "/api/accounts/login/",
            {"username": "missing@example.com", "password": "pass1234"},
            format="json",
        )
        response_password = self.client.post(
            "/api/accounts/login/",
            {"username": "johndoe", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(response_email.status_code, 400)
        self.assertEqual(response_password.status_code, 400)
        self.assertEqual(response_email.data, response_password.data)
        self.assertIn(
            "Credenciais inválidas.",
            response_email.data.get("non_field_errors", [""])[0],
        )


class SupabaseProvisionTests(APITestCase):
    def _skip_if_not_pg(self):
        if connection.vendor != "postgresql":
            self.skipTest("Postgres required for user_id_map provisioning tests.")

    def _ensure_user_id_map(self):
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.user_id_map (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    django_user_id int NOT NULL UNIQUE,
                    user_uuid uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
                    created_at timestamptz DEFAULT now()
                );
                """
            )

    def _get_uuid_column(self) -> str:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "user_id_map")
        names = {col.name for col in columns}
        return "user_uuid" if "user_uuid" in names else "user_id"

    def test_upsert_user_id_map_creates_uuid_mapping(self):
        self._skip_if_not_pg()
        self._ensure_user_id_map()

        user = User.objects.create_user(
            username="mapuser",
            email="mapuser@example.com",
            password="pass1234",
        )
        user_uuid = str(uuid.uuid4())

        mapped_uuid = upsert_user_id_map(user, user_uuid=user_uuid)
        self.assertEqual(mapped_uuid, user_uuid)

        uuid_col = self._get_uuid_column()
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT {uuid_col}, django_user_id FROM public.user_id_map WHERE django_user_id = %s",
                [user.id],
            )
            row = cursor.fetchone()

        self.assertIsNotNone(row)
        self.assertEqual(str(row[0]), user_uuid)
        self.assertEqual(int(row[1]), user.id)

    def test_provision_creates_user_and_user_id_map(self):
        self._skip_if_not_pg()
        self._ensure_user_id_map()

        sub = str(uuid.uuid4())
        email = "supabase.user@example.com"
        user_info = {
            "id": sub,
            "email": email,
            "user_metadata": {"first_name": "Supabase", "last_name": "User"},
        }

        user = provision_user_from_supabase_info(user_info, ensure_org=False)
        self.assertEqual(user.email, email)
        self.assertEqual(user.username, email)
        self.assertTrue(user.is_active)

        uuid_col = self._get_uuid_column()
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT {uuid_col}, django_user_id FROM public.user_id_map WHERE django_user_id = %s",
                [user.id],
            )
            row = cursor.fetchone()

        self.assertIsNotNone(row)
        self.assertEqual(str(row[0]), sub)
        self.assertEqual(int(row[1]), user.id)

        # Idempotência: segunda chamada não deve criar novo user_id_map
        user_again = provision_user_from_supabase_info(user_info, ensure_org=False)
        self.assertEqual(user_again.id, user.id)


class SupabaseAuthFailureTests(APITestCase):
    def test_auth_missing_config_returns_authentication_failed(self):
        factory = APIRequestFactory()
        request = factory.get("/api/me/setup-state/")
        request.META["HTTP_AUTHORIZATION"] = "Bearer testtoken1234567890"

        auth = SupabaseJWTAuthentication()
        with override_settings(SUPABASE_URL=None, SUPABASE_KEY=None):
            with self.assertRaises(AuthenticationFailed):
                auth.authenticate(request)


class SetupStateUnauthenticatedTests(APITestCase):
    def test_setup_state_returns_401_json_when_missing_auth(self):
        response = self.client.get("/api/me/setup-state/")
        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.data.get("ok"))
        self.assertEqual(response.data.get("error"), "not_authenticated")
        self.assertIn("request_id", response.data)


class SetupStateProvisioningTests(APITestCase):
    def test_setup_state_with_bearer_token_provisions_and_returns_ok(self):
        user = User.objects.create_user(
            username="setupstate",
            email="setupstate@example.com",
            password="pass1234",
        )
        mapped_uuid = str(uuid.uuid4())

        with (
            patch(
                "apps.accounts.views.SupabaseJWTAuthentication.authenticate",
                return_value=(user, "token"),
            ) as auth_mock,
            patch(
                "apps.accounts.views.upsert_user_id_map",
                return_value=mapped_uuid,
            ) as upsert_mock,
            patch("apps.accounts.views.OrgMember.objects.filter") as filter_mock,
        ):
            filter_mock.return_value.values_list.return_value = []
            response = self.client.get(
                "/api/me/setup-state/",
                HTTP_AUTHORIZATION="Bearer testtoken123",
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("ok"))
        self.assertEqual(response.data.get("state"), "no_store")
        auth_mock.assert_called()
        upsert_mock.assert_called_once_with(user)


class MeStatusViewTests(APITestCase):
    def test_me_status_returns_trial_flags(self):
        user = User.objects.create_user(
            username="statususer",
            email="status@example.com",
            password="pass1234",
        )

        membership = MagicMock()
        membership.role = "owner"
        membership.org = MagicMock()
        membership.org.id = "11111111-1111-1111-1111-111111111111"

        cursor = MagicMock()
        cursor.fetchone.side_effect = [(uuid.uuid4(),)]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = None

        with (
            patch("apps.accounts.views.connection.cursor", return_value=cursor_cm),
            patch("apps.accounts.views.OrgMember.objects.filter") as filter_mock,
            patch("apps.accounts.views.is_trial_active", return_value=False),
            patch("apps.accounts.views.is_subscription_active", return_value=False),
            patch("apps.accounts.views.get_org_trial_ends_at", return_value=None),
        ):
            filter_mock.return_value.select_related.return_value.order_by.return_value.first.return_value = membership
            self.client.force_authenticate(user=user)
            response = self.client.get("/api/v1/me/status/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data.get("trial_active"))
        self.assertFalse(response.data.get("has_subscription"))
        self.assertEqual(response.data.get("role"), "owner")
