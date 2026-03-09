from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views import StoreViewSet


class _PublishedRoi:
    def __init__(self, config_json):
        self.config_json = config_json


class StoreVisionCalibrationPlanTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)
        self.store = MagicMock()
        self.store.id = "11111111-1111-1111-1111-111111111111"
        self.store.org_id = "org-1"
        self.store.name = "Loja Teste"

    @patch("apps.stores.views.get_latest_published_roi_config")
    @patch("apps.stores.views.StoreCalibrationRun.objects.filter")
    @patch("apps.stores.views.Camera.objects.filter")
    @patch("apps.stores.views.StoreViewSet._require_subscription_for_store")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet.get_object")
    @patch("apps.stores.views.connection")
    def test_returns_prioritized_recalibration_actions(
        self,
        connection_mock,
        get_object_mock,
        _require_role,
        _require_sub,
        camera_filter_mock,
        calibration_filter_mock,
        roi_mock,
    ):
        now = timezone.now()
        get_object_mock.return_value = self.store

        camera_caixa = MagicMock()
        camera_caixa.id = "cam-caixa"
        camera_caixa.name = "Caixa 1"
        camera_caixa.external_id = "checkout-1"
        camera_caixa.status = "offline"
        camera_caixa.last_seen_at = now - timedelta(hours=10)

        queryset_mock = MagicMock()
        queryset_mock.order_by.return_value = [camera_caixa]
        camera_filter_mock.return_value = queryset_mock
        calibration_qs = MagicMock()
        calibration_qs.order_by.return_value.values.return_value = []
        calibration_filter_mock.return_value = calibration_qs
        roi_mock.return_value = _PublishedRoi(
            {"roi_version": "9", "zones": [{"id": "zona-fila", "name": "fila"}], "lines": []}
        )

        cursor = MagicMock()
        cursor.fetchall.return_value = [
            ("cam-caixa", "vision.queue_state.v1", 0, None),
            ("cam-caixa", "vision.checkout_proxy.v1", 0, None),
        ]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_cm

        view = StoreViewSet.as_view({"get": "vision_calibration_plan"})
        request = self.factory.get(
            f"/api/v1/stores/{self.store.id}/vision/calibration-plan/",
            {"window_hours": "24"},
        )
        force_authenticate(request, user=self.user)
        response = view(request, pk=self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["store_status"], "recalibrar")
        self.assertEqual(response.data["summary"]["actions_total"], 2)
        self.assertEqual(response.data["summary"]["high_priority"], 2)
        self.assertEqual(response.data["actions"][0]["priority"], "alta")
        self.assertEqual(response.data["actions"][0]["action_code"], "recover_camera_health")
        self.assertEqual(response.data["actions"][0]["camera_role"], "balcao")
        self.assertEqual(response.data["actions"][0]["metric_key"], "checkout_proxy")
