from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views_report import ReportImpactView


class ReportImpactViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = ReportImpactView.as_view()

    @patch("apps.core.views_report.get_user_org_ids", return_value=[])
    def test_report_impact_returns_empty_when_no_org(self, _mock_orgs):
        request = self.factory.get("/api/v1/report/impact/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))
        response = self.view(request)
        assert response.status_code == 200
        payload = response.data
        assert payload["stores_count"] == 0
        assert payload["impact"]["cost_idle"] == 0
        assert payload["impact"]["cost_queue"] == 0
