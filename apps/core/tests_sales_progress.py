from django.contrib.auth.models import User
from rest_framework.test import APITestCase


class SalesProgressViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="sales-user",
            email="sales@example.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user)

    def test_get_sales_progress_returns_default_when_not_configured(self):
        response = self.client.get("/api/v1/sales/progress/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["state"], "not_configured")
        self.assertEqual(float(response.data["target_revenue"]), 0.0)
        self.assertEqual(response.data["days_mode"], "calendar")

    def test_post_sales_progress_persists_goal_and_returns_payload(self):
        response = self.client.post(
            "/api/v1/sales/progress/",
            {
                "month": "2026-03",
                "target_revenue": 50000,
                "days_mode": "business",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["month"], "2026-03")
        self.assertEqual(float(response.data["target_revenue"]), 50000.0)
        self.assertEqual(response.data["days_mode"], "business")

        get_response = self.client.get("/api/v1/sales/progress/?month=2026-03")
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(float(get_response.data["target_revenue"]), 50000.0)

    def test_post_sales_progress_rejects_invalid_target(self):
        response = self.client.post(
            "/api/v1/sales/progress/",
            {
                "month": "2026-03",
                "target_revenue": 0,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
