from io import StringIO
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.test import SimpleTestCase
from django.utils import timezone

from apps.copilot.management.commands.copilot_operational_window_tick import Command


class CopilotOperationalWindowTickCommandTests(SimpleTestCase):
    @patch("apps.copilot.management.commands.copilot_operational_window_tick.materialize_operational_window")
    @patch("apps.copilot.management.commands.copilot_operational_window_tick.Store.objects.order_by")
    def test_runs_batch_with_default_window(
        self,
        mock_order_by,
        mock_materialize,
    ):
        store = SimpleNamespace(id=uuid4())
        mock_order_by.return_value.__getitem__.return_value = [store]
        mock_materialize.return_value = SimpleNamespace(
            ts_bucket=timezone.now().replace(second=0, microsecond=0),
            window_minutes=5,
            confidence_score=82,
        )

        cmd = Command()
        out = StringIO()
        cmd.stdout = out
        cmd.handle(store_id=None, max_stores=10, window_minutes=5)

        output = out.getvalue()
        assert "copilot_operational_window_tick concluído" in output
        assert "materializadas=1" in output
        mock_materialize.assert_called_once()
