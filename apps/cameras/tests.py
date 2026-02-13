from django.test import SimpleTestCase
from django.core.exceptions import PermissionDenied
from apps.billing.utils import PaywallError
from unittest.mock import MagicMock, patch

from apps.cameras.limits import enforce_trial_camera_limit, TRIAL_CAMERA_LIMIT_MESSAGE
from apps.cameras.roi import create_roi_config, get_latest_roi_config
from apps.cameras.permissions import require_store_role


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

    @patch("apps.cameras.limits.camera_active_column_exists", return_value=True)
    @patch("apps.cameras.limits.Camera")
    @patch("apps.cameras.limits.Store")
    def test_blocks_fourth_camera_on_trial(self, store_mock, camera_mock, _active_col):
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

        create_roi_config(camera_id="cam-1", payload={"zones": []}, status="draft")

        roi_model_mock.objects.create.assert_called_once()
        _, kwargs = roi_model_mock.objects.create.call_args
        self.assertEqual(kwargs["version"], 1)

    @patch("apps.cameras.roi.CameraROIConfig")
    def test_roi_version_increments(self, roi_model_mock):
        latest = MagicMock()
        latest.version = 7
        roi_model_mock.objects.filter.return_value.order_by.return_value.first.return_value = latest
        roi_model_mock.objects.create.return_value = MagicMock()

        create_roi_config(camera_id="cam-1", payload={"zones": []}, status="published")

        roi_model_mock.objects.create.assert_called_once()
        _, kwargs = roi_model_mock.objects.create.call_args
        self.assertEqual(kwargs["version"], 8)

    @patch("apps.cameras.roi.CameraROIConfig")
    def test_latest_roi_can_filter_published(self, roi_model_mock):
        qs = MagicMock()
        roi_model_mock.objects.filter.return_value = qs
        qs.filter.return_value = qs
        qs.order_by.return_value.first.return_value = MagicMock()

        get_latest_roi_config("cam-1", status="published")

        qs.filter.assert_called_once_with(status="published")


class CameraPermissionsTests(SimpleTestCase):
    @patch("apps.cameras.permissions.ensure_user_uuid", return_value="user-1")
    @patch("apps.cameras.permissions.Store")
    @patch("apps.cameras.permissions.OrgMember")
    def test_require_store_role_denied(self, org_member_mock, store_mock, _uuid_mock):
        store_mock.objects.filter.return_value.values.return_value.first.return_value = {
            "org_id": "org-1"
        }
        org_member_mock.objects.filter.return_value.first.return_value = None

        with self.assertRaises(PermissionDenied):
            require_store_role(MagicMock(is_staff=False, is_superuser=False), "store-1", ("owner",))

    @patch("apps.cameras.permissions.ensure_user_uuid", return_value="user-1")
    @patch("apps.cameras.permissions.Store")
    @patch("apps.cameras.permissions.OrgMember")
    def test_require_store_role_allowed(self, org_member_mock, store_mock, _uuid_mock):
        store_mock.objects.filter.return_value.values.return_value.first.return_value = {
            "org_id": "org-1"
        }
        member = MagicMock()
        member.role = "manager"
        org_member_mock.objects.filter.return_value.first.return_value = member

        require_store_role(MagicMock(is_staff=False, is_superuser=False), "store-1", ("owner", "manager"))

