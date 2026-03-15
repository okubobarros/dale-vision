from io import StringIO
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.copilot.management.commands.copilot_operational_window_cleanup import Command


class CopilotOperationalWindowCleanupCommandTests(SimpleTestCase):
    @patch("apps.copilot.management.commands.copilot_operational_window_cleanup.OperationalWindowHourly")
    def test_dry_run_reports_without_deleting(self, mock_model):
        queryset = MagicMock()
        queryset.filter.return_value = queryset
        queryset.count.return_value = 12
        mock_model.objects.filter.return_value = queryset

        cmd = Command()
        out = StringIO()
        cmd.stdout = out
        cmd.handle(retention_days=30, store_id=None, window_minutes=None, dry_run=True)

        output = out.getvalue()
        assert "dry-run" in output
        assert "would_delete=12" in output
        queryset.delete.assert_not_called()

    @patch("apps.copilot.management.commands.copilot_operational_window_cleanup.OperationalWindowHourly")
    def test_delete_executes_and_reports_count(self, mock_model):
        queryset = MagicMock()
        queryset.filter.return_value = queryset
        queryset.count.return_value = 7
        queryset.delete.return_value = (7, {"apps.copilot.OperationalWindowHourly": 7})
        mock_model.objects.filter.return_value = queryset

        cmd = Command()
        out = StringIO()
        cmd.stdout = out
        cmd.handle(retention_days=14, store_id=None, window_minutes=None, dry_run=False)

        output = out.getvalue()
        assert "concluído" in output
        assert "deleted=7" in output
        queryset.delete.assert_called_once()
