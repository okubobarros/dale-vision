from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.copilot.views import CopilotActionOutcomeDetailView


class CopilotActionOutcomeDetailViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotActionOutcomeDetailView.as_view()

    @patch("apps.copilot.views._sync_value_ledger_from_outcome")
    @patch("apps.copilot.views.require_store_role")
    @patch("apps.copilot.views.ActionOutcome.objects.filter")
    @patch("apps.copilot.views._get_store_or_404")
    def test_patch_updates_outcome_and_syncs_ledger(
        self,
        mock_get_store,
        mock_filter,
        _mock_require_role,
        mock_sync_ledger,
    ):
        store_id = uuid4()
        outcome_id = uuid4()
        store = SimpleNamespace(id=store_id, org_id=uuid4())
        mock_get_store.return_value = (store, None)

        outcome = SimpleNamespace(
            id=outcome_id,
            org_id=store.org_id,
            store_id=store_id,
            action_event_id=None,
            insight_id="insight-123",
            action_type="whatsapp_delegation",
            channel="whatsapp",
            source="reports_executive",
            status="dispatched",
            outcome_status=None,
            outcome_comment=None,
            baseline_json={},
            outcome_json={},
            impact_expected_brl=320.0,
            impact_realized_brl=0.0,
            confidence_score=0,
            provider_message_id=None,
            delivery_status=None,
            delivery_error=None,
            delivered_at=None,
            failed_at=None,
            dispatched_at=None,
            completed_at=None,
            created_at=None,
            updated_at=None,
            save=MagicMock(),
        )
        mock_filter.return_value.first.return_value = outcome

        payload = {
            "status": "completed",
            "outcome_status": "resolved",
            "outcome_comment": "Equipe abriu caixa extra e estabilizou a fila.",
            "impact_realized_brl": 280.0,
            "confidence_score": 82,
            "outcome": {"queue_seconds_after": 180},
        }
        request = self.factory.patch(
            f"/api/v1/copilot/stores/{store_id}/actions/outcomes/{outcome_id}/",
            payload,
            format="json",
        )
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))

        response = self.view(request, store_id=store_id, outcome_id=outcome_id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(outcome.status, "completed")
        self.assertEqual(outcome.outcome_status, "resolved")
        self.assertEqual(outcome.outcome_comment, "Equipe abriu caixa extra e estabilizou a fila.")
        self.assertEqual(outcome.impact_realized_brl, 280.0)
        self.assertEqual(outcome.confidence_score, 82)
        self.assertEqual(outcome.outcome_json.get("queue_seconds_after"), 180)
        outcome.save.assert_called_once()
        mock_sync_ledger.assert_called_once_with(outcome)

    @patch("apps.copilot.views.require_store_role")
    @patch("apps.copilot.views.ActionOutcome.objects.filter")
    @patch("apps.copilot.views._get_store_or_404")
    def test_patch_returns_404_when_outcome_not_found(
        self,
        mock_get_store,
        mock_filter,
        _mock_require_role,
    ):
        store_id = uuid4()
        outcome_id = uuid4()
        store = SimpleNamespace(id=store_id, org_id=uuid4())
        mock_get_store.return_value = (store, None)
        mock_filter.return_value.first.return_value = None

        request = self.factory.patch(
            f"/api/v1/copilot/stores/{store_id}/actions/outcomes/{outcome_id}/",
            {"status": "completed"},
            format="json",
        )
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))
        response = self.view(request, store_id=store_id, outcome_id=outcome_id)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data.get("code"), "ACTION_OUTCOME_NOT_FOUND")
