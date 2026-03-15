from datetime import datetime
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views import StoreViewSet


class StoreNetworkIngestionSummaryTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)

    @patch("apps.stores.views.StoreViewSet._require_subscription_for_org_ids")
    @patch("apps.stores.views.get_user_org_ids", return_value=["org-1"])
    @patch("apps.stores.views.StoreViewSet.get_queryset")
    @patch("apps.stores.views.connection")
    def test_network_ingestion_summary_returns_aggregated_payload(
        self,
        connection_mock,
        get_queryset_mock,
        _get_user_org_ids,
        _require_subscription,
    ):
        store_a = MagicMock()
        store_a.id = "11111111-1111-1111-1111-111111111111"
        store_a.status = "active"
        store_b = MagicMock()
        store_b.id = "22222222-2222-2222-2222-222222222222"
        store_b.status = "trial"
        get_queryset_mock.return_value = [store_a, store_b]

        cursor = MagicMock()
        cursor.fetchall.side_effect = [
            [("vision.queue_state.v1", 10)],
            [("retail_queue_length", 7)],
        ]
        cursor.fetchone.side_effect = [
            (datetime(2026, 3, 10, 12, 10, 0),),
            (datetime(2026, 3, 10, 12, 11, 0),),
        ]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_cm

        view = StoreViewSet.as_view({"get": "network_vision_ingestion_summary"})
        request = self.factory.get(
            "/api/v1/stores/network/vision/ingestion-summary/",
            {"event_source": "all", "window_hours": "24"},
        )
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["network"]["total_stores"], 2)
        self.assertEqual(response.data["network"]["active_stores"], 2)
        self.assertEqual(response.data["vision_summary"]["total"], 10)
        self.assertEqual(response.data["retail_summary"]["total"], 7)
        self.assertEqual(response.data["operational_summary"]["events_total"], 17)
        self.assertIn(
            response.data["operational_summary"]["pipeline_status"],
            {"healthy", "stale"},
        )
