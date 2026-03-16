from datetime import timedelta
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from django.utils import timezone

from apps.copilot.management.commands.copilot_daily_log_entry import Command


class CopilotDailyLogEntryCommandTests(SimpleTestCase):
    @patch("apps.copilot.management.commands.copilot_daily_log_entry.ValueLedgerDaily.objects.filter")
    @patch("apps.copilot.management.commands.copilot_daily_log_entry.Store.objects.order_by")
    def test_generates_entry_and_append_is_idempotent(self, mock_order_by, mock_filter):
        now = timezone.now()
        store = SimpleNamespace(id=uuid4(), name="Loja Centro")
        mock_order_by.return_value.__getitem__.return_value = [store]

        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.first.return_value = SimpleNamespace(updated_at=now - timedelta(minutes=5))
        qs.aggregate.return_value = {
            "value_recovered": 100.0,
            "value_at_risk": 150.0,
            "actions_dispatched": 4,
            "actions_completed": 3,
        }
        mock_filter.return_value = qs

        cmd = Command()
        out = StringIO()
        cmd.stdout = out

        with TemporaryDirectory() as tmpdir:
            output_file = Path(tmpdir) / "entry.md"
            daily_log_file = Path(tmpdir) / "Daily_Log.md"
            cmd.handle(
                days=7,
                max_stores=10,
                slo_target_seconds=900,
                coverage_min=80,
                stale_rate_max=20,
                no_data_rate_max=20,
                output=str(output_file),
                append_to=str(daily_log_file),
            )
            first_content = daily_log_file.read_text(encoding="utf-8")

            cmd.handle(
                days=7,
                max_stores=10,
                slo_target_seconds=900,
                coverage_min=80,
                stale_rate_max=20,
                no_data_rate_max=20,
                output=str(output_file),
                append_to=str(daily_log_file),
            )
            second_content = daily_log_file.read_text(encoding="utf-8")

        self.assertIn("Sprint 2 acceptance automático", first_content)
        self.assertEqual(first_content, second_content)
        self.assertIn("copilot_daily_log_entry concluido", out.getvalue())
