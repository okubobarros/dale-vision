import uuid
from django.test import SimpleTestCase
from django.utils import timezone
from unittest.mock import MagicMock, patch

from apps.billing.utils import PaywallError, TRIAL_STORE_LIMIT, enforce_trial_store_limit
from apps.stores import views_edge_status
from apps.edge import views as edge_views
from apps.edge.views import EdgeEventsIngestView
from rest_framework.test import APIRequestFactory


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
        camera_mock.objects.filter.return_value.order_by.return_value = [cam]
        last_heartbeat_mock.return_value = cam.last_seen_at

        payload, _reason = views_edge_status.compute_store_edge_status_snapshot(store_id)

        self.assertEqual(payload.get("store_status"), "online")
        self.assertEqual(payload.get("store_status_reason"), "all_cameras_online")
        last_edge_receipt_mock.assert_not_called()


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
