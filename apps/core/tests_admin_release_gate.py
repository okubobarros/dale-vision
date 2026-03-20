from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views import AdminReleaseGateView


class AdminReleaseGateViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = AdminReleaseGateView.as_view()
        self.staff_user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)
        self.regular_user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=2)

    @patch("apps.core.views._compute_release_gate_summary")
    def test_get_returns_release_gate_for_internal_admin(self, summary_mock):
        summary_mock.return_value = {
            "generated_at": "2026-03-20T10:00:00+00:00",
            "window": {"from_30d": "x", "from_24h": "y", "to": "z"},
            "thresholds": {"null_rate_critical_max": 0.02, "pipeline_success_min": 0.99},
            "checks": {
                "null_rate_critical": {"pass": True},
                "pipeline_success": {"pass": True},
                "funnel_non_zero_active_store": {"pass": True},
            },
            "overall_pass": True,
            "status": "go",
        }
        request = self.factory.get("/api/v1/me/admin/release-gate/")
        force_authenticate(request, user=self.staff_user)

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["overall_pass"])
        self.assertEqual(response.data["status"], "go")

    def test_get_blocks_non_internal_user(self):
        request = self.factory.get("/api/v1/me/admin/release-gate/")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, 403)
