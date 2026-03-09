from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views import StoreViewSet


class _PublishedRoi:
    def __init__(self, config_json):
        self.config_json = config_json


class StoreVisionConfidenceTests(SimpleTestCase):
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
    def test_vision_confidence_returns_operational_status_per_camera(
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

        camera_entrada = MagicMock()
        camera_entrada.id = "cam-entrada"
        camera_entrada.name = "Entrada Principal"
        camera_entrada.external_id = "entrada-1"
        camera_entrada.status = "online"
        camera_entrada.last_seen_at = now - timedelta(minutes=4)

        camera_caixa = MagicMock()
        camera_caixa.id = "cam-caixa"
        camera_caixa.name = "Caixa 1"
        camera_caixa.external_id = "checkout-1"
        camera_caixa.status = "offline"
        camera_caixa.last_seen_at = now - timedelta(hours=8)

        queryset_mock = MagicMock()
        queryset_mock.order_by.return_value = [camera_entrada, camera_caixa]
        camera_filter_mock.return_value = queryset_mock
        calibration_qs = MagicMock()
        calibration_qs.order_by.return_value.values.return_value = []
        calibration_filter_mock.return_value = calibration_qs

        roi_mock.side_effect = [
            _PublishedRoi({"roi_version": "7", "lines": [{"id": "line-main", "name": "Entrada"}], "zones": []}),
            None,
        ]

        cursor = MagicMock()
        cursor.fetchall.return_value = [
            ("cam-entrada", "vision.crossing.v1", 24, now - timedelta(minutes=5)),
        ]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_cm

        view = StoreViewSet.as_view({"get": "vision_confidence"})
        request = self.factory.get(
            f"/api/v1/stores/{self.store.id}/vision/confidence/",
            {"window_hours": "24"},
        )
        force_authenticate(request, user=self.user)
        response = view(request, pk=self.store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["store_id"], str(self.store.id))
        self.assertEqual(response.data["store_status"], "parcial")
        self.assertEqual(response.data["summary"]["cameras_total"], 2)
        self.assertEqual(response.data["summary"]["cameras_with_published_roi"], 1)
        self.assertEqual(response.data["summary"]["metrics_ready"], 1)
        self.assertEqual(response.data["summary"]["metrics_recalibrate"], 2)

        entrada = response.data["cameras"][0]
        self.assertEqual(entrada["camera_role"], "entrada")
        self.assertEqual(entrada["store_status"], "pronto")
        self.assertTrue(entrada["roi_published"])
        self.assertEqual(entrada["metrics"][0]["event_type"], "vision.crossing.v1")
        self.assertEqual(entrada["metrics"][0]["status"], "pronto")
        self.assertEqual(entrada["metrics"][0]["events_24h"], 24)

        caixa = response.data["cameras"][1]
        self.assertEqual(caixa["camera_role"], "balcao")
        self.assertEqual(caixa["store_status"], "recalibrar")
        self.assertFalse(caixa["roi_published"])
        self.assertEqual(len(caixa["metrics"]), 2)
        self.assertEqual(caixa["metrics"][0]["status"], "recalibrar")
        self.assertIn("roi_not_published", caixa["metrics"][0]["reasons"])
        self.assertIn("camera_not_healthy", caixa["metrics"][0]["reasons"])
