from datetime import datetime
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views import StoreViewSet


class StoreVisionAuditTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)
        self.store = MagicMock()
        self.store.id = "11111111-1111-1111-1111-111111111111"
        self.store.org_id = "org-1"
        self.store.name = "Loja Teste"

    @patch("apps.stores.views._get_org_timezone")
    @patch("apps.stores.views.StoreViewSet._require_subscription_for_store")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet.get_object")
    @patch("apps.stores.views.connection")
    def test_vision_audit_returns_filtered_atomic_events(
        self,
        connection_mock,
        get_object_mock,
        _require_role,
        _require_sub,
        _tz,
    ):
        get_object_mock.return_value = self.store
        _tz.return_value = datetime.now().astimezone().tzinfo

        cursor = MagicMock()
        cursor.fetchall.side_effect = [
            [
                ("vision.crossing.v1", 3),
                ("vision.queue_state.v1", 2),
            ],
            [
                (
                    "rcpt-1",
                    "vision.crossing.v1",
                    "cam-1",
                    "entrada",
                    "zone-front",
                    "line-main",
                    "4",
                    "entry_exit",
                    "primary",
                    "entry",
                    1,
                    None,
                    None,
                    1.0,
                    "track-hash-1",
                    datetime(2026, 3, 9, 12, 0, 5),
                    {"data": {"event_type": "vision.crossing.v1"}},
                ),
            ],
        ]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_cm

        view = StoreViewSet.as_view({"get": "vision_audit"})
        request = self.factory.get(
            f"/api/v1/stores/{self.store.id}/vision/audit/",
            {"event_type": "vision.crossing.v1", "limit": "10"},
        )
        force_authenticate(request, user=self.user)
        response = view(request, pk=self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["store_id"], str(self.store.id))
        self.assertEqual(response.data["filters"]["event_type"], "vision.crossing.v1")
        self.assertEqual(response.data["filters"]["limit"], 10)
        self.assertEqual(response.data["summary"]["vision.crossing.v1"], 3)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["event_type"], "vision.crossing.v1")
        self.assertEqual(response.data["items"][0]["raw_payload"]["data"]["event_type"], "vision.crossing.v1")
        self.assertEqual(response.data["filters"]["event_source"], "vision")
        self.assertEqual(response.data["retail_summary"], {})
        self.assertEqual(response.data["retail_items"], [])
        self.assertEqual(response.data["operational_summary"]["vision_events_total"], 5)
        self.assertEqual(response.data["operational_summary"]["retail_events_total"], 0)
        self.assertEqual(response.data["operational_summary"]["events_total"], 5)
        self.assertEqual(response.data["operational_summary"]["latest_vision_event_at"], "2026-03-09T12:00:05")

    @patch("apps.stores.views._get_org_timezone")
    @patch("apps.stores.views.StoreViewSet._require_subscription_for_store")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet.get_object")
    @patch("apps.stores.views.connection")
    def test_vision_audit_supports_retail_event_source(
        self,
        connection_mock,
        get_object_mock,
        _require_role,
        _require_sub,
        _tz,
    ):
        get_object_mock.return_value = self.store
        _tz.return_value = datetime.now().astimezone().tzinfo

        cursor = MagicMock()
        cursor.fetchall.side_effect = [
            [
                ("retail_queue_length", 4),
                ("retail_staff_detected", 2),
            ],
            [
                (
                    "rcpt-retail-1",
                    "retail_queue_length",
                    datetime(2026, 3, 9, 12, 4, 0),
                    {"data": {"event_type": "queue_length", "value": 6, "store_id": str(self.store.id)}},
                    {"agent_id": "edge-1"},
                    "edge",
                ),
            ],
        ]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_cm

        view = StoreViewSet.as_view({"get": "vision_audit"})
        request = self.factory.get(
            f"/api/v1/stores/{self.store.id}/vision/audit/",
            {"event_source": "retail", "event_type": "queue_length", "limit": "10"},
        )
        force_authenticate(request, user=self.user)
        response = view(request, pk=self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["filters"]["event_source"], "retail")
        self.assertEqual(response.data["summary"], {})
        self.assertEqual(response.data["items"], [])
        self.assertEqual(response.data["retail_summary"]["retail_queue_length"], 4)
        self.assertEqual(len(response.data["retail_items"]), 1)
        self.assertEqual(response.data["retail_items"][0]["event_name"], "retail_queue_length")
        self.assertEqual(response.data["operational_summary"]["vision_events_total"], 0)
        self.assertEqual(response.data["operational_summary"]["retail_events_total"], 6)
        self.assertEqual(response.data["operational_summary"]["events_total"], 6)
        self.assertEqual(response.data["operational_summary"]["latest_retail_event_at"], "2026-03-09T12:04:00")

    @patch("apps.stores.views._get_org_timezone")
    @patch("apps.stores.views.StoreViewSet._require_subscription_for_store")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet.get_object")
    @patch("apps.stores.views.connection")
    def test_vision_ingestion_summary_returns_pipeline_health(
        self,
        connection_mock,
        get_object_mock,
        _require_role,
        _require_sub,
        _tz,
    ):
        get_object_mock.return_value = self.store
        _tz.return_value = datetime.now().astimezone().tzinfo

        cursor = MagicMock()
        cursor.fetchall.side_effect = [
            [("vision.queue_state.v1", 5)],
            [("retail_queue_length", 3)],
        ]
        cursor.fetchone.side_effect = [
            (datetime(2026, 3, 9, 12, 10, 0),),
            (datetime(2026, 3, 9, 12, 11, 0),),
        ]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_cm

        view = StoreViewSet.as_view({"get": "vision_ingestion_summary"})
        request = self.factory.get(
            f"/api/v1/stores/{self.store.id}/vision/ingestion-summary/",
            {"event_source": "all", "event_type": "queue_length", "window_hours": "24"},
        )
        force_authenticate(request, user=self.user)
        response = view(request, pk=self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["filters"]["event_source"], "all")
        self.assertEqual(response.data["filters"]["event_type"], "queue_length")
        self.assertEqual(response.data["vision_summary"]["total"], 5)
        self.assertEqual(response.data["retail_summary"]["total"], 3)
        self.assertEqual(response.data["operational_summary"]["events_total"], 8)
        self.assertIn(
            response.data["operational_summary"]["pipeline_status"],
            {"healthy", "stale"},
        )
