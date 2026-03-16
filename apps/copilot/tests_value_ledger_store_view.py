from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.copilot.views import CopilotValueLedgerDailyView


class CopilotValueLedgerDailyViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotValueLedgerDailyView.as_view()

    @patch("apps.copilot.views.ValueLedgerDailySerializer")
    @patch("apps.copilot.views.ValueLedgerDaily.objects.filter")
    @patch("apps.copilot.views.require_store_role")
    @patch("apps.copilot.views._get_store_or_404")
    def test_get_returns_healthy_pipeline_when_recent_ledger_exists(
        self,
        mock_get_store,
        _mock_require_role,
        mock_filter,
        mock_serializer_cls,
    ):
        store_id = uuid4()
        store = SimpleNamespace(id=store_id, org_id=uuid4())
        mock_get_store.return_value = (store, None)

        latest_row = SimpleNamespace(method_version="value_ledger_v1_2026-03-15", updated_at=timezone.now())
        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.first.return_value = latest_row
        qs.aggregate.return_value = {
            "value_recovered": 300.0,
            "value_at_risk": 500.0,
            "actions_dispatched": 4,
            "actions_completed": 3,
            "confidence_avg": 78.0,
        }
        mock_filter.return_value = qs

        serializer = MagicMock()
        serializer.data = []
        mock_serializer_cls.return_value = serializer

        request = self.factory.get(f"/api/v1/copilot/stores/{store_id}/value-ledger/daily/?days=7")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 200)
        self.assertIn("pipeline_health", response.data)
        self.assertEqual(response.data["pipeline_health"]["status"], "healthy")
        self.assertFalse(response.data["pipeline_health"]["slo_breached"])
        self.assertIn("last_updated_at", response.data["pipeline_health"])
        self.assertEqual(response.data["method_version_current"], "value_ledger_v1_2026-03-15")
        self.assertIn("completion_rate", response.data["totals"])
        self.assertIn("recovery_rate", response.data["totals"])
        self.assertIn("value_net_gap_brl", response.data["totals"])

    @patch("apps.copilot.views.ValueLedgerDailySerializer")
    @patch("apps.copilot.views.ValueLedgerDaily.objects.filter")
    @patch("apps.copilot.views.require_store_role")
    @patch("apps.copilot.views._get_store_or_404")
    def test_get_returns_no_data_pipeline_when_store_has_no_ledger(
        self,
        mock_get_store,
        _mock_require_role,
        mock_filter,
        mock_serializer_cls,
    ):
        store_id = uuid4()
        store = SimpleNamespace(id=store_id, org_id=uuid4())
        mock_get_store.return_value = (store, None)

        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.first.return_value = None
        qs.aggregate.return_value = {
            "value_recovered": 0.0,
            "value_at_risk": 0.0,
            "actions_dispatched": 0,
            "actions_completed": 0,
            "confidence_avg": 0.0,
        }
        mock_filter.return_value = qs

        serializer = MagicMock()
        serializer.data = []
        mock_serializer_cls.return_value = serializer

        request = self.factory.get(f"/api/v1/copilot/stores/{store_id}/value-ledger/daily/?days=7")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 200)
        self.assertIn("pipeline_health", response.data)
        self.assertEqual(response.data["pipeline_health"]["status"], "no_data")
        self.assertFalse(response.data["pipeline_health"]["slo_breached"])
        self.assertIsNone(response.data["pipeline_health"]["last_updated_at"])
        self.assertEqual(response.data["totals"].get("completion_rate"), 0.0)
        self.assertEqual(response.data["totals"].get("recovery_rate"), 0.0)
        self.assertEqual(response.data["totals"].get("value_net_gap_brl"), 0.0)
