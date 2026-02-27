import uuid
from django.test import SimpleTestCase
from django.http import Http404
from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from unittest.mock import MagicMock, patch

from apps.billing.utils import PaywallError, TRIAL_STORE_LIMIT, enforce_trial_store_limit
from backend.utils.entitlements import TrialExpiredError
from apps.stores.views import StoreViewSet
from apps.stores.serializers import EmployeeSerializer
from apps.stores import views_edge_status
from apps.edge import views as edge_views
from apps.edge.views import EdgeEventsIngestView
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.response import Response


class TrialStoreLimitTests(SimpleTestCase):
    @patch("apps.billing.utils.log_paywall_block")
    @patch("apps.billing.utils.is_trial", return_value=True)
    @patch("apps.billing.utils.Store")
    def test_blocks_second_store_on_trial(self, store_mock, _is_trial, _log):
        qs = MagicMock()
        qs.count.return_value = TRIAL_STORE_LIMIT
        store_mock.objects.filter.return_value = qs

        with self.assertRaises(PaywallError):
            enforce_trial_store_limit(org_id="org-id")

    @patch("apps.billing.utils.log_paywall_block")
    @patch("apps.billing.utils.is_trial", return_value=True)
    @patch("apps.billing.utils.Store")
    def test_allows_first_store_on_trial(self, store_mock, _is_trial, _log):
        qs = MagicMock()
        qs.count.return_value = TRIAL_STORE_LIMIT - 1
        store_mock.objects.filter.return_value = qs

        enforce_trial_store_limit(org_id="org-id")

    @patch("apps.billing.utils.log_paywall_block")
    @patch("apps.billing.utils.is_trial", return_value=False)
    @patch("apps.billing.utils.Store")
    def test_allows_when_not_trial(self, store_mock, _is_trial, _log):
        qs = MagicMock()
        qs.count.return_value = TRIAL_STORE_LIMIT
        store_mock.objects.filter.return_value = qs

        enforce_trial_store_limit(org_id="org-id")


class StoreCamerasEndpointTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)

    def _mock_store(self, store_id):
        store = MagicMock()
        store.id = store_id
        store.org_id = "org-1"
        return store

    @patch("apps.stores.views.OnboardingProgressService")
    @patch("apps.stores.views.enforce_trial_camera_limit")
    @patch("apps.stores.views.enforce_can_use_product")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.CameraSerializer")
    def test_post_cameras_uses_store_from_url(
        self,
        camera_serializer_mock,
        _require_role,
        _enforce_can_use,
        _enforce_trial,
        _onboarding,
    ):
        store = self._mock_store("11111111-1111-1111-1111-111111111111")
        serializer_in = MagicMock()
        serializer_in.is_valid.return_value = True
        serializer_in.validated_data = {"active": True}
        camera = MagicMock()
        camera.id = "cam-1"
        serializer_in.save.return_value = camera
        serializer_out = MagicMock()
        serializer_out.data = {"id": "cam-1"}
        camera_serializer_mock.side_effect = [serializer_in, serializer_out]

        view = StoreViewSet.as_view({"post": "cameras"})
        request = self.factory.post(
            f"/api/v1/stores/{store.id}/cameras/",
            {"store": "other-store", "name": "Cam 1"},
            format="json",
        )
        force_authenticate(request, user=self.user)

        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk=store.id)

        self.assertEqual(response.status_code, 201)
        serializer_in.save.assert_called_once()
        _, kwargs = serializer_in.save.call_args
        self.assertEqual(kwargs.get("store"), store)

    def test_post_cameras_invalid_store_returns_404(self):
        view = StoreViewSet.as_view({"post": "cameras"})
        request = self.factory.post("/api/v1/stores/bad/cameras/", {"name": "Cam"}, format="json")
        force_authenticate(request, user=self.user)

        with patch.object(StoreViewSet, "get_object", side_effect=Http404()):
            response = view(request, pk="bad")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data.get("code"), "STORE_NOT_FOUND")
        self.assertEqual(response.data.get("message"), "Store not found.")

    @patch("apps.stores.views.require_store_role", side_effect=PermissionDenied("nope"))
    def test_post_cameras_no_permission_returns_403(self, _require_role):
        store = self._mock_store("11111111-1111-1111-1111-111111111111")
        view = StoreViewSet.as_view({"post": "cameras"})
        request = self.factory.post(
            f"/api/v1/stores/{store.id}/cameras/",
            {"name": "Cam"},
            format="json",
        )
        force_authenticate(request, user=self.user)

        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk=store.id)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "PERMISSION_DENIED")

    @patch("apps.stores.views.CameraSerializer")
    @patch("apps.stores.views.require_store_role")
    def test_post_cameras_invalid_payload_returns_400(self, _require_role, serializer_mock):
        store = self._mock_store("11111111-1111-1111-1111-111111111111")
        serializer_in = MagicMock()
        serializer_in.is_valid.side_effect = ValidationError({"name": ["This field is required."]})
        serializer_mock.return_value = serializer_in

        view = StoreViewSet.as_view({"post": "cameras"})
        request = self.factory.post(
            f"/api/v1/stores/{store.id}/cameras/",
            {"brand": "Intelbras"},
            format="json",
        )
        force_authenticate(request, user=self.user)

        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk=store.id)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data.get("code"), "CAMERA_VALIDATION_ERROR")
        self.assertIn("details", response.data)

    @patch("apps.stores.views.enforce_trial_camera_limit", side_effect=PaywallError())
    @patch("apps.stores.views.enforce_can_use_product")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.CameraSerializer")
    def test_post_cameras_limit_returns_409(
        self,
        camera_serializer_mock,
        _require_role,
        _enforce_can_use,
        _enforce_trial,
    ):
        store = self._mock_store("11111111-1111-1111-1111-111111111111")
        serializer_in = MagicMock()
        serializer_in.is_valid.return_value = True
        serializer_in.validated_data = {"active": True}
        camera = MagicMock()
        camera.id = "cam-9"
        serializer_in.save.return_value = camera
        serializer_out = MagicMock()
        serializer_out.data = {"id": "cam-9"}
        camera_serializer_mock.side_effect = [serializer_in, serializer_out]

        view = StoreViewSet.as_view({"post": "cameras"})
        request = self.factory.post(
            f"/api/v1/stores/{store.id}/cameras/",
            {"name": "Cam 9"},
            format="json",
        )
        force_authenticate(request, user=self.user)

        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk=store.id)

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data.get("code"), "LIMIT_CAMERAS_REACHED")

    @patch("apps.stores.views.OnboardingProgressService")
    @patch("apps.stores.views.enforce_trial_camera_limit")
    @patch("apps.stores.views.enforce_can_use_product")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.CameraSerializer")
    def test_post_cameras_minimal_payload_returns_201(
        self,
        camera_serializer_mock,
        _require_role,
        _enforce_can_use,
        _enforce_trial,
        _onboarding,
    ):
        store = self._mock_store("11111111-1111-1111-1111-111111111111")
        serializer_in = MagicMock()
        serializer_in.is_valid.return_value = True
        serializer_in.validated_data = {"active": True}
        camera = MagicMock()
        camera.id = "cam-3"
        serializer_in.save.return_value = camera
        serializer_out = MagicMock()
        serializer_out.data = {"id": "cam-3"}
        camera_serializer_mock.side_effect = [serializer_in, serializer_out]

        view = StoreViewSet.as_view({"post": "cameras"})
        request = self.factory.post(
            f"/api/v1/stores/{store.id}/cameras/",
            {
                "name": "Cam 3",
                "brand": "Intelbras",
                "model": "NVR",
                "ip": "192.168.15.4",
                "username": "admin",
                "password": "123456",
                "rtsp_url": "rtsp://admin:123456@192.168.15.4:554/cam/realmonitor?channel=1&subtype=1",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk=store.id)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data.get("id"), "cam-3")

    @patch("apps.stores.views.enforce_can_use_product", side_effect=TrialExpiredError())
    @patch("apps.stores.views.require_store_role")
    def test_post_cameras_trial_expired_returns_402(self, _require_role, _enforce):
        store = self._mock_store("11111111-1111-1111-1111-111111111111")
        view = StoreViewSet.as_view({"post": "cameras"})
        request = self.factory.post(
            f"/api/v1/stores/{store.id}/cameras/",
            {"name": "Cam"},
            format="json",
        )
        force_authenticate(request, user=self.user)

        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk=store.id)

        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.data.get("code"), "PAYWALL_TRIAL_LIMIT")

    @patch("apps.stores.views.OnboardingProgressService")
    @patch("apps.stores.views.enforce_trial_camera_limit")
    @patch("apps.stores.views.enforce_can_use_product")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.CameraSerializer")
    def test_post_cameras_returns_camera_id(
        self,
        camera_serializer_mock,
        _require_role,
        _enforce_can_use,
        _enforce_trial,
        _onboarding,
    ):
        store = self._mock_store("11111111-1111-1111-1111-111111111111")
        serializer_in = MagicMock()
        serializer_in.is_valid.return_value = True
        serializer_in.validated_data = {}
        camera = MagicMock()
        camera.id = "cam-2"
        serializer_in.save.return_value = camera
        serializer_out = MagicMock()
        serializer_out.data = {"id": "cam-2"}
        camera_serializer_mock.side_effect = [serializer_in, serializer_out]

        view = StoreViewSet.as_view({"post": "cameras"})
        request = self.factory.post(
            f"/api/v1/stores/{store.id}/cameras/",
            {"name": "Cam 2"},
            format="json",
        )
        force_authenticate(request, user=self.user)

        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk=store.id)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data.get("id"), "cam-2")


class StoreOverviewEndpointTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)

    @patch("apps.stores.views.DetectionEvent")
    @patch("apps.stores.views.Employee")
    @patch("apps.stores.views.Camera")
    @patch("apps.stores.views.StoreViewSet.metrics_summary")
    @patch("apps.stores.views.require_store_role")
    def test_overview_payload(
        self,
        _require_role,
        metrics_summary_mock,
        camera_model,
        employee_model,
        event_model,
    ):
        store = MagicMock()
        store.id = "11111111-1111-1111-1111-111111111111"
        store.name = "Loja 1"
        store.city = "São Paulo"
        store.state = "SP"
        store.status = "trial"
        store.trial_ends_at = None
        store.last_seen_at = None
        store.last_error = None

        metrics_summary_mock.return_value = Response({"totals": {"total_visitors": 0}})

        camera_qs = MagicMock()
        camera_qs.order_by.return_value = camera_qs
        camera_qs.values.return_value = [
            {
                "id": "cam-1",
                "name": "Entrada",
                "status": "online",
                "last_seen_at": None,
                "last_snapshot_url": None,
                "last_error": None,
                "zone_id": None,
            }
        ]
        camera_model.objects.filter.return_value = camera_qs

        employee_qs = MagicMock()
        employee_qs.order_by.return_value = employee_qs
        employee_qs.values.return_value = [
            {
                "id": "emp-1",
                "full_name": "Ana",
                "role": "manager",
                "email": "ana@dale.com",
                "active": True,
            }
        ]
        employee_model.objects.filter.return_value = employee_qs

        event_qs = MagicMock()
        event_qs.order_by.return_value = event_qs
        event_qs.values.return_value = [
            {
                "id": "evt-1",
                "title": "Fila formada",
                "severity": "warning",
                "status": "open",
                "occurred_at": None,
                "created_at": None,
                "type": "queue",
            }
        ]
        event_qs.__getitem__.return_value = event_qs.values.return_value
        event_model.objects.filter.return_value = event_qs

        view = StoreViewSet.as_view({"get": "overview"})
        request = self.factory.get(f"/api/v1/stores/{store.id}/overview/")
        force_authenticate(request, user=self.user)

        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk=store.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["store"]["id"], str(store.id))
        self.assertIn("metrics_summary", response.data)
        self.assertIn("edge_health", response.data)
        self.assertIn("cameras", response.data)
        self.assertIn("employees", response.data)
        self.assertIn("last_alerts", response.data)


class StoreCameraActiveTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)

    @patch("apps.stores.views.require_store_role", side_effect=PermissionDenied("nope"))
    def test_set_camera_active_denied_returns_403(self, _require_role):
        view = StoreViewSet.as_view({"patch": "set_camera_active"})
        request = self.factory.patch(
            "/api/v1/stores/store-1/cameras/cam-1/",
            {"active": True},
            format="json",
        )
        force_authenticate(request, user=self.user)
        store = MagicMock()
        store.id = "store-1"
        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk="store-1", camera_id="cam-1")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "PERMISSION_DENIED")


class EdgeStatusNoCamerasTests(SimpleTestCase):
    def _mock_store(self, store_id):
        store = MagicMock()
        store.id = store_id
        store.last_error = None
        return store

    @patch("apps.stores.views_edge_status._get_last_heartbeat", return_value=None)
    @patch("apps.stores.views_edge_status.Camera")
    @patch("apps.stores.views_edge_status.Store")
    @patch("apps.stores.views_edge_status._get_last_edge_heartbeat_receipt")
    def test_no_cameras_recent_edge_heartbeat(
        self,
        last_edge_receipt_mock,
        store_mock,
        camera_mock,
        _last_heartbeat,
    ):
        store_id = str(uuid.uuid4())
        store_mock.objects.filter.return_value.first.return_value = self._mock_store(store_id)
        camera_mock.objects.filter.return_value.order_by.return_value = []

        ts = (timezone.now() - timezone.timedelta(seconds=30)).isoformat()
        receipt = MagicMock()
        receipt.payload = {"data": {"ts": ts, "agent_id": "agent-1", "version": "1.2.3"}}
        last_edge_receipt_mock.return_value = receipt

        payload, _reason = views_edge_status.compute_store_edge_status_snapshot(store_id)

        self.assertTrue(payload.get("online"))
        self.assertEqual(payload.get("store_status_reason"), "no_cameras")
        self.assertEqual(payload.get("store_status"), "online_no_cameras")
        self.assertIsNotNone(payload.get("last_heartbeat_at"))
        self.assertEqual(payload.get("agent_id"), "agent-1")
        self.assertEqual(payload.get("version"), "1.2.3")

    @patch("apps.stores.views_edge_status._get_last_heartbeat", return_value=None)
    @patch("apps.stores.views_edge_status.Camera")
    @patch("apps.stores.views_edge_status.Store")
    @patch("apps.stores.views_edge_status._get_last_edge_heartbeat_receipt")
    def test_no_cameras_old_edge_heartbeat_offline(
        self,
        last_edge_receipt_mock,
        store_mock,
        camera_mock,
        _last_heartbeat,
    ):
        store_id = str(uuid.uuid4())
        store_mock.objects.filter.return_value.first.return_value = self._mock_store(store_id)
        camera_mock.objects.filter.return_value.order_by.return_value = []

        ts = (
            timezone.now()
            - timezone.timedelta(seconds=views_edge_status.EDGE_ONLINE_THRESHOLD_SECONDS + 10)
        ).isoformat()
        receipt = MagicMock()
        receipt.payload = {"data": {"ts": ts, "agent_id": "agent-2", "version": "2.0.0"}}
        last_edge_receipt_mock.return_value = receipt

        payload, _reason = views_edge_status.compute_store_edge_status_snapshot(store_id)

        self.assertFalse(payload.get("online"))
        self.assertEqual(payload.get("store_status_reason"), "no_cameras")
        self.assertEqual(payload.get("store_status"), "offline")

    @patch("apps.stores.views_edge_status._get_last_heartbeat", return_value=None)
    @patch("apps.stores.views_edge_status.Camera")
    @patch("apps.stores.views_edge_status.Store")
    @patch("apps.stores.views_edge_status._get_last_edge_heartbeat_receipt")
    def test_no_cameras_without_edge_heartbeat(
        self,
        last_edge_receipt_mock,
        store_mock,
        camera_mock,
        _last_heartbeat,
    ):
        store_id = str(uuid.uuid4())
        store_mock.objects.filter.return_value.first.return_value = self._mock_store(store_id)
        camera_mock.objects.filter.return_value.order_by.return_value = []
        last_edge_receipt_mock.return_value = None

        payload, _reason = views_edge_status.compute_store_edge_status_snapshot(store_id)

        self.assertFalse(payload.get("online"))
        self.assertEqual(payload.get("store_status_reason"), "no_cameras")
        self.assertEqual(payload.get("store_status"), "offline")
        self.assertIsNone(payload.get("last_heartbeat_at"))

    @patch("apps.stores.views_edge_status._get_last_edge_heartbeat_receipt")
    @patch("apps.stores.views_edge_status._get_last_heartbeat")
    @patch("apps.stores.views_edge_status.Camera")
    @patch("apps.stores.views_edge_status.Store")
    def test_with_cameras_keeps_current_behavior(
        self,
        store_mock,
        camera_mock,
        last_heartbeat_mock,
        last_edge_receipt_mock,
    ):
        store_id = str(uuid.uuid4())
        store_mock.objects.filter.return_value.first.return_value = self._mock_store(store_id)

        cam = MagicMock()
        cam.id = uuid.uuid4()
        cam.external_id = "cam-1"
        cam.name = "Camera 1"
        cam.last_seen_at = timezone.now()
        cam.last_snapshot_url = None
        camera_mock.objects.filter.return_value.order_by.return_value = [cam]
        last_heartbeat_mock.return_value = cam.last_seen_at

        payload, _reason = views_edge_status.compute_store_edge_status_snapshot(store_id)

        self.assertEqual(payload.get("store_status"), "online")
        self.assertEqual(payload.get("store_status_reason"), "all_cameras_online")
        last_edge_receipt_mock.assert_called_once_with(store_id)

    @patch("apps.stores.views_edge_status._get_last_edge_heartbeat_receipt")
    @patch("apps.stores.views_edge_status._get_last_heartbeat")
    @patch("apps.stores.views_edge_status.Camera")
    @patch("apps.stores.views_edge_status.Store")
    def test_with_cameras_stale_heartbeat_is_offline(
        self,
        store_mock,
        camera_mock,
        last_heartbeat_mock,
        last_edge_receipt_mock,
    ):
        store_id = str(uuid.uuid4())
        store_mock.objects.filter.return_value.first.return_value = self._mock_store(store_id)

        old_ts = timezone.now() - timezone.timedelta(seconds=views_edge_status.DEGRADED_SEC + 10)
        cam = MagicMock()
        cam.id = uuid.uuid4()
        cam.external_id = "cam-offline"
        cam.name = "Camera Offline"
        cam.last_seen_at = old_ts
        cam.last_snapshot_url = None
        camera_mock.objects.filter.return_value.order_by.return_value = [cam]
        last_heartbeat_mock.return_value = old_ts

        payload, _reason = views_edge_status.compute_store_edge_status_snapshot(store_id)

        self.assertEqual(payload.get("store_status"), "offline")
        self.assertEqual(payload.get("store_status_reason"), "heartbeat_expired")
        self.assertFalse(payload.get("online"))
        last_edge_receipt_mock.assert_called_once_with(store_id)


class EdgeHeartbeatIngestTests(SimpleTestCase):
    @patch("apps.edge.views.EdgeEventReceipt.objects.get_or_create")
    @patch("apps.edge.views.Store.objects.filter")
    @patch("apps.edge.views.EdgeEventsIngestView._is_edge_request", return_value=(True, None))
    @patch("apps.edge.views.TokenAuthentication.authenticate", return_value=None)
    @patch("apps.edge.views._update_store_last_seen")
    def test_ingest_updates_store_last_seen(
        self,
        update_store_last_seen,
        _auth_mock,
        _edge_auth_mock,
        store_filter_mock,
        receipt_get_or_create_mock,
    ):
        store_id = str(uuid.uuid4())
        store_filter_mock.return_value.exists.return_value = True
        receipt_get_or_create_mock.return_value = (MagicMock(), False)

        ts = (timezone.now() - timezone.timedelta(seconds=10)).isoformat()
        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-123",
            "data": {"store_id": store_id, "ts": ts},
        }

        factory = APIRequestFactory()
        request = factory.post("/api/edge/events/", payload, format="json", HTTP_X_EDGE_TOKEN="token")
        response = EdgeEventsIngestView.as_view()(request)

        self.assertIn(response.status_code, (200, 201))
        update_store_last_seen.assert_called_once()
        called_store_id, called_ts = update_store_last_seen.call_args[0]
        expected_ts = edge_views._parse_edge_ts(ts)
        self.assertEqual(called_store_id, store_id)
        self.assertEqual(called_ts, expected_ts)


class SubscriptionRequiredEnforcementTests(SimpleTestCase):
    @patch("apps.stores.views.ensure_user_uuid", return_value="user-uuid")
    @patch("apps.stores.views.get_user_org_ids", return_value=["org-1"])
    @patch("apps.stores.views.enforce_can_use_product", side_effect=TrialExpiredError())
    def test_blocks_create_store_when_trial_expired(self, _enforce, _get_orgs, _ensure_uuid):
        view = StoreViewSet()
        request = APIRequestFactory().post("/api/v1/stores/", {}, format="json")
        request.user = MagicMock()
        view.request = request
        serializer = MagicMock()
        with self.assertRaises(TrialExpiredError):
            view.perform_create(serializer)

    @patch("apps.stores.views.enforce_can_use_product", side_effect=TrialExpiredError())
    def test_blocks_delete_store_when_trial_expired(self, _enforce):
        view = StoreViewSet()
        request = APIRequestFactory().delete("/api/v1/stores/store-1/")
        request.user = MagicMock()
        view.request = request
        view.get_object = MagicMock(return_value=MagicMock(org_id="org-1"))
        with self.assertRaises(TrialExpiredError):
            view.destroy(request, pk="store-1")

    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet._require_subscription_for_store", side_effect=TrialExpiredError())
    def test_dashboard_returns_402_when_subscription_required(self, _enforce, _require_role):
        view = StoreViewSet.as_view({"get": "dashboard"})
        request = APIRequestFactory().get("/api/v1/stores/store-1/dashboard/")
        user = MagicMock(is_authenticated=True)
        force_authenticate(request, user=user)
        store = MagicMock()
        store.id = "store-1"
        store.org_id = "org-1"
        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk="store-1")
        self.assertEqual(response.status_code, 402)

    @patch("apps.stores.views.require_store_role", side_effect=PermissionDenied("nope"))
    def test_dashboard_returns_403_when_role_denied(self, _require_role):
        view = StoreViewSet.as_view({"get": "dashboard"})
        request = APIRequestFactory().get("/api/v1/stores/store-1/dashboard/")
        user = MagicMock(is_authenticated=True)
        force_authenticate(request, user=user)
        store = MagicMock()
        store.id = "store-1"
        store.org_id = "org-1"
        with patch.object(StoreViewSet, "get_object", return_value=store):
            response = view(request, pk="store-1")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "PERMISSION_DENIED")


class EmployeeSerializerTests(SimpleTestCase):
    def test_accepts_store_id_in_list_payload(self):
        store_id = uuid.uuid4()
        store = MagicMock()
        store.id = store_id
        payload = [
            {
                "store_id": str(store_id),
                "full_name": "A",
                "email": "a@a.com",
                "role": "owner",
                "role_other": None,
            },
            {
                "store_id": str(store_id),
                "full_name": "B",
                "email": None,
                "role": "manager",
                "role_other": None,
            },
        ]

        with patch("apps.stores.serializers.Store.objects.get", return_value=store):
            serializer = EmployeeSerializer(data=payload, many=True)
            self.assertTrue(serializer.is_valid(), serializer.errors)
            validated = serializer.validated_data

        self.assertEqual(len(validated), 2)
        self.assertEqual(validated[0]["store"], store)
        self.assertEqual(validated[1]["store"], store)

    def test_missing_store_id_returns_error(self):
        payload = {"full_name": "A", "role": "owner"}
        serializer = EmployeeSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("store_id", serializer.errors)

    def test_store_id_mismatch_returns_error(self):
        store_id = uuid.uuid4()
        other_id = uuid.uuid4()
        store = MagicMock()
        store.id = store_id
        payload = {
            "store": str(store_id),
            "store_id": str(other_id),
            "full_name": "A",
            "role": "owner",
        }

        serializer = EmployeeSerializer(data=payload)
        serializer.fields["store"].queryset = MagicMock(get=MagicMock(return_value=store))
        self.assertFalse(serializer.is_valid())
        self.assertIn("store_id", serializer.errors)
