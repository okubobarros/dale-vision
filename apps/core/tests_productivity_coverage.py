from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views_report import ProductivityCoverageView


class ProductivityCoverageViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = ProductivityCoverageView.as_view()

    @patch("apps.core.views_report.get_user_org_ids", return_value=[])
    def test_returns_empty_payload_when_user_has_no_org(self, _mock_orgs):
        request = self.factory.get("/api/v1/productivity/coverage/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))
        response = self.view(request)
        assert response.status_code == 200
        payload = response.data
        assert payload["stores_count"] == 0
        assert payload["method"]["version"] == "coverage_proxy_v1_2026-03-13"
        assert payload["confidence_governance"]["status"] == "insuficiente"
        assert payload["summary"]["gaps_total"] == 0
