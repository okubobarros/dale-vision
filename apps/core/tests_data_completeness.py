from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views import DataCompletenessView


class DataCompletenessViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = DataCompletenessView.as_view()
        self.user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=123)

    @patch("apps.core.views.get_user_org_ids", return_value=[])
    def test_returns_empty_when_no_org_scope(self, _org_ids_mock: MagicMock):
        request = self.factory.get("/api/v1/data-quality/completeness/?period=7d")
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["period"], "7d")
        self.assertEqual(response.data["tables"], [])
        self.assertEqual(response.data["overall_null_rate"], 0.0)

    @patch("apps.core.views.connection")
    @patch("apps.core.views.models.Store.objects.filter")
    @patch("apps.core.views.get_user_org_ids", return_value=["org-1"])
    def test_returns_payload_with_tables(
        self,
        _org_ids_mock: MagicMock,
        store_filter_mock: MagicMock,
        connection_mock: MagicMock,
    ):
        store_qs = MagicMock()
        store_qs.values_list.return_value = ["store-1"]
        store_filter_mock.return_value = store_qs

        cursor_ctx = MagicMock()
        cursor = MagicMock()
        cursor_ctx.__enter__.return_value = cursor
        cursor_ctx.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_ctx

        # 4 tabelas: (5,2,5,6 campos) => 22 chamadas fetchone no total.
        cursor.fetchone.side_effect = (
            [(10,)] + [(1,)] * 5 +
            [(10,)] + [(1,)] * 2 +
            [(10,)] + [(1,)] * 5 +
            [(10,)] + [(1,)] * 6
        )

        request = self.factory.get("/api/v1/data-quality/completeness/?period=30d")
        force_authenticate(request, user=self.user)
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["period"], "30d")
        self.assertEqual(len(response.data["tables"]), 4)
        self.assertIn("quality_score", response.data)
