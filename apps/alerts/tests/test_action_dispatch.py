from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.alerts.views import ActionDispatchView


class ActionDispatchViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False, id=123, email="ops@dalevision.com")

    @patch("apps.alerts.views.send_event_to_n8n")
    @patch("apps.alerts.views.log_journey_event")
    @patch("apps.alerts.views._require_subscription_for_store_id")
    @patch("apps.alerts.views._resolve_accessible_store")
    def test_dispatch_action_returns_accepted(
        self,
        resolve_store_mock,
        _require_subscription_mock,
        log_journey_event_mock,
        send_event_to_n8n_mock,
    ):
        resolve_store_mock.return_value = SimpleNamespace(
            id="11111111-1111-1111-1111-111111111111",
            org_id="22222222-2222-2222-2222-222222222222",
        )
        log_journey_event_mock.return_value = SimpleNamespace(id="evt-123")
        send_event_to_n8n_mock.return_value = {"ok": True, "id": "n8n-1"}

        payload = {
            "store_id": "11111111-1111-1111-1111-111111111111",
            "insight_id": "reports-111",
            "action_type": "whatsapp_delegation",
            "channel": "whatsapp",
            "source": "reports_executive",
            "expected_impact_brl": 420.0,
            "confidence_score": 82,
            "context": {"problem": "Fila acima do ideal"},
        }

        view = ActionDispatchView.as_view()
        request = self.factory.post("/api/v1/alerts/actions/dispatch/", payload, format="json")
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 202)
        self.assertTrue(response.data.get("ok"))
        self.assertEqual(response.data.get("event_id"), "evt-123")
        send_event_to_n8n_mock.assert_called_once()

    @patch("apps.alerts.views._resolve_accessible_store")
    def test_dispatch_action_without_store_access_returns_400(self, resolve_store_mock):
        resolve_store_mock.return_value = None

        payload = {
            "store_id": "11111111-1111-1111-1111-111111111111",
            "insight_id": "reports-111",
        }

        view = ActionDispatchView.as_view()
        request = self.factory.post("/api/v1/alerts/actions/dispatch/", payload, format="json")
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("store_id", response.data)
