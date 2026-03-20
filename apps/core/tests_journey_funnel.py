from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views_report import JourneyFunnelView


class JourneyFunnelViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = JourneyFunnelView.as_view()

    @patch("apps.core.views_report.get_user_org_ids", return_value=[])
    def test_returns_empty_payload_without_org(self, _orgs_mock):
        request = self.factory.get("/api/v1/report/journey-funnel/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["period"], "7d")
        self.assertEqual(response.data["stages"], [])
        self.assertEqual(response.data["kpis"]["signups_total"], 0)

    @patch("apps.core.views_report._build_journey_funnel_payload")
    @patch("apps.core.views_report._parse_date_range")
    @patch("apps.core.views_report._get_org_timezone")
    @patch("apps.core.views_report.get_user_org_ids", return_value=["org-1"])
    def test_returns_funnel_payload(
        self,
        _orgs_mock,
        tz_mock,
        range_mock,
        payload_mock,
    ):
        now = timezone.now()
        tz_mock.return_value = timezone.get_current_timezone()
        range_mock.return_value = (now - timedelta(days=7), now, "7d")
        payload_mock.return_value = {
            "from": (now - timedelta(days=7)).isoformat(),
            "to": now.isoformat(),
            "method": {
                "id": "journey_funnel",
                "version": "journey_funnel_v1_2026-03-20",
                "label": "Funil de jornada ICP",
                "description": "desc",
            },
            "stages": [
                {
                    "stage_key": "signup_completed",
                    "stage_label": "Cadastro concluido",
                    "count": 10,
                    "conversion_from_previous": None,
                    "payload_missing_rate": 0.0,
                    "payload_missing_total": 0,
                    "payload_samples": 10,
                }
            ],
            "kpis": {
                "signups_total": 10,
                "activated_total": 4,
                "subscriptions_active_total": 2,
                "activation_rate": 0.4,
                "paid_rate": 0.2,
            },
            "quality": {
                "top_drop_stage": {
                    "from_stage": "signup_completed",
                    "to_stage": "store_created",
                    "drop_rate": 0.5,
                    "from_count": 10,
                    "to_count": 5,
                },
                "include_global_leads": False,
            },
        }

        request = self.factory.get("/api/v1/report/journey-funnel/?period=7d")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["period"], "7d")
        self.assertEqual(response.data["kpis"]["activation_rate"], 0.4)
        self.assertEqual(response.data["stages"][0]["stage_key"], "signup_completed")

    @patch("apps.core.views_report._build_journey_funnel_payload")
    @patch("apps.core.views_report._parse_date_range")
    @patch("apps.core.views_report._get_org_timezone")
    @patch("apps.core.views_report.get_user_org_ids", return_value=[])
    def test_staff_user_can_view_global_funnel_without_org_membership(
        self,
        _orgs_mock,
        tz_mock,
        range_mock,
        payload_mock,
    ):
        now = timezone.now()
        tz_mock.return_value = timezone.get_current_timezone()
        range_mock.return_value = (now - timedelta(days=7), now, "7d")
        payload_mock.return_value = {
            "from": (now - timedelta(days=7)).isoformat(),
            "to": now.isoformat(),
            "method": {"id": "journey_funnel", "version": "journey_funnel_v1_2026-03-20", "label": "Funil", "description": "desc"},
            "stages": [],
            "kpis": {
                "signups_total": 0,
                "activated_total": 0,
                "subscriptions_active_total": 0,
                "activation_rate": None,
                "paid_rate": None,
            },
            "quality": {"top_drop_stage": None, "include_global_leads": True},
        }

        request = self.factory.get("/api/v1/report/journey-funnel/?period=7d&include_global_leads=1")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True, id=10, is_staff=True, is_superuser=False),
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        payload_mock.assert_called_once()
        kwargs = payload_mock.call_args.kwargs
        self.assertIsNone(kwargs["org_id"])
        self.assertEqual(kwargs["org_ids"], [])
        self.assertTrue(kwargs["include_global_leads"])
