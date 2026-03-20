from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views import AdminHvEventHealthView


class AdminHvEventHealthViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = AdminHvEventHealthView.as_view()
        self.staff_user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)
        self.regular_user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=2)

    @patch("apps.core.views._load_hv_event_health_rows")
    def test_get_returns_event_health_payload(self, load_rows_mock):
        load_rows_mock.return_value = (
            [
                {"event_name": "operation_action_delegated", "events_total": 8, "stores_total": 2},
                {"event_name": "operation_action_feedback_submitted", "events_total": 4, "stores_total": 2},
                {"event_name": "operation_action_completed", "events_total": 4, "stores_total": 2},
                {"event_name": "owner_goal_defined", "events_total": 2, "stores_total": 2},
                {"event_name": "notification_tone_updated", "events_total": 2, "stores_total": 2},
                {"event_name": "notification_preferences_saved", "events_total": 2, "stores_total": 2},
            ],
            [
                {"store_id": "store-1", "event_name": "operation_action_delegated"},
                {"store_id": "store-1", "event_name": "operation_action_feedback_submitted"},
                {"store_id": "store-1", "event_name": "operation_action_completed"},
                {"store_id": "store-1", "event_name": "owner_goal_defined"},
                {"store_id": "store-1", "event_name": "notification_tone_updated"},
                {"store_id": "store-1", "event_name": "notification_preferences_saved"},
            ],
        )

        request = self.factory.get("/api/v1/me/admin/hv-event-health/?window_days=7")
        force_authenticate(request, user=self.staff_user)
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "go")
        self.assertEqual(len(response.data["missing_events"]), 0)
        self.assertEqual(response.data["stores"]["stores_with_any_event"], 1)
        self.assertEqual(response.data["stores"]["stores_with_all_events"], 1)

    @patch("apps.core.views._load_hv_event_health_rows")
    def test_get_reports_missing_events(self, load_rows_mock):
        load_rows_mock.return_value = (
            [{"event_name": "operation_action_delegated", "events_total": 1, "stores_total": 1}],
            [{"store_id": "store-1", "event_name": "operation_action_delegated"}],
        )
        request = self.factory.get("/api/v1/me/admin/hv-event-health/?window_days=7")
        force_authenticate(request, user=self.staff_user)
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "no_go")
        self.assertIn("operation_action_feedback_submitted", response.data["missing_events"])

    def test_get_blocks_non_internal_user(self):
        request = self.factory.get("/api/v1/me/admin/hv-event-health/")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, 403)
