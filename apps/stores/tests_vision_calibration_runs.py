from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views import StoreViewSet


class _PublishedRoi:
    def __init__(self, config_json):
        self.config_json = config_json


class _CalibrationRow:
    def __init__(self):
        self.id = "run-1"
        self.store_id = "11111111-1111-1111-1111-111111111111"
        self.camera_id = "cam-1"
        self.metric_type = "queue"
        self.roi_version = "5"
        self.manual_sample_size = 15
        self.manual_reference_value = 3.0
        self.system_value = 2.7
        self.error_pct = 10.0
        self.approved_by = "user-1"
        self.approved_at = None
        self.notes = "Validacao manual"
        self.status = "approved"
        self.created_at = None
        self.updated_at = None


class StoreVisionCalibrationRunsTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)
        self.store = MagicMock()
        self.store.id = "11111111-1111-1111-1111-111111111111"
        self.store.org_id = "org-1"
        self.store.name = "Loja Teste"

    @patch("apps.stores.views.StoreViewSet._require_subscription_for_store")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet.get_object")
    @patch("apps.stores.views.StoreCalibrationRun.objects.filter")
    def test_list_recent_calibration_runs(self, calibration_filter_mock, get_object_mock, _require_role, _require_sub):
        get_object_mock.return_value = self.store
        row = _CalibrationRow()
        qs = MagicMock()
        qs.filter.return_value = qs
        qs.order_by.return_value = qs
        qs.__getitem__.return_value = [row]
        calibration_filter_mock.return_value = qs

        view = StoreViewSet.as_view({"get": "vision_calibration_runs"})
        request = self.factory.get(
            f"/api/v1/stores/{self.store.id}/vision/calibration-runs/",
            {"metric_type": "queue", "limit": "10"},
        )
        force_authenticate(request, user=self.user)
        response = view(request, pk=self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["filters"]["metric_type"], "queue")
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["metric_type"], "queue")

    @patch("apps.stores.views.ensure_user_uuid", return_value="user-1")
    @patch("apps.stores.views.get_latest_published_roi_config")
    @patch("apps.stores.views.Camera.objects.filter")
    @patch("apps.stores.views.StoreViewSet._require_subscription_for_store")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet.get_object")
    @patch("apps.stores.views.StoreCalibrationRun.objects.create")
    def test_create_calibration_run(
        self,
        create_mock,
        get_object_mock,
        _require_role,
        _require_sub,
        camera_filter_mock,
        roi_mock,
        _ensure_user_uuid,
    ):
        get_object_mock.return_value = self.store
        camera = MagicMock()
        camera.id = "cam-1"
        camera.store_id = self.store.id
        camera_filter_mock.return_value.first.return_value = camera
        roi_mock.return_value = _PublishedRoi({"roi_version": "5"})

        created = _CalibrationRow()
        created.approved_at = MagicMock(isoformat=lambda: "2026-03-09T12:00:00Z")
        created.created_at = MagicMock(isoformat=lambda: "2026-03-09T12:00:00Z")
        created.updated_at = MagicMock(isoformat=lambda: "2026-03-09T12:00:00Z")
        create_mock.return_value = created

        view = StoreViewSet.as_view({"post": "vision_calibration_runs"})
        request = self.factory.post(
            f"/api/v1/stores/{self.store.id}/vision/calibration-runs/",
            {
                "camera_id": "cam-1",
                "metric_type": "queue",
                "manual_sample_size": 15,
                "manual_reference_value": 3.0,
                "system_value": 2.7,
                "notes": "Validacao manual",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = view(request, pk=self.store.id)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["metric_type"], "queue")
        self.assertEqual(response.data["roi_version"], "5")
        create_mock.assert_called_once()
        self.assertEqual(create_mock.call_args.kwargs["roi_version"], "5")
        self.assertEqual(create_mock.call_args.kwargs["error_pct"], 10.0)
