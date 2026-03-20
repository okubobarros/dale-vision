from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views_calibration import (
    CalibrationActionEvidenceCreateView,
    CalibrationActionListCreateView,
    CalibrationActionStatusView,
)


class CalibrationActionListCreateViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CalibrationActionListCreateView.as_view()
        self.user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=123)

    @patch("apps.core.views_calibration.get_user_org_ids", return_value=[])
    def test_list_returns_empty_when_user_has_no_org_scope(self, _org_mock):
        request = self.factory.get("/api/v1/calibration/actions/")
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["items"], [])
        self.assertEqual(response.data["total"], 0)

    @patch("apps.core.views_calibration.Store.objects.filter")
    @patch("apps.core.views_calibration.get_user_org_ids", return_value=["org-1"])
    def test_create_forbidden_when_store_outside_scope(self, _org_mock, store_filter_mock):
        store_filter_mock.return_value.first.return_value = SimpleNamespace(id="store-1", org_id="org-2")
        request = self.factory.post(
            "/api/v1/calibration/actions/",
            {
                "store_id": "store-1",
                "issue_code": "high_glare",
                "recommended_action": "Ajustar camera 15 graus",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, 403)

    @patch("apps.core.views_calibration.CalibrationAction.objects")
    @patch("apps.core.views_calibration.Store.objects.filter")
    def test_create_success_for_internal_admin(self, store_filter_mock, actions_objects_mock):
        admin_user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)
        store_filter_mock.return_value.first.return_value = SimpleNamespace(id="store-1", org_id="org-1")

        created_row = SimpleNamespace(
            id="action-1",
            org_id="org-1",
            store_id="store-1",
            store=SimpleNamespace(name="Loja 1"),
            camera_id=None,
            camera=None,
            issue_code="high_glare",
            recommended_action="Ajustar camera 15 graus",
            owner_role="store_manager",
            status="open",
            priority="high",
            source="admin",
            assigned_to_user_uuid=None,
            created_by_user_uuid=None,
            sla_due_at=None,
            metadata={},
            notes=None,
            created_at=None,
            updated_at=None,
        )
        actions_objects_mock.create.return_value = created_row
        actions_objects_mock.select_related.return_value.filter.return_value.first.return_value = created_row

        request = self.factory.post(
            "/api/v1/calibration/actions/",
            {
                "store_id": "store-1",
                "issue_code": "high_glare",
                "recommended_action": "Ajustar camera 15 graus",
                "priority": "high",
            },
            format="json",
        )
        force_authenticate(request, user=admin_user)
        response = self.view(request)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["issue_code"], "high_glare")
        self.assertEqual(response.data["priority"], "high")


class CalibrationActionStatusViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CalibrationActionStatusView.as_view()
        self.user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)

    @patch("apps.core.views_calibration.CalibrationAction.objects")
    def test_patch_rejects_invalid_status(self, action_objects_mock):
        row = MagicMock()
        row.org_id = "org-1"
        action_objects_mock.select_related.return_value.filter.return_value.first.return_value = row

        request = self.factory.patch(
            "/api/v1/calibration/actions/00000000-0000-0000-0000-000000000001/",
            {"status": "invalid"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, action_id="00000000-0000-0000-0000-000000000001")
        self.assertEqual(response.status_code, 400)


class CalibrationActionEvidenceCreateViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CalibrationActionEvidenceCreateView.as_view()
        self.user = SimpleNamespace(is_authenticated=True, is_staff=True, is_superuser=False, id=1)

    @patch("apps.core.views_calibration.CalibrationEvidence.objects")
    @patch("apps.core.views_calibration.CalibrationAction.objects")
    def test_evidence_creation_moves_open_action_to_in_progress(
        self,
        action_objects_mock,
        evidence_objects_mock,
    ):
        action = MagicMock()
        action.id = "00000000-0000-0000-0000-000000000001"
        action.org_id = "org-1"
        action.status = "open"
        action_objects_mock.filter.return_value.first.return_value = action

        evidence_row = SimpleNamespace(
            id="evidence-1",
            action_id=action.id,
            snapshot_before_url="https://before.png",
            snapshot_after_url=None,
            clip_before_url=None,
            clip_after_url=None,
            captured_at=None,
            captured_by_user_uuid=None,
            notes=None,
            metadata={},
        )
        evidence_objects_mock.create.return_value = evidence_row

        request = self.factory.post(
            "/api/v1/calibration/actions/00000000-0000-0000-0000-000000000001/evidence/",
            {"snapshot_before_url": "https://before.png"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, action_id="00000000-0000-0000-0000-000000000001")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(action.status, "in_progress")
        action.save.assert_called_once()
