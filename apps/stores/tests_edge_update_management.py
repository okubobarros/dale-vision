from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views_edge_update_management import (
    StoreEdgeUpdateEventsListView,
    StoreEdgeUpdatePolicyManagementView,
    StoreEdgeUpdateRunbookView,
    StoreEdgeUpdateRunbookOpenedView,
)


class StoreEdgeUpdatePolicyManagementViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = StoreEdgeUpdatePolicyManagementView.as_view()

    @patch("apps.stores.views_edge_update_management.Store.objects.filter")
    def test_get_returns_404_when_store_not_found(self, mock_store_filter):
        qs = MagicMock()
        qs.first.return_value = None
        mock_store_filter.return_value = qs
        store_id = uuid4()
        request = self.factory.get(f"/api/v1/stores/{store_id}/edge-update-policy/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)
        self.assertEqual(response.status_code, 404)

    @patch("apps.stores.views_edge_update_management.EdgeUpdatePolicy.objects.filter")
    @patch("apps.stores.views_edge_update_management.require_store_role")
    @patch("apps.stores.views_edge_update_management.Store.objects.filter")
    def test_get_returns_default_policy(self, mock_store_filter, _mock_require, mock_policy_filter):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja A")
        mock_store_filter.return_value = store_qs
        policy_qs = MagicMock()
        policy_qs.first.return_value = None
        mock_policy_filter.return_value = policy_qs

        request = self.factory.get(f"/api/v1/stores/{store_id}/edge-update-policy/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["policy"]["active"], False)

    @patch("apps.stores.views_edge_update_management.EdgeUpdatePolicy.objects.update_or_create")
    @patch("apps.stores.views_edge_update_management.EdgeUpdatePolicy.objects.filter")
    @patch("apps.stores.views_edge_update_management.require_store_role")
    @patch("apps.stores.views_edge_update_management.Store.objects.filter")
    def test_put_upserts_policy(
        self,
        mock_store_filter,
        _mock_require,
        mock_policy_filter,
        mock_update_or_create,
    ):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja B")
        mock_store_filter.return_value = store_qs

        policy_filter_qs = MagicMock()
        policy_filter_qs.first.return_value = None
        mock_policy_filter.return_value = policy_filter_qs

        returned_policy = SimpleNamespace(
            active=True,
            channel="stable",
            target_version="1.5.0",
            current_min_supported="1.4.0",
            rollout_start_local="01:00",
            rollout_end_local="04:00",
            rollout_timezone="America/Sao_Paulo",
            package_url="https://cdn/edge.zip",
            package_sha256="abc",
            package_size_bytes=123,
            health_max_boot_seconds=90,
            health_require_heartbeat_seconds=120,
            health_require_camera_health_count=3,
            rollback_enabled=True,
            rollback_max_failed_attempts=1,
            updated_at=None,
        )
        mock_update_or_create.return_value = (returned_policy, True)

        request = self.factory.put(
            f"/api/v1/stores/{store_id}/edge-update-policy/",
            {
                "target_version": "1.5.0",
                "package": {"url": "https://cdn/edge.zip", "sha256": "abc"},
            },
            format="json",
        )
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["policy"]["target_version"], "1.5.0")
        mock_update_or_create.assert_called_once()


class StoreEdgeUpdateEventsListViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = StoreEdgeUpdateEventsListView.as_view()

    @patch("apps.stores.views_edge_update_management.EdgeUpdateEvent.objects.filter")
    @patch("apps.stores.views_edge_update_management.require_store_role")
    @patch("apps.stores.views_edge_update_management.Store.objects.filter")
    def test_get_lists_events(self, mock_store_filter, _mock_require, mock_event_filter):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja C")
        mock_store_filter.return_value = store_qs

        row = SimpleNamespace(
            id=uuid4(),
            agent_id="edge-1",
            from_version="1.4.0",
            to_version="1.5.0",
            channel="stable",
            status="failed",
            phase="health_check",
            event="edge_update_failed",
            attempt=1,
            elapsed_ms=1200,
            reason_code="NETWORK_ERROR",
            reason_detail="timeout while reaching package host",
            timestamp=None,
        )
        event_qs = MagicMock()
        event_qs.order_by.return_value = [row]
        mock_event_filter.return_value = event_qs

        request = self.factory.get(f"/api/v1/stores/{store_id}/edge-update-events/?limit=10")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["status"], "failed")
        self.assertIn("conectividade", response.data["items"][0]["playbook_hint"].lower())


class StoreEdgeUpdateRunbookViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = StoreEdgeUpdateRunbookView.as_view()

    @patch("apps.stores.views_edge_update_management.require_store_role")
    @patch("apps.stores.views_edge_update_management.Store.objects.filter")
    def test_returns_known_reason_runbook(self, mock_store_filter, _mock_require):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja D")
        mock_store_filter.return_value = store_qs

        request = self.factory.get(
            f"/api/v1/stores/{store_id}/edge-update-runbook/?reason_code=NETWORK_ERROR"
        )
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["runbook"]["known_reason"], True)
        self.assertEqual(response.data["runbook"]["reason_code"], "NETWORK_ERROR")

    @patch("apps.stores.views_edge_update_management.require_store_role")
    @patch("apps.stores.views_edge_update_management.EdgeUpdateEvent.objects.filter")
    @patch("apps.stores.views_edge_update_management.Store.objects.filter")
    def test_returns_fallback_runbook_when_unknown(
        self,
        mock_store_filter,
        mock_event_filter,
        _mock_require,
    ):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja E")
        mock_store_filter.return_value = store_qs

        event_qs = MagicMock()
        event_qs.order_by.return_value = event_qs
        event_qs.first.return_value = None
        mock_event_filter.return_value = event_qs

        request = self.factory.get(f"/api/v1/stores/{store_id}/edge-update-runbook/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["runbook"]["known_reason"], False)


class StoreEdgeUpdateRunbookOpenedViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = StoreEdgeUpdateRunbookOpenedView.as_view()

    @patch("apps.stores.views_edge_update_management.EdgeUpdateEvent.objects.create")
    @patch("apps.stores.views_edge_update_management.require_store_role")
    @patch("apps.stores.views_edge_update_management.Store.objects.filter")
    def test_post_creates_runbook_opened_event(
        self,
        mock_store_filter,
        _mock_require,
        mock_create,
    ):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja F")
        mock_store_filter.return_value = store_qs
        mock_create.return_value = SimpleNamespace(id=uuid4(), event="runbook_opened")

        request = self.factory.post(
            f"/api/v1/stores/{store_id}/edge-update-runbook/opened/",
            {"reason_code": "NETWORK_ERROR", "source_page": "edge_help"},
            format="json",
        )
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id="user-1"))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["event"], "runbook_opened")
        mock_create.assert_called_once()
