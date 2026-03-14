from datetime import datetime
from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views import StoreViewSet


class StoreProductivityCoverageTests(TestCase):
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
    @patch("apps.stores.views.connection")
    @patch("apps.stores.views.StoreViewSet.get_object")
    def test_productivity_coverage_returns_payload(
        self,
        get_object_mock,
        connection_mock,
        _require_role,
        _require_sub,
        _tz,
    ):
        get_object_mock.return_value = self.store
        _tz.return_value = datetime.now().astimezone().tzinfo

        cursor = MagicMock()
        cursor.fetchall.return_value = []
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_cm

        view = StoreViewSet.as_view({"get": "productivity_coverage"})
        request = self.factory.get(
            f"/api/v1/stores/{self.store.id}/productivity/coverage/",
            {"period": "7d"},
        )
        force_authenticate(request, user=self.user)
        response = view(request, pk=self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("store_id"), str(self.store.id))
        self.assertEqual(response.data.get("method", {}).get("version"), "coverage_operational_window_v1_2026-03-14")
        self.assertEqual(response.data.get("summary", {}).get("gaps_total"), 0)
