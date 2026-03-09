from datetime import datetime
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
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
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


class StoreMetricsSummaryTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)
        self.store = MagicMock()
        self.store.id = "11111111-1111-1111-1111-111111111111"
        self.store.org_id = "org-1"
        self.store.name = "Loja Teste"

    def _call_view(self):
        view = StoreViewSet.as_view({"get": "metrics_summary"})
        request = self.factory.get(f"/api/v1/stores/{self.store.id}/metrics/summary/")
        force_authenticate(request, user=self.user)
        return view(request, pk=self.store.id)

    @patch("apps.stores.views._get_org_timezone", return_value=timezone.get_current_timezone())
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet.get_object")
    @patch("apps.stores.views.connection")
    def test_metrics_summary_returns_metric_governance_and_filters_entry_camera_traffic(
        self,
        connection_mock,
        get_object_mock,
        _require_role,
        _tz,
    ):
        get_object_mock.return_value = self.store
        cursor = _Cursor(
            fetchall_returns=[
                [(datetime(2026, 3, 1, 0, 0, 0), 25, 0)],
                [(datetime(2026, 3, 1, 0, 0, 0), 40, 2, 12.5)],
                [("zone-1", "Fila", 10, 0)],
            ],
            fetchone_returns=[
                (25, 0),
                (40, 2, 12.5),
            ],
        )
        connection_mock.cursor.return_value = cursor

        response = self._call_view()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["meta"]["metric_governance"]["totals"]["avg_conversion_rate"]["metric_status"],
            "proxy",
        )
        self.assertEqual(
            response.data["meta"]["metric_governance"]["totals"]["total_visitors"]["metric_status"],
            "official",
        )
        executed_sql = "\n".join(sql for sql, _params in cursor.executed)
        self.assertIn("camera_role = 'entrada' OR camera_role IS NULL", executed_sql)
        self.assertIn("ownership = 'primary' OR ownership IS NULL", executed_sql)
