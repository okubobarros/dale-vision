from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.copilot.views import (
    CopilotNetworkActionOutcomeView,
    CopilotNetworkValueLedgerDailyView,
)


class CopilotNetworkActionOutcomeViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotNetworkActionOutcomeView.as_view()

    @patch("apps.copilot.views.get_user_org_ids", return_value=[])
    def test_get_returns_empty_payload_for_user_without_orgs(self, _mock_org_ids):
        request = self.factory.get("/api/v1/copilot/network/actions/outcomes/")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=1),
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("store_id"), "all")
        self.assertEqual(response.data.get("items"), [])
        self.assertEqual(response.data.get("summary", {}).get("actions_dispatched"), 0)

    @patch("apps.copilot.views.CopilotActionOutcomeSerializer")
    @patch("apps.copilot.views.ActionOutcome.objects.all")
    @patch("apps.copilot.views.get_user_org_ids")
    def test_get_returns_aggregated_network_outcomes(
        self,
        mock_org_ids,
        mock_all,
        mock_serializer,
    ):
        mock_org_ids.return_value = [uuid4()]
        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.__getitem__.return_value = [SimpleNamespace()]
        qs.aggregate.return_value = {
            "dispatched": 7,
            "completed": 4,
            "expected": 1400.0,
            "realized": 980.0,
            "confidence_avg": 82.0,
        }
        mock_all.return_value = qs
        mock_serializer.return_value.data = [{"id": "outcome-1"}]

        request = self.factory.get("/api/v1/copilot/network/actions/outcomes/?limit=10")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=1),
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("store_id"), "all")
        self.assertEqual(response.data.get("summary", {}).get("actions_dispatched"), 7)
        self.assertEqual(response.data.get("summary", {}).get("actions_completed"), 4)
        self.assertEqual(response.data.get("summary", {}).get("impact_expected_brl"), 1400.0)
        self.assertEqual(response.data.get("summary", {}).get("impact_realized_brl"), 980.0)
        self.assertEqual(response.data.get("items"), [{"id": "outcome-1"}])


class CopilotNetworkValueLedgerDailyViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotNetworkValueLedgerDailyView.as_view()

    @patch("apps.copilot.views.get_user_org_ids", return_value=[])
    def test_get_returns_empty_payload_for_user_without_orgs(self, _mock_org_ids):
        request = self.factory.get("/api/v1/copilot/network/value-ledger/daily/?days=7")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=1),
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("store_id"), "all")
        self.assertEqual(response.data.get("items"), [])
        self.assertEqual(response.data.get("totals", {}).get("value_recovered_brl"), 0.0)

    @patch("apps.copilot.views.ValueLedgerDailySerializer")
    @patch("apps.copilot.views.ValueLedgerDaily.objects.filter")
    @patch("apps.copilot.views.Store.objects.filter")
    @patch("apps.copilot.views.get_user_org_ids")
    def test_get_returns_aggregated_network_ledger(
        self,
        mock_org_ids,
        mock_store_filter,
        mock_filter,
        mock_serializer,
    ):
        mock_org_ids.return_value = [uuid4()]
        store_qs = MagicMock()
        store_qs.values.return_value = store_qs
        store_qs.distinct.return_value = store_qs
        store_qs.count.return_value = 3
        mock_store_filter.return_value = store_qs
        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.__getitem__.return_value = [SimpleNamespace()]
        qs.aggregate.return_value = {
            "value_recovered": 3250.0,
            "value_at_risk": 4200.0,
            "actions_dispatched": 12,
            "actions_completed": 9,
            "confidence_avg": 79.0,
        }
        mock_filter.return_value = qs
        mock_serializer.return_value.data = [{"ledger_date": "2026-03-15"}]

        request = self.factory.get("/api/v1/copilot/network/value-ledger/daily/?days=30")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=1),
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("store_id"), "all")
        self.assertEqual(response.data.get("totals", {}).get("value_recovered_brl"), 3250.0)
        self.assertEqual(response.data.get("totals", {}).get("value_at_risk_brl"), 4200.0)
        self.assertEqual(response.data.get("totals", {}).get("actions_dispatched"), 12)
        self.assertEqual(response.data.get("totals", {}).get("actions_completed"), 9)
        self.assertEqual(response.data.get("items", [{}])[0].get("ledger_date"), "2026-03-15")
        self.assertIn("value_status", response.data.get("items", [{}])[0])
