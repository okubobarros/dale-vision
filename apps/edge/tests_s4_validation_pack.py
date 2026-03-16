import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

from django.core.management import call_command
from django.test import SimpleTestCase
from django.utils import timezone


class EdgeS4ValidationPackCommandTests(SimpleTestCase):
    @patch("apps.edge.management.commands.edge_s4_validation_pack.EdgeUpdateEvent.objects.filter")
    def test_command_generates_summary_with_rates_and_decision(self, mock_filter):
        now = timezone.now()
        rows = [
            {
                "id": "1",
                "store_id": "store-a",
                "agent_id": "edge-1",
                "from_version": "1.4.0",
                "to_version": "1.5.0",
                "channel": "canary",
                "status": "healthy",
                "phase": "health_check",
                "event": "edge_update_healthy",
                "attempt": 1,
                "reason_code": None,
                "reason_detail": None,
                "timestamp": now,
            },
            {
                "id": "2",
                "store_id": "store-b",
                "agent_id": "edge-2",
                "from_version": "1.5.0",
                "to_version": "1.6.0",
                "channel": "canary",
                "status": "failed",
                "phase": "health_check",
                "event": "edge_update_failed",
                "attempt": 1,
                "reason_code": "NETWORK_ERROR",
                "reason_detail": "timeout",
                "timestamp": now,
            },
        ]

        qs = MagicMock()
        qs.filter.return_value = qs
        ordered = MagicMock()
        ordered.values.return_value = rows
        qs.order_by.return_value = ordered
        mock_filter.return_value = qs

        with tempfile.TemporaryDirectory() as tmpdir:
            output_md = Path(tmpdir) / "pack.md"
            output_json = Path(tmpdir) / "pack.json"
            call_command(
                "edge_s4_validation_pack",
                "--hours",
                "24",
                "--channel",
                "canary",
                "--output",
                str(output_md),
                "--json-output",
                str(output_json),
            )

            payload = json.loads(output_json.read_text(encoding="utf-8"))
            summary = payload["summary"]
            self.assertEqual(summary["attempts_total"], 2)
            self.assertEqual(summary["healthy_attempts"], 1)
            self.assertEqual(summary["failed_attempts"], 1)
            self.assertEqual(summary["decision"], "GO")
            self.assertEqual(summary["success_rate_pct"], 50.0)
            self.assertEqual(summary["failure_rate_pct"], 50.0)

            markdown = output_md.read_text(encoding="utf-8")
            self.assertIn("success_rate_pct", markdown)
            self.assertIn("final_status", markdown)

