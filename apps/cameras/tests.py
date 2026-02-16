from django.test import SimpleTestCase
from django.test import override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from django.core.exceptions import PermissionDenied
from apps.billing.utils import PaywallError
from unittest.mock import MagicMock, patch

from apps.cameras.limits import enforce_trial_camera_limit, TRIAL_CAMERA_LIMIT_MESSAGE
from apps.cameras.roi import create_roi_config, get_latest_published_roi_config
from apps.cameras.permissions import require_store_role
from apps.cameras.views import CameraViewSet
from backend.utils.entitlements import TrialExpiredError


class TrialCameraLimitTests(SimpleTestCase):
    def _mock_store_qs(self, status: str):
        qs = MagicMock()
        qs.values.return_value = qs
        qs.first.return_value = {"status": status}
        return qs

    def _mock_camera_qs(self, count: int):
        qs = MagicMock()
        qs.filter.return_value = qs
        qs.exclude.return_value = qs
        qs.count.return_value = count
        return qs

    @patch("apps.cameras.limits.log_paywall_block")
    @patch("apps.cameras.limits.camera_active_column_exists", return_value=True)
    @patch("apps.cameras.limits.Camera")
    @patch("apps.cameras.limits.Store")
    def test_blocks_fourth_camera_on_trial(self, store_mock, camera_mock, _active_col, _log_mock):
        store_mock.objects.filter.return_value = self._mock_store_qs("trial")
        camera_mock.objects.filter.return_value = self._mock_camera_qs(3)

        with self.assertRaises(PaywallError) as ctx:
            enforce_trial_camera_limit("store-id", requested_active=True)

        self.assertIn(TRIAL_CAMERA_LIMIT_MESSAGE, str(ctx.exception))

    @patch("apps.cameras.limits.camera_active_column_exists", return_value=True)
    @patch("apps.cameras.limits.Camera")
    @patch("apps.cameras.limits.Store")
    def test_allows_under_limit(self, store_mock, camera_mock, _active_col):
        store_mock.objects.filter.return_value = self._mock_store_qs("trial")
        camera_mock.objects.filter.return_value = self._mock_camera_qs(2)

        enforce_trial_camera_limit("store-id", requested_active=True)

    @patch("apps.cameras.limits.camera_active_column_exists", return_value=True)
    @patch("apps.cameras.limits.Camera")
    @patch("apps.cameras.limits.Store")
    def test_allows_when_not_trial(self, store_mock, camera_mock, _active_col):
        store_mock.objects.filter.return_value = self._mock_store_qs("active")
        camera_mock.objects.filter.return_value = self._mock_camera_qs(5)

        enforce_trial_camera_limit("store-id", requested_active=True)

    @patch("apps.cameras.limits.camera_active_column_exists", return_value=True)
    @patch("apps.cameras.limits.Camera")
    @patch("apps.cameras.limits.Store")
    def test_allows_when_inactive_request(self, store_mock, camera_mock, _active_col):
        store_mock.objects.filter.return_value = self._mock_store_qs("trial")
        camera_mock.objects.filter.return_value = self._mock_camera_qs(3)

        enforce_trial_camera_limit("store-id", requested_active=False)


class RoiConfigVersionTests(SimpleTestCase):
    @patch("apps.cameras.roi.CameraROIConfig")
    def test_roi_version_starts_at_one(self, roi_model_mock):
        roi_model_mock.objects.filter.return_value.order_by.return_value.first.return_value = None
        roi_model_mock.objects.create.return_value = MagicMock()

        create_roi_config(camera_id="cam-1", config_json={"zones": []}, updated_by="user-1")

        roi_model_mock.objects.create.assert_called_once()
        _, kwargs = roi_model_mock.objects.create.call_args
        self.assertEqual(kwargs["version"], 1)

    @patch("apps.cameras.roi.CameraROIConfig")
    def test_roi_version_increments(self, roi_model_mock):
        latest = MagicMock()
        latest.version = 7
        roi_model_mock.objects.filter.return_value.order_by.return_value.first.return_value = latest
        roi_model_mock.objects.create.return_value = MagicMock()

        create_roi_config(camera_id="cam-1", config_json={"zones": []}, updated_by="user-1")

        roi_model_mock.objects.create.assert_called_once()
        _, kwargs = roi_model_mock.objects.create.call_args
        self.assertEqual(kwargs["version"], 8)

    @patch("apps.cameras.roi.CameraROIConfig")
    def test_latest_roi_can_filter_published(self, roi_model_mock):
        qs = MagicMock()
        roi_model_mock.objects.filter.return_value = qs
        qs.order_by.return_value.first.return_value = MagicMock()

        get_latest_published_roi_config("cam-1")

        roi_model_mock.objects.filter.assert_called_once_with(
            camera_id="cam-1",
            config_json__status="published",
        )


class CameraPermissionsTests(SimpleTestCase):
    @patch("apps.cameras.permissions.ensure_user_uuid", return_value="user-1")
    @patch("apps.cameras.permissions.StoreManager")
    @patch("apps.cameras.permissions.Store")
    @patch("apps.cameras.permissions.OrgMember")
    def test_require_store_role_denied(
        self, org_member_mock, store_mock, store_manager_mock, _uuid_mock
    ):
        store_mock.objects.filter.return_value.values.return_value.first.return_value = {
            "org_id": "org-1"
        }
        store_manager_mock.objects.filter.return_value.order_by.return_value.first.return_value = None
        org_member_mock.objects.filter.return_value.first.return_value = None

        with self.assertRaises(PermissionDenied):
            require_store_role(
                MagicMock(is_staff=False, is_superuser=False, id=1),
                "11111111-1111-1111-1111-111111111111",
                ("owner",),
            )

    @patch("apps.cameras.permissions.ensure_user_uuid", return_value="user-1")
    @patch("apps.cameras.permissions.StoreManager")
    @patch("apps.cameras.permissions.Store")
    @patch("apps.cameras.permissions.OrgMember")
    def test_require_store_role_allowed(
        self, org_member_mock, store_mock, store_manager_mock, _uuid_mock
    ):
        store_mock.objects.filter.return_value.values.return_value.first.return_value = {
            "org_id": "org-1"
        }
        store_manager_mock.objects.filter.return_value.order_by.return_value.first.return_value = None
        member = MagicMock()
        member.role = "manager"
        org_member_mock.objects.filter.return_value.first.return_value = member

        require_store_role(
            MagicMock(is_staff=False, is_superuser=False, id=1),
            "11111111-1111-1111-1111-111111111111",
            ("owner", "manager"),
        )


class CameraHealthEndpointTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch("apps.cameras.views._validate_edge_token_for_store", return_value=True)
    @patch("apps.cameras.views.CameraHealthLog")
    def test_health_updates_camera_and_creates_log(self, health_log_mock, _token_mock):
        cam = MagicMock()
        cam.id = "cam-1"
        cam.store_id = "store-1"

        view = CameraViewSet.as_view({"post": "health"})
        request = self.factory.post(
            "/api/v1/cameras/cam-1/health/",
            {
                "status": "online",
                "latency_ms": 120,
                "error": None,
                "ts": "2026-02-13T10:00:00Z",
            },
            format="json",
            HTTP_X_EDGE_TOKEN="edge-token",
        )
        force_authenticate(request, user=MagicMock(is_authenticated=True))

        with patch.object(CameraViewSet, "get_object", return_value=cam):
            response = view(request, pk="cam-1")

        self.assertEqual(response.status_code, 200)
        health_log_mock.objects.create.assert_called_once()
        cam.save.assert_called_once()


class CameraRoiLatestEndpointTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch("apps.cameras.views._validate_edge_token_for_store", return_value=True)
    @patch("apps.cameras.views.get_latest_published_roi_config")
    def test_roi_latest_returns_published(self, roi_latest_mock, _token_mock):
        cam = MagicMock()
        cam.id = "cam-1"
        cam.store_id = "store-1"
        roi_latest_mock.return_value = None

        view = CameraViewSet.as_view({"get": "roi_latest"})
        request = self.factory.get(
            "/api/v1/cameras/cam-1/roi/latest",
            HTTP_X_EDGE_TOKEN="edge-token",
        )
        force_authenticate(request, user=MagicMock(is_authenticated=True))

        with patch.object(CameraViewSet, "get_object", return_value=cam):
            response = view(request, pk="cam-1")

        self.assertEqual(response.status_code, 200)
        roi_latest_mock.assert_called_once_with("cam-1")


class TrialExpiredCameraCreateTests(SimpleTestCase):
    @patch("apps.cameras.views.enforce_can_use_product", side_effect=TrialExpiredError())
    def test_blocks_create_camera_when_trial_expired(self, _enforce):
        view = CameraViewSet()
        request = APIRequestFactory().post("/api/v1/cameras/", {}, format="json")
        request.user = MagicMock()
        view.request = request
        serializer = MagicMock()
        serializer.validated_data = {"store_id": "store-1"}
        serializer.is_valid.return_value = True
        view.get_serializer = MagicMock(return_value=serializer)
        with self.assertRaises(TrialExpiredError):
            view.create(request)
