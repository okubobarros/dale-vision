from datetime import datetime, timezone as dt_timezone
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views import StoreViewSet


class _Cursor:
    def __init__(self, fetchall_returns=None, fetchone_returns=None):
        self._fetchall_returns = fetchall_returns or []
        self._fetchone_returns = fetchone_returns or []
        self._fetchall_calls = 0
        self._fetchone_calls = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, *args, **kwargs):
        return None

    def fetchall(self):
        if self._fetchall_calls >= len(self._fetchall_returns):
            return []
        result = self._fetchall_returns[self._fetchall_calls]
        self._fetchall_calls += 1
        return result

    def fetchone(self):
        if self._fetchone_calls >= len(self._fetchone_returns):
            return None
        result = self._fetchone_returns[self._fetchone_calls]
        self._fetchone_calls += 1
        return result


class StoreCeoDashboardTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)
        self.store = MagicMock()
        self.store.id = "11111111-1111-1111-1111-111111111111"
        self.store.org_id = "org-1"
        self.store.name = "Loja Teste"

    def _call_view(self):
        view = StoreViewSet.as_view({"get": "ceo_dashboard"})
        request = self.factory.get(f"/api/v1/stores/{self.store.id}/ceo-dashboard/")
        force_authenticate(request, user=self.user)
        return view(request, pk=self.store.id)

    @patch("apps.stores.views._get_org_timezone", return_value=timezone.get_current_timezone())
    @patch("apps.stores.views.StoreViewSet._require_subscription_for_store")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet.get_object")
    @patch("apps.stores.views.connection")
    def test_ceo_dashboard_payload(
        self,
        connection_mock,
        get_object_mock,
        _require_role,
        _require_subscription,
        _tz,
    ):
        get_object_mock.return_value = self.store
        traffic_rows = [
            (datetime(2026, 2, 27, 10, 0, 0), 120, 180),
            (datetime(2026, 2, 27, 11, 0, 0), 80, 210),
        ]
        conversion_rows = [
            (datetime(2026, 2, 27, 10, 0, 0), 45, 3, 0.12),
            (datetime(2026, 2, 27, 11, 0, 0), 30, 2, 0.09),
        ]
        latest_row = (datetime(2026, 2, 27, 11, 0, 0, tzinfo=dt_timezone.utc), 30, 2, 0.09)

        connection_mock.cursor.side_effect = [
            _Cursor(fetchall_returns=[traffic_rows, conversion_rows]),
            _Cursor(fetchone_returns=[latest_row]),
        ]

        response = self._call_view()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("store_id"), str(self.store.id))
        self.assertEqual(response.data.get("store_name"), self.store.name)
        self.assertIn("series", response.data)
        self.assertIn("kpis", response.data)
        self.assertEqual(len(response.data["series"]["flow_by_hour"]), 2)
        self.assertEqual(response.data["kpis"]["avg_queue_seconds"], 38)
