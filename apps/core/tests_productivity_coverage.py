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

    @patch("apps.core.views_report._build_productivity_coverage_payload")
    @patch("apps.core.views_report._parse_date_range")
    @patch("apps.core.views_report._get_org_timezone")
    @patch("apps.core.views_report.get_user_org_ids", return_value=["org-1"])
    def test_returns_operational_window_contract_when_available(
        self,
        _mock_orgs,
        mock_tz,
        mock_parse_range,
        mock_build_payload,
    ):
        from django.utils import timezone

        now = timezone.now()
        mock_tz.return_value = timezone.get_current_timezone()
        mock_parse_range.return_value = (now, now, "7d")
        mock_build_payload.return_value = {
            "period": None,
            "from": now.isoformat(),
            "to": now.isoformat(),
            "store_id": None,
            "stores_count": 1,
            "method": {
                "id": "productivity_coverage",
                "version": "coverage_operational_window_v1_2026-03-14",
                "label": "Cobertura operacional por janela de 5 minutos",
                "description": "x",
            },
            "confidence_governance": {"status": "alto", "score": 88, "source_flags": {}, "caveats": []},
            "summary": {
                "gaps_total": 2,
                "critical_windows": 1,
                "warning_windows": 1,
                "adequate_windows": 2,
                "worst_window": None,
                "best_window": None,
                "peak_flow_window": None,
                "opportunity_window": None,
                "planned_source_mode": "proxy",
            },
            "windows": [],
        }

        request = self.factory.get("/api/v1/productivity/coverage?period=7d")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))
        response = self.view(request)
        assert response.status_code == 200
        payload = response.data
        assert payload["method"]["version"] == "coverage_operational_window_v1_2026-03-14"
        assert payload["confidence_governance"]["score"] == 88
