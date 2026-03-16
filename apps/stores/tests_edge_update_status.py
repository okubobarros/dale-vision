from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views_edge_update_status import StoreEdgeUpdateStatusView


class StoreEdgeUpdateStatusViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = StoreEdgeUpdateStatusView.as_view()

    @patch("apps.stores.views_edge_update_status.Store.objects.filter")
    def test_returns_404_when_store_not_found(self, mock_store_filter):
        qs = MagicMock()
        qs.first.return_value = None
        mock_store_filter.return_value = qs

        request = self.factory.get(f"/api/v1/stores/{uuid4()}/edge-update-status/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=uuid4())
        self.assertEqual(response.status_code, 404)

    @patch("apps.stores.views_edge_update_status.EdgeUpdateEvent.objects.filter")
    @patch("apps.stores.views_edge_update_status.EdgeUpdatePolicy.objects.filter")
    @patch("apps.stores.views_edge_update_status.require_store_role")
    @patch("apps.stores.views_edge_update_status.Store.objects.filter")
    def test_returns_status_with_default_policy_when_missing(
        self,
        mock_store_filter,
        _mock_require_role,
        mock_policy_filter,
        mock_event_filter,
    ):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja Centro")
        mock_store_filter.return_value = store_qs

        policy_qs = MagicMock()
        policy_qs.order_by.return_value = policy_qs
        policy_qs.first.return_value = None
        mock_policy_filter.return_value = policy_qs

        event_qs = MagicMock()
        event_qs.order_by.return_value = event_qs
        event_qs.first.return_value = None
        mock_event_filter.return_value = event_qs

        request = self.factory.get(f"/api/v1/stores/{store_id}/edge-update-status/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["policy"]["active"], False)
        self.assertEqual(response.data["rollout_health"]["status"], "no_data")

    @patch("apps.stores.views_edge_update_status.EdgeUpdateEvent.objects.filter")
    @patch("apps.stores.views_edge_update_status.EdgeUpdatePolicy.objects.filter")
    @patch("apps.stores.views_edge_update_status.require_store_role")
    @patch("apps.stores.views_edge_update_status.Store.objects.filter")
    def test_returns_status_with_latest_event_and_policy(
        self,
        mock_store_filter,
        _mock_require_role,
        mock_policy_filter,
        mock_event_filter,
    ):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja Norte")
        mock_store_filter.return_value = store_qs

        policy = SimpleNamespace(
            channel="canary",
            target_version="1.4.2",
            current_min_supported="1.3.0",
            rollout_start_local="01:00",
            rollout_end_local="04:00",
            rollout_timezone="America/Sao_Paulo",
            health_max_boot_seconds=90,
            health_require_heartbeat_seconds=120,
            health_require_camera_health_count=3,
            rollback_enabled=True,
            rollback_max_failed_attempts=1,
            updated_at=None,
        )
        policy_qs = MagicMock()
        policy_qs.order_by.return_value = policy_qs
        policy_qs.first.return_value = policy
        mock_policy_filter.return_value = policy_qs

        event = SimpleNamespace(
            id=uuid4(),
            agent_id="edge-1",
            from_version="1.4.1",
            to_version="1.4.2",
            status="healthy",
            event="edge_update_healthy",
            phase="health_check",
            attempt=1,
            elapsed_ms=1200,
            reason_code=None,
            reason_detail=None,
            timestamp=None,
        )
        event_qs = MagicMock()
        event_qs.order_by.return_value = event_qs
        event_qs.first.return_value = event
        mock_event_filter.return_value = event_qs

        request = self.factory.get(f"/api/v1/stores/{store_id}/edge-update-status/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["policy"]["active"], True)
        self.assertEqual(response.data["policy"]["channel"], "canary")
        self.assertEqual(response.data["latest_update_event"]["status"], "healthy")
        self.assertEqual(response.data["rollout_health"]["status"], "healthy")
