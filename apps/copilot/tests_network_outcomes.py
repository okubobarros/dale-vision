from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.copilot.views import (
    CopilotNetworkActionOutcomeView,
    CopilotNetworkEfficiencyRankingView,
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
        self.assertEqual(response.data.get("summary", {}).get("completion_rate"), 57.1)
        self.assertEqual(response.data.get("summary", {}).get("recovery_rate"), 70.0)
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
        self.assertEqual(response.data.get("totals", {}).get("value_net_gap_brl"), 950.0)
        self.assertEqual(response.data.get("totals", {}).get("completion_rate"), 75.0)
        self.assertEqual(response.data.get("totals", {}).get("recovery_rate"), 77.4)
        self.assertEqual(response.data.get("items", [{}])[0].get("ledger_date"), "2026-03-15")
        self.assertIn("value_status", response.data.get("items", [{}])[0])


class CopilotNetworkEfficiencyRankingViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotNetworkEfficiencyRankingView.as_view()

    @patch("apps.copilot.views.get_user_org_ids", return_value=[])
    def test_get_returns_empty_payload_for_user_without_orgs(self, _mock_org_ids):
        request = self.factory.get("/api/v1/copilot/network/efficiency-ranking/?days=30")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=1),
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("items"), [])
        self.assertEqual(response.data.get("summary", {}).get("stores_total"), 0)

    @patch("apps.copilot.views.ValueLedgerDaily.objects.filter")
    @patch("apps.copilot.views.ActionOutcome.objects.filter")
    @patch("apps.copilot.views.DetectionEvent.objects.filter")
    @patch("apps.copilot.views.Store.objects.all")
    @patch("apps.copilot.views.get_user_org_ids")
    def test_get_returns_sorted_and_anonymized_ranking(
        self,
        mock_org_ids,
        mock_store_all,
        mock_detection_filter,
        mock_outcome_filter,
        mock_ledger_filter,
    ):
        store_a = uuid4()
        store_b = uuid4()
        mock_org_ids.return_value = [uuid4()]

        stores_qs = MagicMock()
        stores_qs.filter.return_value = stores_qs
        stores_qs.values.return_value = [
            {"id": store_a, "name": "Loja A"},
            {"id": store_b, "name": "Loja B"},
        ]
        mock_store_all.return_value = stores_qs

        detection_qs = MagicMock()
        detection_values_qs = MagicMock()
        detection_values_qs.annotate.return_value = [
            {"store_id": store_a, "critical_open": 0, "warning_open": 1, "total_events": 8},
            {"store_id": store_b, "critical_open": 2, "warning_open": 1, "total_events": 10},
        ]
        detection_qs.values.return_value = detection_values_qs
        mock_detection_filter.return_value = detection_qs

        outcome_qs = MagicMock()
        outcome_values_qs = MagicMock()
        outcome_values_qs.annotate.return_value = [
            {
                "store_id": store_a,
                "actions_dispatched": 10,
                "actions_completed": 8,
                "impact_expected_brl": 1000.0,
                "impact_realized_brl": 800.0,
                "confidence_avg": 90.0,
            },
            {
                "store_id": store_b,
                "actions_dispatched": 8,
                "actions_completed": 2,
                "impact_expected_brl": 1000.0,
                "impact_realized_brl": 200.0,
                "confidence_avg": 65.0,
            },
        ]
        outcome_qs.values.return_value = outcome_values_qs
        mock_outcome_filter.return_value = outcome_qs

        ledger_qs = MagicMock()
        ledger_values_qs = MagicMock()
        ledger_values_qs.annotate.return_value = [
            {
                "store_id": store_a,
                "value_recovered_brl": 900.0,
                "value_at_risk_brl": 1100.0,
                "confidence_score_avg": 92.0,
            },
            {
                "store_id": store_b,
                "value_recovered_brl": 200.0,
                "value_at_risk_brl": 1500.0,
                "confidence_score_avg": 60.0,
            },
        ]
        ledger_qs.values.return_value = ledger_values_qs
        mock_ledger_filter.return_value = ledger_qs

        request = self.factory.get("/api/v1/copilot/network/efficiency-ranking/?days=30&anonymized=1")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=1),
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("anonymized"))
        self.assertEqual(response.data.get("summary", {}).get("stores_total"), 2)
        items = response.data.get("items", [])
        self.assertEqual(len(items), 2)
        self.assertGreaterEqual(items[0].get("efficiency_score"), items[1].get("efficiency_score"))
        self.assertEqual(items[0].get("rank"), 1)
        self.assertTrue(str(items[0].get("display_name", "")).startswith("Loja #"))
        self.assertIn("contribution_factors", items[0])
