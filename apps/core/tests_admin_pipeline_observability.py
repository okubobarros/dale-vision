from datetime import datetime, timezone as dt_timezone
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views import AdminPipelineObservabilityView


class AdminPipelineObservabilityViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = AdminPipelineObservabilityView.as_view()
        self.staff_user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)
        self.regular_user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=2)

    @patch("apps.core.views._load_pipeline_observability_rows")
    def test_get_returns_pipeline_rows_for_internal_admin(self, load_rows_mock):
        load_rows_mock.return_value = [
            {
                "store_id": "store-1",
                "store_name": "Loja 1",
                "camera_key": "cam-1",
                "camera_name": "Entrada",
                "frames_received": 100,
                "events_accepted": 96,
                "events_generated": 90,
                "drop_rate": 0.04,
                "latency_ms_avg": 120.5,
                "latest_event_at": datetime(2026, 3, 20, 12, 0, tzinfo=dt_timezone.utc),
            }
        ]
        request = self.factory.get("/api/v1/me/admin/pipeline-observability/?window_hours=24")
        force_authenticate(request, user=self.staff_user)
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totals"]["rows_total"], 1)
        self.assertEqual(response.data["totals"]["frames_received"], 100)
        self.assertEqual(response.data["totals"]["events_accepted"], 96)
        self.assertEqual(response.data["totals"]["events_generated"], 90)
        self.assertEqual(response.data["rows"][0]["store_id"], "store-1")

    def test_get_blocks_non_internal_user(self):
        request = self.factory.get("/api/v1/me/admin/pipeline-observability/")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, 403)
