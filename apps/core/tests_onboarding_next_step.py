from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from unittest.mock import MagicMock, patch

from apps.core.views_onboarding import OnboardingNextStepView


class OnboardingNextStepViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)
        self.store = MagicMock()
        self.store.id = "11111111-1111-1111-1111-111111111111"
        self.store.org_id = "org-1"
        self.org = MagicMock()
        self.org.id = "org-1"
        self.org.timezone = "America/Sao_Paulo"

    def _call_view(self, store_id=None):
        view = OnboardingNextStepView.as_view()
        params = {}
        if store_id:
            params["store_id"] = store_id
        request = self.factory.get("/api/v1/onboarding/next-step/", params)
        force_authenticate(request, user=self.user)
        return view(request)

    def test_invalid_store_id_returns_400(self):
        response = self._call_view("invalid-id")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data.get("error"), "store_id_invalid")

    def test_missing_store_id_returns_400(self):
        response = self._call_view()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data.get("error"), "store_id_invalid")

    @patch("apps.core.views_onboarding.Store")
    def test_store_not_found_returns_404(self, store_model):
        store_model.objects.filter.return_value.first.return_value = None
        response = self._call_view(self.store.id)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data.get("error"), "store_not_found")

    @patch("apps.core.views_onboarding._store_access_allowed", return_value=False)
    @patch("apps.core.views_onboarding.Store")
    def test_forbidden_store_returns_403(self, store_model, _access):
        store_model.objects.filter.return_value.first.return_value = self.store
        response = self._call_view(self.store.id)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("error"), "forbidden")

    @patch("apps.core.views_onboarding.OnboardingProgressService")
    @patch("apps.core.views_onboarding._upsert_onboarding_progress")
    @patch("apps.core.views_onboarding.compute_store_edge_status_snapshot", return_value=({"store_status": "offline"}, None))
    @patch("apps.core.views_onboarding._get_active_cameras")
    @patch("apps.core.views_onboarding._store_access_allowed", return_value=True)
    @patch("apps.core.views_onboarding.Organization")
    @patch("apps.core.views_onboarding.Store")
    def test_add_cameras_stage(
        self,
        store_model,
        org_model,
        _access,
        _get_active_cameras,
        _edge_status,
        _upsert,
        service_mock,
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        service = MagicMock()
        service.next_step.return_value = "camera_added"
        service_mock.return_value = service
        qs = MagicMock()
        qs.count.return_value = 0
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("ok"))
        self.assertEqual(response.data.get("stage"), "add_cameras")
        self.assertEqual(response.data.get("next_step"), "camera_added")

    @patch("apps.core.views_onboarding.OnboardingProgressService")
    @patch("apps.core.views_onboarding._upsert_onboarding_progress")
    @patch("apps.core.views_onboarding.compute_store_edge_status_snapshot", return_value=({"store_status": "offline"}, None))
    @patch("apps.core.views_onboarding._has_unvalidated_cameras", return_value=True)
    @patch("apps.core.views_onboarding._get_active_cameras")
    @patch("apps.core.views_onboarding._store_access_allowed", return_value=True)
    @patch("apps.core.views_onboarding.Organization")
    @patch("apps.core.views_onboarding.Store")
    def test_validate_cameras_stage(
        self,
        store_model,
        org_model,
        _access,
        _get_active_cameras,
        _has_unvalidated,
        _edge_status,
        _upsert,
        service_mock,
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        service = MagicMock()
        service.next_step.return_value = "camera_health_ok"
        service_mock.return_value = service
        qs = MagicMock()
        qs.count.return_value = 2
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("ok"))
        self.assertEqual(response.data.get("stage"), "validate_cameras")

    @patch("apps.core.views_onboarding.OnboardingProgressService")
    @patch("apps.core.views_onboarding._upsert_onboarding_progress")
    @patch("apps.core.views_onboarding.compute_store_edge_status_snapshot", return_value=({"store_status": "offline"}, None))
    @patch("apps.core.views_onboarding._has_recent_metrics", return_value=False)
    @patch("apps.core.views_onboarding._has_missing_roi", return_value=True)
    @patch("apps.core.views_onboarding._has_unvalidated_cameras", return_value=False)
    @patch("apps.core.views_onboarding._get_active_cameras")
    @patch("apps.core.views_onboarding._store_access_allowed", return_value=True)
    @patch("apps.core.views_onboarding.Organization")
    @patch("apps.core.views_onboarding.Store")
    def test_setup_roi_stage(
        self,
        store_model,
        org_model,
        _access,
        _get_active_cameras,
        _has_unvalidated,
        _has_missing_roi,
        _has_recent_metrics,
        _edge_status,
        _upsert,
        service_mock,
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        service = MagicMock()
        service.next_step.return_value = "roi_published"
        service_mock.return_value = service
        qs = MagicMock()
        qs.count.return_value = 1
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("ok"))
        self.assertEqual(response.data.get("stage"), "setup_roi")

    @patch("apps.core.views_onboarding.OnboardingProgressService")
    @patch("apps.core.views_onboarding._upsert_onboarding_progress")
    @patch("apps.core.views_onboarding.compute_store_edge_status_snapshot", return_value=({"store_status": "offline"}, None))
    @patch("apps.core.views_onboarding._has_recent_metrics", return_value=False)
    @patch("apps.core.views_onboarding._has_missing_roi", return_value=False)
    @patch("apps.core.views_onboarding._has_unvalidated_cameras", return_value=False)
    @patch("apps.core.views_onboarding._get_active_cameras")
    @patch("apps.core.views_onboarding._store_access_allowed", return_value=True)
    @patch("apps.core.views_onboarding.Organization")
    @patch("apps.core.views_onboarding.Store")
    def test_collecting_data_stage(
        self,
        store_model,
        org_model,
        _access,
        _get_active_cameras,
        _has_unvalidated,
        _has_missing_roi,
        _has_recent_metrics,
        _edge_status,
        _upsert,
        service_mock,
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        service = MagicMock()
        service.next_step.return_value = None
        service_mock.return_value = service
        qs = MagicMock()
        qs.count.return_value = 1
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("ok"))
        self.assertEqual(response.data.get("stage"), "collecting_data")
        self.assertIsNone(response.data.get("next_step"))
        self.assertTrue(response.data.get("completed"))

    @patch("apps.core.views_onboarding.OnboardingProgressService")
    @patch("apps.core.views_onboarding._upsert_onboarding_progress")
    @patch("apps.core.views_onboarding.compute_store_edge_status_snapshot", return_value=({"store_status": "online"}, None))
    @patch("apps.core.views_onboarding._has_recent_metrics", return_value=True)
    @patch("apps.core.views_onboarding._has_missing_roi", return_value=False)
    @patch("apps.core.views_onboarding._has_unvalidated_cameras", return_value=False)
    @patch("apps.core.views_onboarding._get_active_cameras")
    @patch("apps.core.views_onboarding._store_access_allowed", return_value=True)
    @patch("apps.core.views_onboarding.Organization")
    @patch("apps.core.views_onboarding.Store")
    def test_active_stage(
        self,
        store_model,
        org_model,
        _access,
        _get_active_cameras,
        _has_unvalidated,
        _has_missing_roi,
        _has_recent_metrics,
        _edge_status,
        _upsert,
        service_mock,
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        service = MagicMock()
        service.next_step.return_value = "first_insight"
        service_mock.return_value = service
        qs = MagicMock()
        qs.count.return_value = 2
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("ok"))
        self.assertEqual(response.data.get("stage"), "active")
