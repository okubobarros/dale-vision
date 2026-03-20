from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views import AdminIngestionFunnelGapView


class AdminIngestionFunnelGapViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = AdminIngestionFunnelGapView.as_view()
        self.staff_user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)
        self.regular_user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=2)

    @patch("apps.core.views._load_ingestion_funnel_gap_rows")
    def test_get_returns_rows_for_internal_admin(self, load_rows_mock):
        load_rows_mock.return_value = [
            {
                "store_id": "store-1",
                "org_id": "org-1",
                "store_name": "Loja 1",
                "vision_events": 42,
                "last_vision_ts": None,
            }
        ]
        request = self.factory.get("/api/v1/me/admin/ingestion-funnel-gap/?window_hours=24")
        force_authenticate(request, user=self.staff_user)

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["rows_total"], 1)
        self.assertEqual(response.data["rows"][0]["store_id"], "store-1")
        self.assertEqual(response.data["rows"][0]["vision_events"], 42)

    def test_get_blocks_non_internal_user(self):
        request = self.factory.get("/api/v1/me/admin/ingestion-funnel-gap/")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, 403)

    @patch("apps.core.views.log_journey_event")
    @patch("apps.core.views._load_ingestion_funnel_gap_rows")
    def test_post_repairs_gap_rows(self, load_rows_mock, log_event_mock):
        load_rows_mock.return_value = [
            {
                "store_id": "store-1",
                "org_id": "org-1",
                "store_name": "Loja 1",
                "vision_events": 10,
                "last_vision_ts": None,
            },
            {
                "store_id": "store-2",
                "org_id": "org-1",
                "store_name": "Loja 2",
                "vision_events": 8,
                "last_vision_ts": None,
            },
        ]
        log_event_mock.return_value = {"ok": True}

        request = self.factory.post(
            "/api/v1/me/admin/ingestion-funnel-gap/",
            {"window_hours": 24},
            format="json",
        )
        force_authenticate(request, user=self.staff_user)
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["candidates_total"], 2)
        self.assertEqual(response.data["repaired_total"], 2)
        self.assertEqual(log_event_mock.call_count, 2)
