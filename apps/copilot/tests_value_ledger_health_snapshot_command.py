import json
from datetime import timedelta
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from django.utils import timezone

from apps.copilot.management.commands.copilot_value_ledger_health_snapshot import Command


class CopilotValueLedgerHealthSnapshotCommandTests(SimpleTestCase):
    @patch("apps.copilot.management.commands.copilot_value_ledger_health_snapshot.ValueLedgerDaily.objects.filter")
    @patch("apps.copilot.management.commands.copilot_value_ledger_health_snapshot.Store.objects.order_by")
    def test_generates_snapshot_with_health_counts_and_json(
        self,
        mock_order_by,
        mock_filter,
    ):
        now = timezone.now()
        store_healthy = SimpleNamespace(id=uuid4(), name="Loja A")
        store_stale = SimpleNamespace(id=uuid4(), name="Loja B")
        store_no_data = SimpleNamespace(id=uuid4(), name="Loja C")
        mock_order_by.return_value.__getitem__.return_value = [store_healthy, store_stale, store_no_data]

        qs_healthy = MagicMock()
        qs_healthy.order_by.return_value = qs_healthy
        qs_healthy.first.return_value = SimpleNamespace(updated_at=now - timedelta(minutes=5))
        qs_healthy.aggregate.return_value = {
            "value_recovered": 200.0,
            "value_at_risk": 300.0,
            "actions_dispatched": 4,
            "actions_completed": 3,
            "confidence_avg": 81.0,
        }

        qs_stale = MagicMock()
        qs_stale.order_by.return_value = qs_stale
        qs_stale.first.return_value = SimpleNamespace(updated_at=now - timedelta(minutes=30))
        qs_stale.aggregate.return_value = {
            "value_recovered": 150.0,
            "value_at_risk": 500.0,
            "actions_dispatched": 5,
            "actions_completed": 2,
            "confidence_avg": 74.0,
        }

        qs_no_data = MagicMock()
        qs_no_data.order_by.return_value = qs_no_data
        qs_no_data.first.return_value = None
        qs_no_data.aggregate.return_value = {
            "value_recovered": 0.0,
            "value_at_risk": 0.0,
            "actions_dispatched": 0,
            "actions_completed": 0,
            "confidence_avg": 0.0,
        }

        mock_filter.side_effect = [qs_healthy, qs_stale, qs_no_data]

        cmd = Command()
        out = StringIO()
        cmd.stdout = out

        with TemporaryDirectory() as tmpdir:
            output_file = Path(tmpdir) / "ledger_snapshot.json"
            cmd.handle(
                store_id=None,
                days=7,
                max_stores=10,
                slo_target_seconds=900,
                json_output=str(output_file),
            )
            payload = json.loads(output_file.read_text(encoding="utf-8"))

        output = out.getvalue()
        self.assertIn("copilot_value_ledger_health_snapshot concluído", output)
        self.assertIn("healthy=1", output)
        self.assertIn("stale=1", output)
        self.assertIn("no_data=1", output)
        self.assertEqual(payload["stores_total"], 3)
        self.assertEqual(payload["stores_with_ledger"], 2)
        self.assertEqual(payload["coverage_rate"], 67)
        self.assertEqual(payload["counts"]["healthy"], 1)
        self.assertEqual(payload["counts"]["stale"], 1)
        self.assertEqual(payload["counts"]["no_data"], 1)
        self.assertEqual(len(payload["items"]), 3)
