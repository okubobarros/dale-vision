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
