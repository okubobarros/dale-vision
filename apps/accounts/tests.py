import uuid
from django.contrib.auth.models import User
from django.db import connection
from rest_framework.test import APITestCase
from .auth_supabase import provision_user_from_supabase_info


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
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.user_id_map (
                    user_id uuid PRIMARY KEY,
                    django_user_id int NOT NULL UNIQUE,
                    email text,
                    created_at timestamptz DEFAULT now()
                );
                """
            )

    def _get_uuid_column(self) -> str:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "user_id_map")
        names = {col.name for col in columns}
        return "user_uuid" if "user_uuid" in names else "user_id"

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
                f"SELECT {uuid_col}, django_user_id, email FROM public.user_id_map WHERE django_user_id = %s",
                [user.id],
            )
            row = cursor.fetchone()

        self.assertIsNotNone(row)
        self.assertEqual(str(row[0]), sub)
        self.assertEqual(int(row[1]), user.id)
        self.assertEqual(row[2], email)

        # Idempotência: segunda chamada não deve criar novo user_id_map
        user_again = provision_user_from_supabase_info(user_info, ensure_org=False)
        self.assertEqual(user_again.id, user.id)
