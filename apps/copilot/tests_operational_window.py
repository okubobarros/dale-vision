from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from django.utils import timezone

from apps.copilot.services import (
    build_operational_window_payload,
    materialize_operational_window,
)


class CopilotOperationalWindowTests(SimpleTestCase):
    @patch("apps.copilot.services.resolve_coverage_state")
    @patch("apps.copilot.services._safe_scalar")
    @patch("apps.copilot.services.StoreProfile.objects.filter")
    def test_build_operational_window_defaults_to_5_minutes_and_sets_statuses(
        self,
        mock_profile_filter,
        mock_safe_scalar,
        mock_coverage,
    ):
        store = SimpleNamespace(id=uuid4(), org_id=uuid4(), employees_count=3)
        mock_profile_filter.return_value.first.return_value = SimpleNamespace(
            business_model="gelateria",
            has_salao=True,
            has_pos_integration=False,
            defaults_json={"staff_planned_shift": 4, "ticket_medio_brl": 30},
        )
        mock_coverage.return_value = SimpleNamespace(cameras_total=4, cameras_online=3, edge_online=True)
        mock_safe_scalar.side_effect = [
            40,   # footfall
            360,  # queue_avg_seconds
            2,    # staff_detected_avg
            8,    # checkout_proxy_events
            1,    # critical_alerts
            25,   # vision_events_count
        ]

        payload = build_operational_window_payload(store, window_minutes=5, now=timezone.now())
        assert payload["window_minutes"] == 5
        assert payload["metrics_json"]["coverage_gap"] == 2
        assert payload["metric_status_json"]["footfall"] == "official"
        assert payload["metric_status_json"]["revenue_risk_estimated"] == "estimated"
        assert payload["source_flags_json"]["method_version"] == "operational_window_v1_2026-03-14"
        assert payload["confidence_score"] >= 0

    @patch("apps.copilot.services.OperationalWindowHourly.objects.update_or_create")
    @patch("apps.copilot.services.build_operational_window_payload")
    @patch("apps.copilot.services.Store.objects.filter")
    def test_materialize_operational_window_upserts_window(
        self,
        mock_store_filter,
        mock_build_payload,
        mock_update_or_create,
    ):
        store = SimpleNamespace(id=uuid4(), org_id=uuid4())
        ts_bucket = timezone.now().replace(second=0, microsecond=0)
        mock_store_filter.return_value.first.return_value = store
        mock_build_payload.return_value = {
            "ts_bucket": ts_bucket,
            "window_minutes": 5,
            "metrics_json": {"footfall": 10},
            "metric_status_json": {"footfall": "official"},
            "source_flags_json": {"method_version": "operational_window_v1_2026-03-14"},
            "confidence_score": 88,
            "confidence_breakdown_json": {"camera_ratio": 1.0},
        }
        row = SimpleNamespace(id=uuid4(), ts_bucket=ts_bucket, window_minutes=5, confidence_score=88)
        mock_update_or_create.return_value = (row, True)

        result = materialize_operational_window(store.id, window_minutes=5)
        assert result is row
        assert mock_update_or_create.called

