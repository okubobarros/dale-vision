from types import SimpleNamespace
from contextlib import nullcontext
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.copilot.views import CopilotStaffPlanActionView


class CopilotStaffPlanActionViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotStaffPlanActionView.as_view()

    @patch("apps.copilot.views.CopilotMessage.objects.create")
    @patch("apps.copilot.views.CopilotConversation.objects.get_or_create")
    @patch("apps.copilot.views.transaction.atomic", return_value=nullcontext())
    @patch("apps.copilot.views.ensure_user_uuid")
    @patch("apps.copilot.views.require_store_role")
    @patch("apps.copilot.views._get_store_or_404")
    def test_updates_staff_planned_week_and_logs_conversation(
        self,
        mock_get_store,
        _mock_require_role,
        mock_ensure_uuid,
        _mock_atomic,
        mock_get_or_create,
        mock_message_create,
    ):
        store_id = uuid4()
        store = SimpleNamespace(
            id=store_id,
            org_id=uuid4(),
            name="Loja Teste",
            employees_count=4,
            updated_at=None,
            save=MagicMock(),
        )
        mock_get_store.return_value = (store, None)
        mock_ensure_uuid.return_value = uuid4()
        conversation = SimpleNamespace(updated_at=None, save=MagicMock())
        mock_get_or_create.return_value = (conversation, True)

        request = self.factory.post(
            f"/api/v1/copilot/stores/{store_id}/actions/staff-plan/",
            {"staff_planned_week": 7, "reason": "Escala reforcada"},
            format="json",
        )
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=123))

        response = self.view(request, store_id=store_id)
        assert response.status_code == 200
        assert response.data["ok"] is True
        assert response.data["previous_staff_planned_week"] == 4
        assert response.data["staff_planned_week"] == 7
        assert response.data["method"]["version"] == "copilot_staff_plan_update_v1_2026-03-13"
        assert store.employees_count == 7
        assert mock_message_create.call_count == 2
