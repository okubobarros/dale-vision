from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from unittest.mock import MagicMock, patch

from apps.core.views_onboarding import OnboardingStepCompleteView


class OnboardingStepCompleteViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch("apps.core.views_onboarding.OnboardingProgress")
    @patch("apps.core.views_onboarding.OnboardingProgressService")
    @patch("apps.core.views_onboarding.get_user_org_ids", return_value=["org-1"])
    def test_step_complete_returns_ok(self, _org_mock, service_mock, progress_mock):
        progress_mock.objects.filter.return_value.first.return_value = None
        service = MagicMock()
        service.org_id = "org-1"
        service.complete_step.return_value = {
            "step": "camera_added",
            "completed": True,
            "completed_at": None,
            "status": "completed",
            "progress_percent": 20,
            "meta": {"camera_id": "cam-1"},
        }
        service.next_step.return_value = "camera_health_ok"
        service_mock.return_value = service

        view = OnboardingStepCompleteView.as_view()
        request = self.factory.post(
            "/api/v1/onboarding/step/complete/",
            {"step": "camera_added", "meta": {"camera_id": "cam-1"}},
            format="json",
        )
        force_authenticate(request, user=MagicMock(is_authenticated=True))
        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("ok"))
        self.assertFalse(response.data.get("already_completed"))
        service.complete_step.assert_called_once()

    @patch("apps.core.views_onboarding.OnboardingProgress")
    @patch("apps.core.views_onboarding.OnboardingProgressService")
    @patch("apps.core.views_onboarding.get_user_org_ids", return_value=["org-1"])
    def test_step_complete_idempotent(self, _org_mock, service_mock, progress_mock):
        progress_mock.objects.filter.return_value.first.return_value = MagicMock(completed=True)
        service = MagicMock()
        service.org_id = "org-1"
        service.next_step.return_value = "camera_health_ok"
        service_mock.return_value = service

        view = OnboardingStepCompleteView.as_view()
        request = self.factory.post(
            "/api/v1/onboarding/step/complete/",
            {"step": "camera_added"},
            format="json",
        )
        force_authenticate(request, user=MagicMock(is_authenticated=True))
        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("ok"))
        self.assertTrue(response.data.get("already_completed"))
        service.complete_step.assert_not_called()

    def test_step_complete_missing_payload_returns_400(self):
        view = OnboardingStepCompleteView.as_view()
        request = self.factory.post("/api/v1/onboarding/step/complete/", {}, format="json")
        force_authenticate(request, user=MagicMock(is_authenticated=True))
        response = view(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)
