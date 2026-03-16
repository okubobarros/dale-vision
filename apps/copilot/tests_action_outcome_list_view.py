from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.copilot.views import CopilotActionOutcomeView


class CopilotActionOutcomeViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotActionOutcomeView.as_view()

    @patch("apps.copilot.views.CopilotActionOutcomeSerializer")
    @patch("apps.copilot.views.require_store_role")
    @patch("apps.copilot.views.ActionOutcome.objects.filter")
    @patch("apps.copilot.views._get_store_or_404")
    def test_get_returns_summary_with_completion_and_recovery_rates(
        self,
        mock_get_store,
        mock_filter,
        _mock_require_role,
        mock_serializer_cls,
    ):
        store_id = uuid4()
        store = SimpleNamespace(id=store_id, org_id=uuid4())
        mock_get_store.return_value = (store, None)

        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.aggregate.return_value = {
            "dispatched": 10,
            "completed": 4,
            "expected": 2000.0,
            "realized": 500.0,
            "confidence_avg": 72.0,
        }
        qs.__getitem__.return_value = [SimpleNamespace()]
        mock_filter.return_value = qs

        serializer = MagicMock()
        serializer.data = [{"id": str(uuid4())}]
        mock_serializer_cls.return_value = serializer

        request = self.factory.get(f"/api/v1/copilot/stores/{store_id}/actions/outcomes/?limit=10")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))
        response = self.view(request, store_id=store_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["actions_dispatched"], 10)
        self.assertEqual(response.data["summary"]["actions_completed"], 4)
        self.assertEqual(response.data["summary"]["completion_rate"], 40.0)
        self.assertEqual(response.data["summary"]["recovery_rate"], 25.0)
