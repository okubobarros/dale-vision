from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views_calibration import CalibrationActionAutoGenerateView


class CalibrationActionAutoGenerateViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CalibrationActionAutoGenerateView.as_view()

    @patch("apps.core.views_calibration.get_user_org_ids", return_value=[])
    def test_returns_empty_for_non_admin_without_org_scope(self, _org_mock):
        user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=123)
        request = self.factory.post("/api/v1/calibration/actions/auto-generate/", {"dry_run": True}, format="json")
        force_authenticate(request, user=user)
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["created_total"], 0)

    @patch("apps.core.views_calibration.PosTransactionEvent.objects.filter")
    @patch("apps.core.views_calibration.connection")
    @patch("apps.core.views_calibration.Camera.objects.filter")
    @patch("apps.core.views_calibration.Store.objects")
    @patch("apps.core.views_calibration.CalibrationAction.objects")
    def test_dry_run_creates_candidates_without_persisting(
        self,
        action_objects_mock,
        store_objects_mock,
        camera_filter_mock,
        connection_mock,
        pos_filter_mock,
    ):
        admin_user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)

        stale_store = SimpleNamespace(
            id="store-1",
            org_id="org-1",
            last_seen_at=None,
            pos_integration_interest=False,
        )
        store_qs = MagicMock()
        store_qs.filter.return_value = store_qs
        store_qs.__getitem__.return_value = [stale_store]
        store_objects_mock.all.return_value = store_qs

        camera_qs = MagicMock()
        camera_qs.select_related.return_value = []
        camera_filter_mock.return_value = camera_qs

        cursor_ctx = MagicMock()
        cursor = MagicMock()
        cursor_ctx.__enter__.return_value = cursor
        cursor_ctx.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_ctx
        cursor.fetchall.return_value = []

        pos_filter_mock.return_value.values_list.return_value.distinct.return_value = []
        action_objects_mock.filter.return_value.exists.return_value = False

        request = self.factory.post(
            "/api/v1/calibration/actions/auto-generate/",
            {"dry_run": True, "max_actions": 5},
            format="json",
        )
        force_authenticate(request, user=admin_user)
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["dry_run"], True)
        self.assertGreaterEqual(response.data["created_total"], 1)
        action_objects_mock.create.assert_not_called()

    @patch("apps.core.views_calibration.PosTransactionEvent.objects.filter")
    @patch("apps.core.views_calibration.connection")
    @patch("apps.core.views_calibration.Camera.objects.filter")
    @patch("apps.core.views_calibration.Store.objects")
    @patch("apps.core.views_calibration.CalibrationAction.objects")
    def test_persist_mode_creates_action_rows(
        self,
        action_objects_mock,
        store_objects_mock,
        camera_filter_mock,
        connection_mock,
        pos_filter_mock,
    ):
        admin_user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)

        stale_store = SimpleNamespace(
            id="store-1",
            org_id="org-1",
            last_seen_at=None,
            pos_integration_interest=False,
        )
        store_qs = MagicMock()
        store_qs.filter.return_value = store_qs
        store_qs.__getitem__.return_value = [stale_store]
        store_objects_mock.all.return_value = store_qs

        camera_qs = MagicMock()
        camera_qs.select_related.return_value = []
        camera_filter_mock.return_value = camera_qs

        cursor_ctx = MagicMock()
        cursor = MagicMock()
        cursor_ctx.__enter__.return_value = cursor
        cursor_ctx.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_ctx
        cursor.fetchall.return_value = []

        pos_filter_mock.return_value.values_list.return_value.distinct.return_value = []
        action_objects_mock.filter.return_value.exists.return_value = False
        action_objects_mock.create.return_value = SimpleNamespace(id="action-1", status="open")

        request = self.factory.post(
            "/api/v1/calibration/actions/auto-generate/",
            {"dry_run": False, "max_actions": 5},
            format="json",
        )
        force_authenticate(request, user=admin_user)
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["created_total"], 1)
        action_objects_mock.create.assert_called()

    @patch("apps.core.views_calibration.PosTransactionEvent.objects.filter")
    @patch("apps.core.views_calibration.connection")
    @patch("apps.core.views_calibration.Camera.objects.filter")
    @patch("apps.core.views_calibration.Store.objects")
    @patch("apps.core.views_calibration.CalibrationAction.objects")
    def test_dry_run_generates_vision_funnel_reconciliation_gap_action(
        self,
        action_objects_mock,
        store_objects_mock,
        camera_filter_mock,
        connection_mock,
        pos_filter_mock,
    ):
        admin_user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)

        healthy_store = SimpleNamespace(
            id="store-1",
            org_id="org-1",
            last_seen_at=timezone.now(),
            pos_integration_interest=False,
        )
        store_qs = MagicMock()
        store_qs.filter.return_value = store_qs
        store_qs.__getitem__.return_value = [healthy_store]
        store_objects_mock.all.return_value = store_qs

        camera_qs = MagicMock()
        camera_qs.select_related.return_value = []
        camera_filter_mock.return_value = camera_qs

        cursor_ctx = MagicMock()
        cursor = MagicMock()
        cursor_ctx.__enter__.return_value = cursor
        cursor_ctx.__exit__.return_value = False
        connection_mock.cursor.return_value = cursor_ctx
        cursor.fetchall.side_effect = [
            [],  # conversion identity null-rate query
            [("store-1", 7, None)],  # vision->funnel gap query
        ]

        pos_filter_mock.return_value.values_list.return_value.distinct.return_value = []
        action_objects_mock.filter.return_value.exists.return_value = False

        request = self.factory.post(
            "/api/v1/calibration/actions/auto-generate/",
            {"dry_run": True, "max_actions": 10},
            format="json",
        )
        force_authenticate(request, user=admin_user)
        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        issue_codes = [item.get("issue_code") for item in response.data.get("created", [])]
        self.assertIn("vision_funnel_reconciliation_gap_24h", issue_codes)
        reconciliation_items = [
            item for item in response.data.get("created", [])
            if item.get("issue_code") == "vision_funnel_reconciliation_gap_24h"
        ]
        self.assertTrue(reconciliation_items)
        self.assertTrue(reconciliation_items[0].get("sla_due_at"))
