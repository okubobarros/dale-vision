from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError
from unittest.mock import MagicMock, patch

from apps.cameras.limits import enforce_trial_camera_limit, TRIAL_CAMERA_LIMIT_MESSAGE


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

        with self.assertRaises(ValidationError) as ctx:
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
