from datetime import timedelta
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from django.utils import timezone

from apps.copilot.management.commands.copilot_sprint2_evidence_pack import Command


class CopilotSprint2EvidencePackCommandTests(SimpleTestCase):
    @patch("apps.copilot.management.commands.copilot_sprint2_evidence_pack.ValueLedgerDaily.objects.filter")
    @patch("apps.copilot.management.commands.copilot_sprint2_evidence_pack.Store.objects.order_by")
    def test_generates_evidence_pack_markdown(self, mock_order_by, mock_filter):
        now = timezone.now()
        store = SimpleNamespace(id=uuid4(), name="Loja Norte")
        mock_order_by.return_value.__getitem__.return_value = [store]

        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.first.return_value = SimpleNamespace(updated_at=now - timedelta(minutes=4))
        qs.aggregate.return_value = {
            "value_recovered": 500.0,
            "value_at_risk": 700.0,
            "actions_dispatched": 10,
            "actions_completed": 8,
            "confidence_avg": 82.0,
        }
        mock_filter.return_value = qs

        cmd = Command()
        out = StringIO()
        cmd.stdout = out

        with TemporaryDirectory() as tmpdir:
            output_file = Path(tmpdir) / "evidence_pack.md"
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

        self.assertIn("Sprint 2 Evidence Pack", content)
        self.assertIn("Checklist Final", content)
        self.assertIn("KPIs de Aceite", content)
        self.assertIn("Loja Norte", content)
        self.assertIn("Status: `GO`", content)
        self.assertIn("copilot_sprint2_evidence_pack concluido", out.getvalue())
