from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views_report import ReportSummaryView


class ReportSummaryViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = ReportSummaryView.as_view()

    @patch("apps.core.views_report.get_user_org_ids", return_value=[])
    def test_report_summary_returns_incident_response_when_no_org(self, _mock_orgs):
        request = self.factory.get("/api/v1/report/summary/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))
        response = self.view(request)
        assert response.status_code == 200
        payload = response.data
        assert payload["stores_count"] == 0
        assert payload["incident_response"]["failures_total"] == 0
        assert payload["incident_response"]["runbook_opened_total"] == 0
        assert payload["action_execution"]["actions_dispatched_total"] == 0
        assert payload["action_execution"]["actions_failed_total"] == 0
        assert payload["action_execution"]["sources"]["reports"]["dispatched"] == 0
        assert payload["action_execution"]["sources"]["reports"]["failed"] == 0

    @patch("apps.core.views_report._build_report_payload")
    @patch("apps.core.views_report._parse_date_range")
    @patch("apps.core.views_report._get_org_timezone")
    @patch("apps.core.views_report.get_user_org_ids", return_value=["org-1"])
    def test_report_summary_keeps_incident_response_contract(
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
            "method": {"id": "report_summary", "version": "report_summary_v1_2026-03-13", "label": "", "description": ""},
            "confidence_governance": {"status": "parcial", "score": 70, "source_flags": {}, "caveats": []},
            "kpis": {
                "total_visitors": 1,
                "avg_dwell_seconds": 1,
                "avg_queue_seconds": 1,
                "avg_conversion_rate": 1,
                "total_alerts": 1,
            },
            "chart_footfall_by_day": [],
            "chart_footfall_by_hour": [],
            "alert_counts_by_type": [],
            "insights": [],
            "incident_response": {
                "method": {
                    "id": "edge_incident_response",
                    "version": "edge_incident_response_v1_2026-03-16",
                    "label": "",
                    "description": "",
                },
                "failures_total": 2,
                "rollbacks_total": 1,
                "runbook_opened_total": 2,
                "failures_with_runbook": 2,
                "runbook_coverage_rate": 100.0,
                "avg_time_to_runbook_seconds": 120,
                "latest_failure_at": now.isoformat(),
                "latest_runbook_opened_at": now.isoformat(),
            },
            "action_execution": {
                "method": {
                    "id": "action_execution",
                    "version": "action_execution_v1_2026-03-16",
                    "label": "",
                    "description": "",
                },
                "actions_dispatched_total": 10,
                "actions_completed_total": 4,
                "actions_failed_total": 2,
                "completion_rate": 40.0,
                "failure_rate": 20.0,
                "sources": {
                    "dashboard": {"dispatched": 2, "completed": 1, "failed": 0, "completion_rate": 50.0, "failure_rate": 0.0},
                    "reports": {"dispatched": 6, "completed": 2, "failed": 2, "completion_rate": 33.3, "failure_rate": 33.3},
                    "operations": {"dispatched": 2, "completed": 1, "failed": 0, "completion_rate": 50.0, "failure_rate": 0.0},
                    "other": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
                },
                "rollout": {"dispatched": 3, "completed": 1, "failed": 1, "completion_rate": 33.3, "failure_rate": 33.3},
                "top_source": "reports",
            },
        }

        request = self.factory.get("/api/v1/report/summary?period=7d")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))
        response = self.view(request)
        assert response.status_code == 200
        assert response.data["period"] == "7d"
        assert response.data["incident_response"]["method"]["version"] == "edge_incident_response_v1_2026-03-16"
        assert response.data["action_execution"]["method"]["version"] == "action_execution_v1_2026-03-16"
