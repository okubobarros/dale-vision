from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.copilot.views import CopilotNetworkActionOutcomeView, CopilotNetworkValueLedgerDailyView


class CopilotNetworkActionOutcomeViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotNetworkActionOutcomeView.as_view()

    @patch("apps.copilot.views.CopilotActionOutcomeSerializer")
    @patch("apps.copilot.views.ActionOutcome.objects.all")
    @patch("apps.copilot.views.get_user_org_ids")
    def test_get_returns_aggregated_network_payload(self, mock_org_ids, mock_all, mock_serializer_cls):
        mock_org_ids.return_value = [uuid4()]
        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.aggregate.return_value = {
            "dispatched": 5,
            "completed": 3,
            "expected": 1450.0,
            "realized": 920.0,
            "confidence_avg": 81.0,
        }
        qs.__getitem__.return_value = [SimpleNamespace()]
        mock_all.return_value = qs
        serializer = MagicMock()
        serializer.data = [{"id": str(uuid4()), "status": "dispatched"}]
        mock_serializer_cls.return_value = serializer

        request = self.factory.get("/api/v1/copilot/network/actions/outcomes/?limit=10")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False),
        )

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["store_id"], "all")
        self.assertEqual(response.data["summary"]["actions_dispatched"], 5)
        self.assertEqual(response.data["summary"]["actions_completed"], 3)
        self.assertIn("completion_rate", response.data["summary"])
        self.assertIn("recovery_rate", response.data["summary"])
        self.assertIn("breakdown_by_store", response.data)
        if response.data["breakdown_by_store"]:
            self.assertIn("store_name", response.data["breakdown_by_store"][0])
            self.assertIn("completion_rate", response.data["breakdown_by_store"][0])
            self.assertIn("recovery_rate", response.data["breakdown_by_store"][0])
        self.assertEqual(len(response.data["items"]), 1)

    @patch("apps.copilot.views.get_user_org_ids")
    def test_get_returns_empty_payload_when_user_has_no_org_scope(self, mock_org_ids):
        mock_org_ids.return_value = []
        request = self.factory.get("/api/v1/copilot/network/actions/outcomes/")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False),
        )

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["store_id"], "all")
        self.assertEqual(response.data["summary"]["actions_dispatched"], 0)
        self.assertEqual(response.data["summary"].get("completion_rate"), 0.0)
        self.assertEqual(response.data["summary"].get("recovery_rate"), 0.0)
        self.assertEqual(response.data["breakdown_by_store"], [])
        self.assertEqual(response.data["items"], [])


class CopilotNetworkValueLedgerDailyViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotNetworkValueLedgerDailyView.as_view()

    @patch("apps.copilot.views.ValueLedgerDailySerializer")
    @patch("apps.copilot.views.ValueLedgerDaily.objects.filter")
    @patch("apps.copilot.views.Store.objects.filter")
    @patch("apps.copilot.views.get_user_org_ids")
    def test_get_returns_network_ledger_payload(self, mock_org_ids, mock_store_filter, mock_filter, mock_serializer_cls):
        mock_org_ids.return_value = [uuid4()]
        store_qs = MagicMock()
        store_qs.values.return_value.distinct.return_value.count.return_value = 4
        mock_store_filter.return_value = store_qs
        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.aggregate.return_value = {
            "value_recovered": 2100.0,
            "value_at_risk": 3250.0,
            "actions_dispatched": 14,
            "actions_completed": 9,
            "confidence_avg": 78.0,
        }
        qs.__getitem__.return_value = [SimpleNamespace()]
        mock_filter.return_value = qs
        serializer = MagicMock()
        serializer.data = [{"ledger_date": "2026-03-15", "value_recovered_brl": 400.0}]
        mock_serializer_cls.return_value = serializer

        request = self.factory.get("/api/v1/copilot/network/value-ledger/daily/?days=7")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False),
        )

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["store_id"], "all")
        self.assertEqual(response.data["days"], 7)
        self.assertIn("method_version_current", response.data)
        self.assertIn("pipeline_health", response.data)
        self.assertIn("last_updated_at", response.data["pipeline_health"])
        self.assertEqual(response.data["totals"]["actions_dispatched"], 14)
        self.assertIn("completion_rate", response.data["totals"])
        self.assertIn("recovery_rate", response.data["totals"])
        self.assertIn("value_net_gap_brl", response.data["totals"])
        self.assertIn("breakdown_by_store", response.data)
        if response.data["breakdown_by_store"]:
            self.assertIn("store_name", response.data["breakdown_by_store"][0])
            self.assertIn("completion_rate", response.data["breakdown_by_store"][0])
            self.assertIn("recovery_rate", response.data["breakdown_by_store"][0])
            self.assertIn("value_net_gap_brl", response.data["breakdown_by_store"][0])
        self.assertEqual(len(response.data["items"]), 1)

    @patch("apps.copilot.views.get_user_org_ids")
    def test_get_returns_empty_network_ledger_when_user_has_no_org_scope(self, mock_org_ids):
        mock_org_ids.return_value = []
        request = self.factory.get("/api/v1/copilot/network/value-ledger/daily/?days=7")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False),
        )

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["store_id"], "all")
        self.assertIn("pipeline_health", response.data)
        self.assertEqual(response.data["pipeline_health"]["status"], "no_data")
        self.assertIsNone(response.data["pipeline_health"]["last_updated_at"])
        self.assertEqual(response.data["totals"].get("completion_rate"), 0.0)
        self.assertEqual(response.data["totals"].get("recovery_rate"), 0.0)
        self.assertEqual(response.data["totals"].get("value_net_gap_brl"), 0.0)
        self.assertEqual(response.data["items"], [])
