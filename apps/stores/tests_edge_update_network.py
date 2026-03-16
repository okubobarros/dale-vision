from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views_edge_update_network import (
    NetworkEdgeUpdateRolloutSummaryView,
    NetworkEdgeUpdateValidationSummaryView,
)


class NetworkEdgeUpdateRolloutSummaryViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = NetworkEdgeUpdateRolloutSummaryView.as_view()

    @patch("apps.stores.views_edge_update_network.get_user_org_ids")
    def test_returns_no_data_when_user_has_no_orgs(self, mock_org_ids):
        mock_org_ids.return_value = []

        request = self.factory.get("/api/v1/stores/network/edge-update-rollout-summary/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["filters"]["channel"], "all")
        self.assertEqual(response.data["totals"]["stores"], 0)
        self.assertEqual(response.data["rollout_health"]["status"], "no_data")
        self.assertEqual(response.data["rollout_metrics"]["attempts_total"], 0)
        self.assertEqual(response.data["rollout_metrics"]["success_rate_pct"], 0.0)

    @patch("apps.stores.views_edge_update_network.EdgeUpdateEvent.objects.filter")
    @patch("apps.stores.views_edge_update_network.EdgeUpdatePolicy.objects.filter")
    @patch("apps.stores.views_edge_update_network.Store.objects.filter")
    @patch("apps.stores.views_edge_update_network.get_user_org_ids")
    def test_returns_aggregated_summary(
        self,
        mock_org_ids,
        mock_store_filter,
        mock_policy_filter,
        mock_event_filter,
    ):
        store_a = uuid4()
        store_b = uuid4()
        mock_org_ids.return_value = [uuid4()]

        store_qs = MagicMock()
        store_qs.values.return_value = [
            {"id": store_a, "name": "Loja A"},
            {"id": store_b, "name": "Loja B"},
        ]
        mock_store_filter.return_value = store_qs

        policy_qs = MagicMock()
        policy_qs.order_by.return_value = [
            SimpleNamespace(store_id=store_a, channel="canary", target_version="1.5.0"),
            SimpleNamespace(store_id=store_b, channel="stable", target_version="1.5.0"),
        ]
        mock_policy_filter.return_value = policy_qs

        event_qs = MagicMock()
        event_qs.order_by.return_value = [
            SimpleNamespace(
                store_id=store_a,
                status="failed",
                event="edge_update_failed",
                from_version="1.4.1",
                to_version="1.5.0",
                reason_code="NETWORK_ERROR",
                timestamp=None,
            ),
            SimpleNamespace(
                store_id=store_b,
                status="healthy",
                event="edge_update_healthy",
                from_version="1.4.9",
                to_version="1.5.0",
                reason_code=None,
                timestamp=None,
            ),
        ]
        mock_event_filter.return_value = event_qs

        request = self.factory.get("/api/v1/stores/network/edge-update-rollout-summary/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["filters"]["channel"], "all")
        self.assertEqual(response.data["totals"]["stores"], 2)
        self.assertEqual(response.data["totals"]["with_policy"], 2)
        self.assertEqual(response.data["totals"]["channel"]["canary"], 1)
        self.assertEqual(response.data["totals"]["version_gap"]["up_to_date"], 1)
        self.assertEqual(response.data["totals"]["version_gap"]["outdated"], 1)
        self.assertEqual(response.data["totals"]["health"]["degraded"], 1)
        self.assertEqual(response.data["rollout_health"]["status"], "degraded")
        self.assertEqual(response.data["rollout_metrics"]["attempts_total"], 2)
        self.assertEqual(response.data["rollout_metrics"]["attempts_successful"], 1)
        self.assertEqual(response.data["rollout_metrics"]["attempts_failed"], 1)
        self.assertEqual(response.data["rollout_metrics"]["success_rate_pct"], 50.0)
        self.assertEqual(response.data["rollout_metrics"]["failure_rate_pct"], 50.0)
        self.assertEqual(len(response.data["critical_stores"]), 1)
        self.assertEqual(response.data["critical_stores"][0]["store_name"], "Loja A")
        self.assertEqual(response.data["critical_stores"][0]["current_version"], "1.4.1")
        self.assertEqual(response.data["critical_stores"][0]["target_version"], "1.5.0")
        self.assertEqual(response.data["critical_stores"][0]["version_gap"], "outdated")

    @patch("apps.stores.views_edge_update_network.EdgeUpdateEvent.objects.filter")
    @patch("apps.stores.views_edge_update_network.EdgeUpdatePolicy.objects.filter")
    @patch("apps.stores.views_edge_update_network.Store.objects.filter")
    @patch("apps.stores.views_edge_update_network.get_user_org_ids")
    def test_applies_channel_filter(
        self,
        mock_org_ids,
        mock_store_filter,
        mock_policy_filter,
        mock_event_filter,
    ):
        store_a = uuid4()
        store_b = uuid4()
        mock_org_ids.return_value = [uuid4()]

        store_qs = MagicMock()
        store_qs.values.return_value = [
            {"id": store_a, "name": "Loja A"},
            {"id": store_b, "name": "Loja B"},
        ]
        mock_store_filter.return_value = store_qs

        policy_qs = MagicMock()
        policy_qs.order_by.return_value = [
            SimpleNamespace(store_id=store_a, channel="canary", target_version="1.5.0"),
        ]
        mock_policy_filter.return_value = policy_qs

        event_qs = MagicMock()
        event_qs.order_by.return_value = [
            SimpleNamespace(
                store_id=store_a,
                status="healthy",
                event="edge_update_healthy",
                from_version="1.4.9",
                to_version="1.5.0",
                reason_code=None,
                timestamp=None,
            ),
            SimpleNamespace(
                store_id=store_b,
                status="failed",
                event="edge_update_failed",
                from_version="1.4.1",
                to_version="1.5.0",
                reason_code="NETWORK_ERROR",
                timestamp=None,
            ),
        ]
        mock_event_filter.return_value = event_qs

        request = self.factory.get("/api/v1/stores/network/edge-update-rollout-summary/?channel=canary")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["filters"]["channel"], "canary")
        self.assertEqual(response.data["totals"]["stores"], 1)
        self.assertEqual(response.data["totals"]["with_policy"], 1)
        self.assertEqual(response.data["totals"]["channel"]["canary"], 1)
        self.assertEqual(response.data["totals"]["channel"]["stable"], 0)
        self.assertEqual(response.data["rollout_metrics"]["attempts_total"], 1)
        self.assertEqual(response.data["rollout_metrics"]["attempts_successful"], 1)
        self.assertEqual(response.data["rollout_metrics"]["success_rate_pct"], 100.0)
        mock_policy_filter.assert_called_with(store_id__in=[str(store_a), str(store_b)], active=True, channel="canary")


class NetworkEdgeUpdateValidationSummaryViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = NetworkEdgeUpdateValidationSummaryView.as_view()

    @patch("apps.stores.views_edge_update_network.get_user_org_ids")
    def test_returns_no_go_when_user_has_no_org(self, mock_org_ids):
        mock_org_ids.return_value = []
        request = self.factory.get("/api/v1/stores/network/edge-update-validation-summary/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["decision"], "NO-GO")
        self.assertFalse(response.data["checklist"]["canary_ready"])
        self.assertEqual(response.data["summary"]["attempts_total"], 0)

    @patch("apps.stores.views_edge_update_network.EdgeUpdateEvent.objects.filter")
    @patch("apps.stores.views_edge_update_network.EdgeUpdatePolicy.objects.filter")
    @patch("apps.stores.views_edge_update_network.Store.objects.filter")
    @patch("apps.stores.views_edge_update_network.get_user_org_ids")
    def test_returns_go_when_canary_healthy_and_failure_evidence_exists(
        self,
        mock_org_ids,
        mock_store_filter,
        mock_policy_filter,
        mock_event_filter,
    ):
        store_a = uuid4()
        store_b = uuid4()
        mock_org_ids.return_value = [uuid4()]

        store_qs = MagicMock()
        store_qs.values_list.return_value = [store_a, store_b]
        mock_store_filter.return_value = store_qs

        policy_qs = MagicMock()
        policy_qs.values_list.return_value = [store_a]
        mock_policy_filter.return_value = policy_qs

        event_qs = MagicMock()
        event_qs.order_by.return_value = [
            SimpleNamespace(
                store_id=store_a,
                status="healthy",
                event="edge_update_healthy",
                to_version="1.5.0",
                agent_id="edge-a",
                attempt=1,
                timestamp=None,
            ),
            SimpleNamespace(
                store_id=store_b,
                status="failed",
                event="edge_update_failed",
                to_version="1.5.0",
                agent_id="edge-b",
                attempt=1,
                timestamp=None,
            ),
        ]
        mock_event_filter.return_value = event_qs

        request = self.factory.get("/api/v1/stores/network/edge-update-validation-summary/?hours=24")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["decision"], "GO")
        self.assertTrue(response.data["checklist"]["canary_ready"])
        self.assertTrue(response.data["checklist"]["rollback_ready"])
        self.assertTrue(response.data["checklist"]["telemetry_ready"])
        self.assertEqual(response.data["summary"]["attempts_total"], 2)
