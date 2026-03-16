from datetime import timedelta
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from django.utils import timezone

from apps.copilot.management.commands.copilot_value_ledger_acceptance_report import Command


class CopilotValueLedgerAcceptanceReportCommandTests(SimpleTestCase):
    @patch("apps.copilot.management.commands.copilot_value_ledger_acceptance_report.ValueLedgerDaily.objects.filter")
    @patch("apps.copilot.management.commands.copilot_value_ledger_acceptance_report.Store.objects.order_by")
    def test_generates_markdown_with_go_decision(
        self,
        mock_order_by,
        mock_filter,
    ):
        now = timezone.now()
        store_a = SimpleNamespace(id=uuid4(), name="Loja A")
        store_b = SimpleNamespace(id=uuid4(), name="Loja B")
        mock_order_by.return_value.__getitem__.return_value = [store_a, store_b]

        qs_a = MagicMock()
        qs_a.order_by.return_value = qs_a
        qs_a.first.return_value = SimpleNamespace(updated_at=now - timedelta(minutes=5))
        qs_a.aggregate.return_value = {
            "value_recovered": 350.0,
            "value_at_risk": 500.0,
            "actions_dispatched": 6,
            "actions_completed": 5,
            "confidence_avg": 84.0,
        }

        qs_b = MagicMock()
        qs_b.order_by.return_value = qs_b
        qs_b.first.return_value = SimpleNamespace(updated_at=now - timedelta(minutes=10))
        qs_b.aggregate.return_value = {
            "value_recovered": 200.0,
            "value_at_risk": 250.0,
            "actions_dispatched": 4,
            "actions_completed": 3,
            "confidence_avg": 79.0,
        }

        mock_filter.side_effect = [qs_a, qs_b]

        cmd = Command()
        out = StringIO()
        cmd.stdout = out

        with TemporaryDirectory() as tmpdir:
            output_file = Path(tmpdir) / "acceptance.md"
            cmd.handle(
                days=7,
                max_stores=10,
                slo_target_seconds=900,
                coverage_min=80,
                stale_rate_max=20,
                no_data_rate_max=20,
                output=str(output_file),
            )
            content = output_file.read_text(encoding="utf-8")

        self.assertIn("Status: `GO`", content)
        self.assertIn("Top 5 lojas por saldo em risco", content)
        self.assertIn("Loja A", content)
        self.assertIn("Loja B", content)
        self.assertIn("copilot_value_ledger_acceptance_report concluído", out.getvalue())
