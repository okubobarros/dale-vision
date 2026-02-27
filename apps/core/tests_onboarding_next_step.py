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

    @patch("apps.core.views_onboarding.get_user_org_ids", return_value=[])
    def test_no_store_stage(self, _org_ids):
        response = self._call_view()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("stage"), "no_store")

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
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        qs = MagicMock()
        qs.count.return_value = 0
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("stage"), "add_cameras")

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
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        qs = MagicMock()
        qs.count.return_value = 2
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("stage"), "validate_cameras")

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
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        qs = MagicMock()
        qs.count.return_value = 1
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("stage"), "setup_roi")

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
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        qs = MagicMock()
        qs.count.return_value = 1
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("stage"), "collecting_data")

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
    ):
        store_model.objects.filter.return_value.first.return_value = self.store
        org_model.objects.filter.return_value.first.return_value = self.org
        qs = MagicMock()
        qs.count.return_value = 2
        _get_active_cameras.return_value = qs

        response = self._call_view(self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("stage"), "active")
