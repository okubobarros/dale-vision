from django.contrib.auth.models import User
from rest_framework.test import APITestCase


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
