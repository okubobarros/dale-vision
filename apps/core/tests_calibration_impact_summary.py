from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views_calibration import CalibrationImpactSummaryView


class CalibrationImpactSummaryViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CalibrationImpactSummaryView.as_view()

    @patch("apps.core.views_calibration.get_user_org_ids", return_value=[])
    def test_returns_empty_when_non_admin_without_org_scope(self, _org_mock):
        user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=123)
        request = self.factory.get("/api/v1/calibration/actions/impact-summary/?period=30d")
        force_authenticate(request, user=user)
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totals"]["actions_total"], 0)
        self.assertEqual(response.data["by_issue"], [])
