from datetime import datetime, timezone as dt_timezone
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views import AdminCvQualityBaselineView


class AdminCvQualityBaselineViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = AdminCvQualityBaselineView.as_view()
        self.staff_user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)
        self.regular_user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=2)

    @patch("apps.core.views._load_cv_quality_baseline_rows")
    def test_get_returns_rows_for_internal_admin(self, load_rows_mock):
        load_rows_mock.return_value = [
            {
                "store_id": "store-1",
                "store_name": "Loja 1",
                "camera_id": "cam-1",
                "camera_name": "Entrada",
                "metric_name": "crossing_recall",
                "samples_total": 10,
                "passed_total": 8,
                "avg_delta": 0.12,
                "latest_validated_at": datetime(2026, 3, 20, 12, 0, tzinfo=dt_timezone.utc),
            }
        ]
        request = self.factory.get("/api/v1/me/admin/cv-quality-baseline/?period=7d")
        force_authenticate(request, user=self.staff_user)
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totals"]["samples_total"], 10)
        self.assertEqual(response.data["totals"]["passed_total"], 8)
        self.assertEqual(response.data["rows"][0]["metric_name"], "crossing_recall")

    def test_get_blocks_non_internal_user(self):
        request = self.factory.get("/api/v1/me/admin/cv-quality-baseline/")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, 403)
