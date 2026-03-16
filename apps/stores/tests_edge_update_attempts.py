from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views_edge_update_attempts import StoreEdgeUpdateAttemptsView


class StoreEdgeUpdateAttemptsViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = StoreEdgeUpdateAttemptsView.as_view()

    @patch("apps.stores.views_edge_update_attempts.Store.objects.filter")
    def test_get_returns_404_when_store_not_found(self, mock_store_filter):
        qs = MagicMock()
        qs.first.return_value = None
        mock_store_filter.return_value = qs
        store_id = uuid4()

        request = self.factory.get(f"/api/v1/stores/{store_id}/edge-update-attempts/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 404)

    @patch("apps.stores.views_edge_update_attempts.EdgeUpdateEvent.objects.filter")
    @patch("apps.stores.views_edge_update_attempts.require_store_role")
    @patch("apps.stores.views_edge_update_attempts.Store.objects.filter")
    def test_get_groups_attempts_and_calculates_final_status(
        self,
        mock_store_filter,
        _mock_require_role,
        mock_event_filter,
    ):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja A")
        mock_store_filter.return_value = store_qs

        base_ts: datetime = timezone.now()
        rows = [
            {
                "id": uuid4(),
                "agent_id": "edge-01",
                "from_version": "1.4.0",
                "to_version": "1.5.0",
                "channel": "stable",
                "status": "started",
                "phase": "download",
                "event": "edge_update_started",
                "attempt": 1,
                "elapsed_ms": 1000,
                "reason_code": None,
                "reason_detail": None,
                "timestamp": base_ts,
            },
            {
                "id": uuid4(),
                "agent_id": "edge-01",
                "from_version": "1.4.0",
                "to_version": "1.5.0",
                "channel": "stable",
                "status": "healthy",
                "phase": "health_check",
                "event": "edge_update_healthy",
                "attempt": 1,
                "elapsed_ms": 9000,
                "reason_code": None,
                "reason_detail": None,
                "timestamp": base_ts + timedelta(seconds=9),
            },
            {
                "id": uuid4(),
                "agent_id": "edge-01",
                "from_version": "1.5.0",
                "to_version": "1.6.0",
                "channel": "canary",
                "status": "failed",
                "phase": "health_check",
                "event": "edge_update_failed",
                "attempt": 2,
                "elapsed_ms": 5000,
                "reason_code": "NETWORK_ERROR",
                "reason_detail": "timeout",
                "timestamp": base_ts + timedelta(minutes=1),
            },
        ]

        event_qs = MagicMock()
        ordered_qs = MagicMock()
        limited_qs = MagicMock()
        limited_qs.values.return_value = rows
        ordered_qs.__getitem__.return_value = limited_qs
        event_qs.order_by.return_value = ordered_qs
        mock_event_filter.return_value = event_qs

        request = self.factory.get(f"/api/v1/stores/{store_id}/edge-update-attempts/?limit=20")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["filters"]["limit"], 20)
        self.assertEqual(len(response.data["items"]), 2)
        statuses = {item["attempt"]: item["final_status"] for item in response.data["items"]}
        self.assertEqual(statuses[1], "healthy")
        self.assertEqual(statuses[2], "failed")

    @patch("apps.stores.views_edge_update_attempts.EdgeUpdateEvent.objects.filter")
    @patch("apps.stores.views_edge_update_attempts.require_store_role")
    @patch("apps.stores.views_edge_update_attempts.Store.objects.filter")
    def test_get_applies_limit_to_returned_attempts(
        self,
        mock_store_filter,
        _mock_require_role,
        mock_event_filter,
    ):
        store_id = uuid4()
        store_qs = MagicMock()
        store_qs.first.return_value = SimpleNamespace(id=store_id, name="Loja B")
        mock_store_filter.return_value = store_qs

        base_ts = timezone.now()
        rows = []
        for idx in range(15):
            rows.append(
                {
                    "id": uuid4(),
                    "agent_id": "edge-02",
                    "from_version": "1.0.0",
                    "to_version": f"1.0.{idx}",
                    "channel": "stable",
                    "status": "failed",
                    "phase": "health_check",
                    "event": "edge_update_failed",
                    "attempt": idx + 1,
                    "elapsed_ms": 3000,
                    "reason_code": "NETWORK_ERROR",
                    "reason_detail": "timeout",
                    "timestamp": base_ts + timedelta(seconds=idx),
                }
            )

        event_qs = MagicMock()
        ordered_qs = MagicMock()
        limited_qs = MagicMock()
        limited_qs.values.return_value = rows
        ordered_qs.__getitem__.return_value = limited_qs
        event_qs.order_by.return_value = ordered_qs
        mock_event_filter.return_value = event_qs

        request = self.factory.get(f"/api/v1/stores/{store_id}/edge-update-attempts/?limit=10")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["filters"]["limit"], 10)
        self.assertEqual(len(response.data["items"]), 10)
