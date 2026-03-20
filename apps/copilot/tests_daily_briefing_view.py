from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.copilot.views import CopilotDailyBriefingView


class CopilotDailyBriefingViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotDailyBriefingView.as_view()

    @patch("apps.copilot.views.get_user_org_ids", return_value=[])
    def test_get_without_org_scope_returns_safe_empty_payload(self, _mock_org_ids):
        request = self.factory.get("/api/v1/copilot/daily-briefing/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False))
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("briefing_state"), "calm")
        self.assertEqual(response.data.get("metrics", {}).get("critical_open_total"), 0)
        self.assertEqual(response.data.get("cta", {}).get("href"), "/app/operations/stores")

    @patch("apps.copilot.views._build_daily_briefing_payload")
    @patch("apps.copilot.views.get_user_org_ids")
    def test_get_network_scope_builds_with_user_orgs(self, mock_org_ids, mock_build_payload):
        org_a = uuid4()
        org_b = uuid4()
        mock_org_ids.return_value = [org_a, org_b]
        mock_build_payload.return_value = {"headline": "rede", "cta": {"href": "/app/operations"}}

        request = self.factory.get("/api/v1/copilot/daily-briefing/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False))
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("headline"), "rede")
        mock_build_payload.assert_called_once_with(org_ids=[str(org_a), str(org_b)])
