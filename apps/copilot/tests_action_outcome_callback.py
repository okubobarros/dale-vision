from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.copilot.views import CopilotActionOutcomeCallbackView


class CopilotActionOutcomeCallbackViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotActionOutcomeCallbackView.as_view()

    @patch("apps.copilot.views._sync_value_ledger_from_outcome")
    @patch("apps.copilot.views.ActionOutcome.objects.filter")
    @patch("apps.copilot.views._is_valid_n8n_service_token")
    def test_callback_updates_delivery_fields(
        self,
        mock_token,
        mock_filter,
        mock_sync,
    ):
        mock_token.return_value = True
        event_id = uuid4()

        outcome = SimpleNamespace(
            id=uuid4(),
            action_event_id=event_id,
            org_id=uuid4(),
            store_id=uuid4(),
            status="dispatched",
            channel="whatsapp",
            provider_message_id=None,
            delivery_status=None,
            delivery_error=None,
            delivered_at=None,
            failed_at=None,
            completed_at=None,
            outcome_json={},
            updated_at=None,
            save=MagicMock(),
        )
        mock_filter.return_value.order_by.return_value.first.return_value = outcome

        payload = {
            "event_id": str(event_id),
            "provider_message_id": "wa_123",
            "delivery_status": "delivered",
            "delivery_error": None,
            "channel": "whatsapp",
        }
        request = self.factory.post(
            "/api/v1/copilot/actions/outcomes/callback/",
            payload,
            format="json",
            HTTP_X_N8N_SERVICE_TOKEN="token",
        )

        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ok"], True)
        self.assertEqual(response.data["delivery_status"], "delivered")
        outcome.save.assert_called_once()
        mock_sync.assert_called_once_with(outcome)

    @patch("apps.copilot.views._is_valid_n8n_service_token")
    def test_callback_rejects_invalid_token(self, mock_token):
        mock_token.return_value = False
        request = self.factory.post(
            "/api/v1/copilot/actions/outcomes/callback/",
            {"event_id": str(uuid4())},
            format="json",
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "FORBIDDEN")

    @patch("apps.copilot.views.ActionOutcome.objects.filter")
    @patch("apps.copilot.views._is_valid_n8n_service_token")
    def test_callback_returns_404_when_event_not_found(self, mock_token, mock_filter):
        mock_token.return_value = True
        mock_filter.return_value.order_by.return_value.first.return_value = None

        request = self.factory.post(
            "/api/v1/copilot/actions/outcomes/callback/",
            {"event_id": str(uuid4())},
            format="json",
            HTTP_X_N8N_SERVICE_TOKEN="token",
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data.get("code"), "ACTION_OUTCOME_NOT_FOUND")
