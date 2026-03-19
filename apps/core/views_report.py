from datetime import datetime, timedelta
from io import BytesIO, StringIO
import csv
from zoneinfo import ZoneInfo
from bisect import bisect_left
from collections import defaultdict

from django.conf import settings
from django.db import connection
from django.utils import timezone
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Count, Q
from apps.core.models import Store, DetectionEvent, Organization
from apps.edge.models import EdgeUpdateEvent
from apps.copilot.models import ActionOutcome
from apps.stores.services.user_orgs import get_user_org_ids


def _get_org_timezone(org_id: str | None):
    if not org_id:
        return timezone.get_current_timezone()
    tz_name = None
    try:
        row = Organization.objects.filter(id=org_id).values("timezone").first()
        tz_name = row.get("timezone") if row else None
    except Exception:
        tz_name = None
    tz_name = tz_name or settings.TIME_ZONE
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return timezone.get_current_timezone()


def _parse_date_range(request, tz):
    period = request.query_params.get("period") or "7d"
    raw_from = request.query_params.get("from")
    raw_to = request.query_params.get("to")

    end = timezone.localtime(timezone.now(), tz)

    def _parse_value(raw: str, default_time: str):
        if not raw:
            return None
        try:
            if "T" in raw:
                dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            else:
                dt = datetime.fromisoformat(f"{raw}T{default_time}")
        except Exception:
            return None
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, tz)
        return timezone.localtime(dt, tz)

    if raw_from or raw_to:
        start = _parse_value(raw_from, "00:00:00") or (end - timedelta(days=7))
        end_value = _parse_value(raw_to, "23:59:59") or end
        if end_value < start:
            start, end_value = end_value, start
        return start, end_value, "custom"

    days = 7
    try:
        if period.endswith("d"):
            days = int(period[:-1])
    except Exception:
        days = 7
    days = max(1, min(days, 365))
    start = end - timedelta(days=days)
    return start, end, f"{days}d"


def _build_report_payload(*, org_id: str, store_id: str | None, start, end):
    store_ids = list(Store.objects.filter(org_id=org_id).values_list("id", flat=True))
    if store_id:
        store_ids = [sid for sid in store_ids if str(sid) == str(store_id)]

    traffic_series = []
    conversion_series = []
    totals = {
        "total_visitors": 0,
        "avg_dwell_seconds": 0,
        "avg_queue_seconds": 0,
        "avg_conversion_rate": 0,
    }
    alert_counts = []
    chart_footfall_by_hour = []

    if store_ids:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT date_trunc('day', ts_bucket) AS bucket,
                       COALESCE(SUM(footfall), 0) AS footfall,
                       COALESCE(AVG(NULLIF(dwell_seconds_avg, 0)), 0) AS dwell_avg
                FROM public.traffic_metrics
                WHERE store_id = ANY(%s)
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                  AND (camera_role = 'entrada' OR camera_role IS NULL)
                  AND (ownership = 'primary' OR ownership IS NULL)
                GROUP BY 1
                ORDER BY 1 ASC
                """,
                [store_ids, start, end],
            )
            for row in cursor.fetchall():
                traffic_series.append(
                    {
                        "ts_bucket": row[0].isoformat(),
                        "footfall": int(row[1] or 0),
                        "dwell_seconds_avg": int(row[2] or 0),
                    }
                )

            cursor.execute(
                """
                WITH traffic AS (
                    SELECT date_trunc('day', ts_bucket) AS bucket,
                           COALESCE(SUM(footfall), 0) AS footfall
                    FROM public.traffic_metrics
                    WHERE store_id = ANY(%s)
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                ),
                conversion AS (
                    SELECT date_trunc('day', ts_bucket) AS bucket,
                           COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                           COALESCE(SUM(checkout_events), 0) AS checkout_events
                    FROM public.conversion_metrics
                    WHERE store_id = ANY(%s)
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                )
                SELECT COALESCE(conversion.bucket, traffic.bucket) AS bucket,
                       COALESCE(conversion.queue_avg_seconds, 0) AS queue_avg_seconds,
                       CASE
                           WHEN COALESCE(traffic.footfall, 0) > 0
                           THEN ROUND((COALESCE(conversion.checkout_events, 0)::numeric / traffic.footfall::numeric) * 100, 2)
                           ELSE 0
                       END AS conversion_rate
                FROM conversion
                FULL OUTER JOIN traffic ON traffic.bucket = conversion.bucket
                ORDER BY 1 ASC
                """,
                [store_ids, start, end, store_ids, start, end],
            )
            for row in cursor.fetchall():
                conversion_series.append(
                    {
                        "ts_bucket": row[0].isoformat(),
                        "queue_avg_seconds": int(row[1] or 0),
                        "conversion_rate": float(row[2] or 0),
                    }
                )

            cursor.execute(
                """
                SELECT COALESCE(SUM(footfall), 0) AS total_visitors,
                       COALESCE(AVG(NULLIF(dwell_seconds_avg, 0)), 0) AS avg_dwell_seconds
                FROM public.traffic_metrics
                WHERE store_id = ANY(%s)
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                  AND (camera_role = 'entrada' OR camera_role IS NULL)
                  AND (ownership = 'primary' OR ownership IS NULL)
                """,
                [store_ids, start, end],
            )
            row = cursor.fetchone()
            if row:
                totals["total_visitors"] = int(row[0] or 0)
                totals["avg_dwell_seconds"] = int(row[1] or 0)

            cursor.execute(
                """
                WITH traffic AS (
                    SELECT store_id, ts_bucket,
                           COALESCE(SUM(footfall), 0) AS footfall
                    FROM public.traffic_metrics
                    WHERE store_id = ANY(%s)
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1, 2
                ),
                conversion AS (
                    SELECT store_id, ts_bucket,
                           COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                           COALESCE(SUM(checkout_events), 0) AS checkout_events
                    FROM public.conversion_metrics
                    WHERE store_id = ANY(%s)
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1, 2
                )
                SELECT COALESCE(AVG(conversion.queue_avg_seconds), 0) AS avg_queue_seconds,
                       COALESCE(
                           AVG(
                               CASE
                                   WHEN COALESCE(traffic.footfall, 0) > 0
                                   THEN (COALESCE(conversion.checkout_events, 0)::numeric / traffic.footfall::numeric) * 100
                                   ELSE 0
                               END
                           ),
                           0
                       ) AS avg_conversion_rate
                FROM conversion
                LEFT JOIN traffic
                  ON traffic.store_id = conversion.store_id
                 AND traffic.ts_bucket = conversion.ts_bucket
                """,
                [store_ids, start, end, store_ids, start, end],
            )
            row = cursor.fetchone()
            if row:
                totals["avg_queue_seconds"] = int(row[0] or 0)
                totals["avg_conversion_rate"] = float(row[1] or 0)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT date_part('hour', ts_bucket)::int AS hour,
                       COALESCE(SUM(footfall), 0) AS footfall
                FROM public.traffic_metrics
                WHERE store_id = ANY(%s)
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                  AND (camera_role = 'entrada' OR camera_role IS NULL)
                  AND (ownership = 'primary' OR ownership IS NULL)
                GROUP BY 1
                ORDER BY 1 ASC
                """,
                [store_ids, start, end],
            )
            for row in cursor.fetchall():
                chart_footfall_by_hour.append(
                    {
                        "hour": int(row[0]),
                        "footfall": int(row[1] or 0),
                    }
                )

    alerts = []
    if store_ids:
        events = (
            DetectionEvent.objects.filter(store_id__in=store_ids)
            .order_by("-occurred_at")
            .values("id", "title", "severity", "status", "occurred_at")
        )[:10]
        alerts = [
            {
                "id": str(row["id"]),
                "title": row.get("title"),
                "severity": row.get("severity"),
                "status": row.get("status"),
                "occurred_at": row["occurred_at"].isoformat() if row.get("occurred_at") else None,
            }
            for row in events
        ]

        type_counts = (
            DetectionEvent.objects.filter(store_id__in=store_ids)
            .values("type")
            .annotate(total=Count("id"))
            .order_by("-total")
        )
        alert_counts = [
            {"type": row.get("type") or "unknown", "count": int(row.get("total") or 0)}
            for row in type_counts
        ][:5]

    incident_response = {
        "method": {
            "id": "edge_incident_response",
            "version": "edge_incident_response_v1_2026-03-16",
            "label": "Resposta a incidentes de update",
            "description": "Mede falhas de update, abertura de runbook e tempo de resposta operacional.",
        },
        "targets": {
            "runbook_coverage_rate_min": 90.0,
            "time_to_runbook_seconds_max": 600,
        },
        "failures_total": 0,
        "rollbacks_total": 0,
        "runbook_opened_total": 0,
        "failures_with_runbook": 0,
        "runbook_coverage_rate": 0.0,
        "avg_time_to_runbook_seconds": None,
        "latest_failure_at": None,
        "latest_runbook_opened_at": None,
        "target_status": {
            "runbook_coverage": "no_data",
            "time_to_runbook": "no_data",
            "overall": "no_data",
        },
    }
    action_execution = {
        "method": {
            "id": "action_execution",
            "version": "action_execution_v1_2026-03-16",
            "label": "Execução de ações por origem",
            "description": "Mede volume e conclusão de ações despachadas por superfície de decisão.",
        },
        "actions_dispatched_total": 0,
        "actions_completed_total": 0,
        "actions_failed_total": 0,
        "completion_rate": 0.0,
        "failure_rate": 0.0,
        "sources": {
            "dashboard": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
            "reports": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
            "operations": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
            "other": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
        },
        "rollout": {
            "dispatched": 0,
            "completed": 0,
            "failed": 0,
            "completion_rate": 0.0,
            "failure_rate": 0.0,
        },
        "top_source": None,
    }
    if store_ids:
        failures_qs = (
            EdgeUpdateEvent.objects.filter(
                store_id__in=store_ids,
                timestamp__gte=start,
                timestamp__lt=end,
                status__in=["failed", "rolled_back"],
            )
            .values("store_id", "timestamp", "status")
            .order_by("store_id", "timestamp")
        )
        runbooks_qs = (
            EdgeUpdateEvent.objects.filter(
                store_id__in=store_ids,
                timestamp__gte=start,
                timestamp__lt=end,
                event="runbook_opened",
            )
            .values("store_id", "timestamp")
            .order_by("store_id", "timestamp")
        )

        failures = list(failures_qs)
        runbooks = list(runbooks_qs)
        runbooks_by_store = defaultdict(list)
        for item in runbooks:
            runbooks_by_store[str(item["store_id"])].append(item["timestamp"])

        deltas = []
        failures_with_runbook = 0
        for failure in failures:
            store_key = str(failure["store_id"])
            failure_ts = failure["timestamp"]
            choices = runbooks_by_store.get(store_key) or []
            if not choices:
                continue
            idx = bisect_left(choices, failure_ts)
            if idx >= len(choices):
                continue
            runbook_ts = choices[idx]
            failures_with_runbook += 1
            delta_seconds = int((runbook_ts - failure_ts).total_seconds())
            if delta_seconds >= 0:
                deltas.append(delta_seconds)

        failures_total = len(failures)
        rollbacks_total = sum(
            1 for item in failures if str(item.get("status") or "").lower() == "rolled_back"
        )
        runbook_opened_total = len(runbooks)
        runbook_coverage_rate = (
            round((failures_with_runbook / failures_total) * 100, 1) if failures_total > 0 else 0.0
        )
        avg_time_to_runbook_seconds = (
            int(round(sum(deltas) / len(deltas))) if len(deltas) > 0 else None
        )
        latest_failure_at = failures[-1]["timestamp"].isoformat() if failures else None
        latest_runbook_opened_at = runbooks[-1]["timestamp"].isoformat() if runbooks else None

        incident_response = {
            **incident_response,
            "failures_total": failures_total,
            "rollbacks_total": rollbacks_total,
            "runbook_opened_total": runbook_opened_total,
            "failures_with_runbook": failures_with_runbook,
            "runbook_coverage_rate": runbook_coverage_rate,
            "avg_time_to_runbook_seconds": avg_time_to_runbook_seconds,
            "latest_failure_at": latest_failure_at,
            "latest_runbook_opened_at": latest_runbook_opened_at,
        }
        coverage_target = incident_response["targets"]["runbook_coverage_rate_min"]
        ttr_target = incident_response["targets"]["time_to_runbook_seconds_max"]
        coverage_status = (
            "no_data"
            if failures_total == 0
            else ("go" if runbook_coverage_rate >= coverage_target else "no_go")
        )
        ttr_status = (
            "no_data"
            if avg_time_to_runbook_seconds is None
            else ("go" if avg_time_to_runbook_seconds <= ttr_target else "no_go")
        )
        overall_status = (
            "go"
            if coverage_status == "go" and ttr_status in {"go", "no_data"}
            else ("no_data" if coverage_status == "no_data" and ttr_status == "no_data" else "no_go")
        )
        incident_response["target_status"] = {
            "runbook_coverage": coverage_status,
            "time_to_runbook": ttr_status,
            "overall": overall_status,
        }
        action_qs = ActionOutcome.objects.filter(
            store_id__in=store_ids,
            dispatched_at__gte=start,
            dispatched_at__lt=end,
        )
        actions_dispatched_total = action_qs.count()
        actions_completed_total = action_qs.filter(status="completed").count()
        actions_failed_total = action_qs.filter(status="failed").count()
        completion_rate = (
            round((actions_completed_total / actions_dispatched_total) * 100, 1)
            if actions_dispatched_total > 0
            else 0.0
        )
        failure_rate = (
            round((actions_failed_total / actions_dispatched_total) * 100, 1)
            if actions_dispatched_total > 0
            else 0.0
        )

        source_buckets = {
            "dashboard": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
            "reports": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
            "operations": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
            "other": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
        }
        source_rows = (
            action_qs.values("source")
            .annotate(
                dispatched=Count("id"),
                completed=Count("id", filter=Q(status="completed")),
                failed=Count("id", filter=Q(status="failed")),
            )
            .order_by("-dispatched")
        )

        def _source_key(source: str | None) -> str:
            value = str(source or "").lower()
            if value.startswith("dashboard_"):
                return "dashboard"
            if value.startswith("reports_"):
                return "reports"
            if value.startswith("operations_"):
                return "operations"
            if value == "copilot_decision_center":
                return "dashboard"
            return "other"

        for row in source_rows:
            key = _source_key(row.get("source"))
            source_buckets[key]["dispatched"] += int(row.get("dispatched") or 0)
            source_buckets[key]["completed"] += int(row.get("completed") or 0)
            source_buckets[key]["failed"] += int(row.get("failed") or 0)

        for key, item in source_buckets.items():
            dispatched = item["dispatched"]
            completed = item["completed"]
            failed = item["failed"]
            item["completion_rate"] = round((completed / dispatched) * 100, 1) if dispatched > 0 else 0.0
            item["failure_rate"] = round((failed / dispatched) * 100, 1) if dispatched > 0 else 0.0

        rollout_qs = action_qs.filter(action_type="edge_rollout_intervention")
        rollout_dispatched = rollout_qs.count()
        rollout_completed = rollout_qs.filter(status="completed").count()
        rollout_failed = rollout_qs.filter(status="failed").count()
        rollout_completion_rate = (
            round((rollout_completed / rollout_dispatched) * 100, 1)
            if rollout_dispatched > 0
            else 0.0
        )
        rollout_failure_rate = (
            round((rollout_failed / rollout_dispatched) * 100, 1)
            if rollout_dispatched > 0
            else 0.0
        )
        top_source = max(source_buckets.items(), key=lambda item: item[1]["dispatched"])[0] if source_rows else None
        action_execution = {
            **action_execution,
            "actions_dispatched_total": actions_dispatched_total,
            "actions_completed_total": actions_completed_total,
            "actions_failed_total": actions_failed_total,
            "completion_rate": completion_rate,
            "failure_rate": failure_rate,
            "sources": source_buckets,
            "rollout": {
                "dispatched": rollout_dispatched,
                "completed": rollout_completed,
                "failed": rollout_failed,
                "completion_rate": rollout_completion_rate,
                "failure_rate": rollout_failure_rate,
            },
            "top_source": top_source,
        }

    insights = []
    if totals["total_visitors"] == 0:
        insights.append("Nenhum visitante registrado no período.")
    if totals["avg_queue_seconds"] >= 120:
        insights.append("Fila média acima de 2 minutos indica gargalo no atendimento.")
    if totals["avg_dwell_seconds"] >= 300:
        insights.append("Permanência média alta sugere interesse; considere melhorar conversão.")
    if totals["avg_conversion_rate"] <= 0.05 and totals["total_visitors"] > 0:
        insights.append("Conversão baixa: teste reposicionamento de equipe ou promoções.")
    if alert_counts:
        top_alert = alert_counts[0]
        insights.append(
            f"Tipo de alerta mais frequente: {top_alert['type']} ({top_alert['count']} ocorrências)."
        )

    payload = {
        "period": None,
        "from": start.isoformat(),
        "to": end.isoformat(),
        "store_id": store_id,
        "stores_count": len(store_ids),
        "method": {
            "id": "report_summary",
            "version": "report_summary_v1_2026-03-13",
            "label": "Resumo operacional por agregacao",
            "description": "Consolida fluxo, fila, conversao e alertas no periodo selecionado.",
        },
        "confidence_governance": {
            "status": "parcial",
            "score": 72 if totals["total_visitors"] > 0 else 55,
            "source_flags": {
                "total_visitors": "official",
                "avg_dwell_seconds": "official",
                "avg_queue_seconds": "estimated",
                "avg_conversion_rate": "estimated",
                "alerts": "official",
            },
            "caveats": [
                "Conversao e fila sao metricas derivadas por proxy operacional.",
                "Leitura orientada a decisao de operacao, nao a auditoria contabil.",
            ],
        },
        "metric_governance": {
            "kpis": {
                "total_visitors": {
                    "metric_status": "official",
                    "source_method": "traffic_metrics_footfall_sum",
                    "ownership_mode": "single_camera_owner",
                    "label": "Oficial",
                },
                "avg_dwell_seconds": {
                    "metric_status": "estimated",
                    "source_method": "traffic_metrics_dwell_avg",
                    "ownership_mode": "single_camera_owner",
                    "label": "Estimativa",
                },
                "avg_queue_seconds": {
                    "metric_status": "official",
                    "source_method": "conversion_metrics_queue_avg",
                    "ownership_mode": "single_camera_owner",
                    "label": "Oficial",
                },
                "avg_conversion_rate": {
                    "metric_status": "proxy",
                    "source_method": "checkout_events_over_footfall",
                    "ownership_mode": "single_camera_owner",
                    "label": "Proxy",
                },
                "total_alerts": {
                    "metric_status": "official",
                    "source_method": "detection_events_count",
                    "ownership_mode": "single_camera_owner",
                    "label": "Oficial",
                },
            },
            "charts": {
                "chart_footfall_by_day": {
                    "metric_status": "official",
                    "source_method": "traffic_metrics_day_aggregation",
                    "ownership_mode": "single_camera_owner",
                    "label": "Oficial",
                },
                "chart_footfall_by_hour": {
                    "metric_status": "official",
                    "source_method": "traffic_metrics_hour_aggregation",
                    "ownership_mode": "single_camera_owner",
                    "label": "Oficial",
                },
            },
        },
        "kpis": {
            "total_visitors": totals["total_visitors"],
            "avg_dwell_seconds": totals["avg_dwell_seconds"],
            "avg_queue_seconds": totals["avg_queue_seconds"],
            "avg_conversion_rate": totals["avg_conversion_rate"],
            "total_alerts": sum(a["count"] for a in alert_counts) if alert_counts else len(alerts),
        },
        "chart_footfall_by_day": traffic_series,
        "chart_footfall_by_hour": chart_footfall_by_hour,
        "alert_counts_by_type": alert_counts,
        "insights": insights,
        "recent_alerts": alerts,
        "incident_response": incident_response,
        "action_execution": action_execution,
    }
    return payload


def _resolve_segment(*, org_id: str, store_id: str | None) -> str | None:
    if store_id:
        row = Store.objects.filter(id=store_id).values("business_type").first()
        if row and row.get("business_type"):
            return str(row["business_type"]).strip().lower()
    row = Store.objects.filter(org_id=org_id, business_type__isnull=False).values("business_type").first()
    if row and row.get("business_type"):
        return str(row["business_type"]).strip().lower()
    return None


def _resolve_avg_hourly_cost(*, org_id: str, store_id: str | None) -> float:
    default_cost = float(getattr(settings, "DEFAULT_AVG_HOURLY_LABOR_COST", 0) or 0)
    if store_id:
        row = Store.objects.filter(id=store_id).values("avg_hourly_labor_cost").first()
        if row and row.get("avg_hourly_labor_cost") is not None:
            return float(row["avg_hourly_labor_cost"])
    row = (
        Store.objects.filter(org_id=org_id, avg_hourly_labor_cost__isnull=False)
        .values("avg_hourly_labor_cost")
        .first()
    )
    if row and row.get("avg_hourly_labor_cost") is not None:
        return float(row["avg_hourly_labor_cost"])
    return float(default_cost)


def _build_report_impact_payload(*, org_id: str, store_id: str | None, start, end):
    payload = _build_report_payload(
        org_id=org_id,
        store_id=store_id,
        start=start,
        end=end,
    )
    store_ids = list(Store.objects.filter(org_id=org_id).values_list("id", flat=True))
    if store_id:
        store_ids = [sid for sid in store_ids if str(sid) == str(store_id)]

    idle_seconds_total = 0
    queue_wait_seconds_total = 0
    if store_ids:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COALESCE(SUM(
                        GREATEST(
                            0,
                            LEAST(
                                1,
                                CASE
                                    WHEN cm.staff_active_est IS NULL OR cm.staff_active_est <= 0 THEN 0
                                    WHEN tm.footfall IS NULL THEN 0
                                    ELSE 1 - (tm.footfall::float / NULLIF(cm.staff_active_est::float, 0))
                                END
                            )
                        ) * 3600
                    ), 0) AS idle_seconds_total,
                    COALESCE(SUM(
                        COALESCE(cm.queue_avg_seconds, 0) * GREATEST(COALESCE(tm.footfall, 0), 1)
                    ), 0) AS queue_wait_seconds_total
                FROM (
                    SELECT store_id, ts_bucket,
                           COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                           COALESCE(AVG(staff_active_est), 0) AS staff_active_est
                    FROM public.conversion_metrics
                    WHERE store_id = ANY(%s)
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1, 2
                ) cm
                LEFT JOIN (
                    SELECT store_id, ts_bucket,
                           COALESCE(SUM(footfall), 0) AS footfall
                    FROM public.traffic_metrics
                    WHERE store_id = ANY(%s)
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1, 2
                ) tm
                  ON tm.store_id = cm.store_id AND tm.ts_bucket = cm.ts_bucket
                """,
                [store_ids, start, end, store_ids, start, end],
            )
            row = cursor.fetchone() or (0, 0)
            idle_seconds_total = float(row[0] or 0)
            queue_wait_seconds_total = float(row[1] or 0)

    avg_hourly_cost = _resolve_avg_hourly_cost(org_id=org_id, store_id=store_id)
    segment = _resolve_segment(org_id=org_id, store_id=store_id)
    segment_key = (segment or "default").strip().lower()
    abandon_rates = getattr(settings, "TRIAL_QUEUE_ABANDON_RATE_BY_SEGMENT", {})
    abandon_rate = float(abandon_rates.get(segment_key, abandon_rates.get("default", 0.08)))

    idle_cost = (idle_seconds_total / 3600) * avg_hourly_cost
    queue_cost = (queue_wait_seconds_total / 3600) * avg_hourly_cost * abandon_rate

    period_days = max(1, int((end - start).total_seconds() / 86400))
    scale_factor = 30 / period_days
    potential_monthly = (idle_cost + queue_cost) * scale_factor

    payload["impact"] = {
        "idle_seconds_total": round(idle_seconds_total, 2),
        "queue_wait_seconds_total": round(queue_wait_seconds_total, 2),
        "avg_hourly_labor_cost": round(avg_hourly_cost, 2),
        "queue_abandon_rate": round(abandon_rate, 4),
        "cost_idle": round(idle_cost, 2),
        "cost_queue": round(queue_cost, 2),
        "potential_monthly_estimated": round(potential_monthly, 2),
        "currency": "BRL",
        "estimated": True,
        "method": "idle_proxy_from_staff_active_est_and_footfall",
        "method_version": "report_impact_v1_2026-03-13",
    }
    payload["method"] = {
        "id": "report_impact",
        "version": "report_impact_v1_2026-03-13",
        "label": "Impacto operacional estimado",
        "description": "Estima custo potencial de ociosidade e espera com base em proxies operacionais.",
    }
    payload["confidence_governance"] = {
        "status": "parcial",
        "score": 68 if payload["kpis"]["total_visitors"] > 0 else 50,
        "source_flags": {
            "idle_seconds_total": "derived",
            "queue_wait_seconds_total": "estimated",
            "cost_idle": "derived",
            "cost_queue": "derived",
            "potential_monthly_estimated": "derived",
        },
        "caveats": [
            "Impacto financeiro baseado em aproximacao de custo por hora e taxa de abandono.",
            "Nao substitui apuracao financeira oficial.",
        ],
    }
    payload["metric_governance"] = {
        **(payload.get("metric_governance") or {}),
        "impact": {
            "idle_seconds_total": {
                "metric_status": "derived",
                "source_method": "staff_active_vs_footfall_gap_model",
                "ownership_mode": "single_camera_owner",
                "label": "Derivada",
            },
            "queue_wait_seconds_total": {
                "metric_status": "estimated",
                "source_method": "queue_avg_seconds_x_footfall_proxy",
                "ownership_mode": "single_camera_owner",
                "label": "Estimativa",
            },
            "avg_hourly_labor_cost": {
                "metric_status": "manual",
                "source_method": "store_profile_or_default_cost",
                "ownership_mode": "org_config",
                "label": "Manual",
            },
            "queue_abandon_rate": {
                "metric_status": "proxy",
                "source_method": "segment_default_parameter",
                "ownership_mode": "org_config",
                "label": "Proxy",
            },
            "cost_idle": {
                "metric_status": "derived",
                "source_method": "idle_seconds_x_hourly_cost",
                "ownership_mode": "single_camera_owner",
                "label": "Derivada",
            },
            "cost_queue": {
                "metric_status": "derived",
                "source_method": "queue_seconds_x_cost_x_abandon_rate",
                "ownership_mode": "single_camera_owner",
                "label": "Derivada",
            },
            "potential_monthly_estimated": {
                "metric_status": "estimated",
                "source_method": "period_scaled_projection_30d",
                "ownership_mode": "single_camera_owner",
                "label": "Estimativa",
            },
        },
    }
    payload["segment"] = segment or "default"
    payload["features_blocked"] = [
        "Produtividade por funcionário",
        "Alertas configuráveis",
        "Heatmap e benchmarking",
        "Integração PDV",
    ]
    return payload


def _estimate_staff_planned_ref(footfall: int) -> int:
    if footfall >= 55:
        return 4
    if footfall >= 35:
        return 3
    if footfall >= 18:
        return 2
    return 1


def _build_productivity_coverage_payload_legacy(*, org_id: str, store_id: str | None, start, end):
    store_ids = list(Store.objects.filter(org_id=org_id).values_list("id", flat=True))
    if store_id:
        store_ids = [sid for sid in store_ids if str(sid) == str(store_id)]
    manual_staff_ref = None
    if store_id:
        staff_row = Store.objects.filter(id=store_id).values("employees_count").first()
        if staff_row and staff_row.get("employees_count") is not None:
            manual_staff_ref = int(staff_row["employees_count"] or 0)

    windows = []
    if store_ids:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                WITH traffic AS (
                    SELECT date_trunc('hour', ts_bucket) AS hour_bucket,
                           COALESCE(SUM(footfall), 0) AS footfall
                    FROM public.traffic_metrics
                    WHERE store_id = ANY(%s)
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                ),
                conversion AS (
                    SELECT date_trunc('hour', ts_bucket) AS hour_bucket,
                           COALESCE(AVG(staff_active_est), 0) AS staff_active_est
                    FROM public.conversion_metrics
                    WHERE store_id = ANY(%s)
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                )
                SELECT COALESCE(traffic.hour_bucket, conversion.hour_bucket) AS hour_bucket,
                       COALESCE(traffic.footfall, 0) AS footfall,
                       COALESCE(conversion.staff_active_est, 0) AS staff_active_est
                FROM traffic
                FULL OUTER JOIN conversion
                  ON conversion.hour_bucket = traffic.hour_bucket
                ORDER BY 1 ASC
                """,
                [store_ids, start, end, store_ids, start, end],
            )
            for hour_bucket, footfall, staff_active_est in cursor.fetchall():
                footfall_value = int(round(footfall or 0))
                staff_detected_est = int(round(staff_active_est or 0))
                staff_planned_ref = (
                    max(1, manual_staff_ref)
                    if manual_staff_ref and manual_staff_ref > 0
                    else _estimate_staff_planned_ref(footfall_value)
                )
                gap = max(0, staff_planned_ref - staff_detected_est)
                windows.append(
                    {
                        "ts_bucket": hour_bucket.isoformat() if hour_bucket else None,
                        "hour_label": timezone.localtime(hour_bucket).strftime("%H:00")
                        if hour_bucket
                        else None,
                        "footfall": footfall_value,
                        "staff_planned_ref": staff_planned_ref,
                        "staff_detected_est": staff_detected_est,
                        "coverage_gap": gap,
                        "gap_status": "critica" if gap >= 2 else "atencao" if gap == 1 else "adequada",
                        "source_flags": {
                            "footfall": "official",
                            "staff_planned_ref": "manual" if manual_staff_ref and manual_staff_ref > 0 else "proxy",
                            "staff_detected_est": "estimated",
                        },
                    }
                )

    critical_windows = [window for window in windows if int(window["coverage_gap"]) >= 2]
    warning_windows = [window for window in windows if int(window["coverage_gap"]) == 1]
    best_windows = [window for window in windows if int(window["coverage_gap"]) == 0]

    worst_window = None
    best_window = None
    peak_flow_window = None
    opportunity_window = None
    if windows:
        worst_window = max(windows, key=lambda item: int(item["coverage_gap"]))
        best_window = max(best_windows, key=lambda item: int(item["footfall"])) if best_windows else None
        peak_flow_window = max(windows, key=lambda item: int(item["footfall"]))
        opportunity_window = min(windows, key=lambda item: int(item["coverage_gap"]))

    confidence_score = 0
    if windows:
        confidence_score = 45
        if any(int(window["staff_detected_est"]) > 0 for window in windows):
            confidence_score += 20
        if any(int(window["footfall"]) > 0 for window in windows):
            confidence_score += 20
        if best_windows:
            confidence_score += 5
    confidence_score = min(confidence_score, 90)

    payload = {
        "period": None,
        "from": start.isoformat(),
        "to": end.isoformat(),
        "store_id": store_id,
        "stores_count": len(store_ids),
        "method": {
            "id": "coverage_proxy",
            "version": "coverage_proxy_v1_2026-03-13",
            "label": "Cobertura operacional por referência",
            "description": "Compara presença detectada por visão computacional com referência de escala baseada em fluxo.",
        },
        "confidence_governance": {
            "status": "parcial" if windows else "insuficiente",
            "score": confidence_score,
            "source_flags": {
                "footfall": "official",
                "staff_planned_ref": "manual" if manual_staff_ref and manual_staff_ref > 0 else "proxy",
                "staff_detected_est": "estimated",
                "coverage_gap": "derived",
            },
            "caveats": [
                "Escala planejada sem integração ERP/WFM; pode usar referência manual da loja.",
                "Presença real agregada sem identificação nominal.",
                "Leitura adequada para priorização operacional, não para auditoria trabalhista.",
            ],
        },
        "summary": {
            "gaps_total": int(sum(int(window["coverage_gap"]) for window in windows)),
            "critical_windows": len(critical_windows),
            "warning_windows": len(warning_windows),
            "adequate_windows": len(best_windows),
            "worst_window": worst_window,
            "best_window": best_window,
            "peak_flow_window": peak_flow_window,
            "opportunity_window": opportunity_window,
            "planned_source_mode": "manual" if manual_staff_ref and manual_staff_ref > 0 else "proxy",
        },
        "windows": windows,
    }
    return payload


def _build_productivity_coverage_payload_from_operational_windows(
    *,
    org_id: str,
    store_id: str | None,
    start,
    end,
):
    store_ids = list(Store.objects.filter(org_id=org_id).values_list("id", flat=True))
    if store_id:
        store_ids = [sid for sid in store_ids if str(sid) == str(store_id)]

    windows = []
    if store_ids:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    ts_bucket,
                    window_minutes,
                    COALESCE((metrics_json->>'footfall')::int, 0) AS footfall,
                    COALESCE((metrics_json->>'staff_planned')::int, 0) AS staff_planned_ref,
                    COALESCE((metrics_json->>'staff_detected_avg')::numeric, 0) AS staff_detected_est,
                    COALESCE((metrics_json->>'coverage_gap')::int, 0) AS coverage_gap,
                    metric_status_json,
                    confidence_score,
                    source_flags_json
                FROM public.operational_window_hourly
                WHERE store_id = ANY(%s)
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                ORDER BY ts_bucket ASC
                """,
                [store_ids, start, end],
            )
            for row in cursor.fetchall():
                ts_bucket, window_minutes, footfall, staff_planned_ref, staff_detected_est, coverage_gap, metric_status_json, confidence_score, source_flags_json = row
                window_minutes = int(window_minutes or 5)
                windows.append(
                    {
                        "ts_bucket": ts_bucket.isoformat() if ts_bucket else None,
                        "hour_label": timezone.localtime(ts_bucket).strftime("%H:%M") if ts_bucket else None,
                        "window_minutes": window_minutes,
                        "footfall": int(footfall or 0),
                        "staff_planned_ref": int(staff_planned_ref or 0),
                        "staff_detected_est": float(staff_detected_est or 0),
                        "coverage_gap": int(coverage_gap or 0),
                        "gap_status": "critica" if int(coverage_gap or 0) >= 2 else "atencao" if int(coverage_gap or 0) == 1 else "adequada",
                        "source_flags": metric_status_json if isinstance(metric_status_json, dict) else {},
                        "confidence_score": int(confidence_score or 0),
                        "method": {
                            "id": "operational_window",
                            "version": (source_flags_json or {}).get("method_version", "operational_window_v1_2026-03-14")
                            if isinstance(source_flags_json, dict)
                            else "operational_window_v1_2026-03-14",
                        },
                    }
                )

    critical_windows = [window for window in windows if int(window["coverage_gap"]) >= 2]
    warning_windows = [window for window in windows if int(window["coverage_gap"]) == 1]
    best_windows = [window for window in windows if int(window["coverage_gap"]) == 0]

    worst_window = max(windows, key=lambda item: int(item["coverage_gap"])) if windows else None
    best_window = max(best_windows, key=lambda item: int(item["footfall"])) if best_windows else None
    peak_flow_window = max(windows, key=lambda item: int(item["footfall"])) if windows else None
    opportunity_window = min(windows, key=lambda item: int(item["coverage_gap"])) if windows else None

    avg_confidence = 0
    if windows:
        avg_confidence = int(round(sum(int(item.get("confidence_score") or 0) for item in windows) / len(windows)))
    confidence_status = "parcial" if windows else "insuficiente"
    if avg_confidence >= 85:
        confidence_status = "alto"
    elif avg_confidence < 60 and windows:
        confidence_status = "parcial"

    payload = {
        "period": None,
        "from": start.isoformat(),
        "to": end.isoformat(),
        "store_id": store_id,
        "stores_count": len(store_ids),
        "method": {
            "id": "productivity_coverage",
            "version": "coverage_operational_window_v1_2026-03-14",
            "label": "Cobertura operacional por janela de 5 minutos",
            "description": "Compara fluxo e presença detectada contra referência de staff planejado por janela operacional.",
        },
        "confidence_governance": {
            "status": confidence_status,
            "score": avg_confidence,
            "source_flags": {
                "footfall": "official",
                "staff_planned_ref": "proxy",
                "staff_detected_est": "official",
                "coverage_gap": "proxy",
            },
            "caveats": [
                "Escala planejada ainda sem integração ERP/WFM; referência pode ser proxy da loja.",
                "Presença real é agregada por visão computacional sem identificação nominal.",
                "Indicador orientado à decisão operacional executiva.",
            ],
        },
        "summary": {
            "gaps_total": int(sum(int(window["coverage_gap"]) for window in windows)),
            "critical_windows": len(critical_windows),
            "warning_windows": len(warning_windows),
            "adequate_windows": len(best_windows),
            "worst_window": worst_window,
            "best_window": best_window,
            "peak_flow_window": peak_flow_window,
            "opportunity_window": opportunity_window,
            "planned_source_mode": "proxy",
        },
        "windows": windows,
    }
    return payload


def _build_productivity_coverage_payload(*, org_id: str, store_id: str | None, start, end):
    try:
        payload = _build_productivity_coverage_payload_from_operational_windows(
            org_id=org_id,
            store_id=store_id,
            start=start,
            end=end,
        )
        if payload.get("windows"):
            return payload
    except Exception:
        pass
    return _build_productivity_coverage_payload_legacy(
        org_id=org_id,
        store_id=store_id,
        start=start,
        end=end,
    )


class ReportSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_ids = get_user_org_ids(request.user)
        if not org_ids:
            return Response(
                {
                    "period": "7d",
                    "from": None,
                    "to": None,
                    "store_id": None,
                    "stores_count": 0,
                    "method": {
                        "id": "report_summary",
                        "version": "report_summary_v1_2026-03-13",
                        "label": "Resumo operacional por agregacao",
                        "description": "Sem organizacao ativa para calculo.",
                    },
                    "confidence_governance": {
                        "status": "insuficiente",
                        "score": 0,
                        "source_flags": {},
                        "caveats": ["Sem organizacao ativa para calculo do relatorio."],
                    },
                    "kpis": {
                        "total_visitors": 0,
                        "avg_dwell_seconds": 0,
                        "avg_queue_seconds": 0,
                        "avg_conversion_rate": 0,
                        "total_alerts": 0,
                    },
                    "chart_footfall_by_day": [],
                    "chart_footfall_by_hour": [],
                    "alert_counts_by_type": [],
                    "insights": [],
                    "incident_response": {
                        "method": {
                            "id": "edge_incident_response",
                            "version": "edge_incident_response_v1_2026-03-16",
                            "label": "Resposta a incidentes de update",
                            "description": "Sem organizacao ativa para calculo.",
                        },
                        "targets": {
                            "runbook_coverage_rate_min": 90.0,
                            "time_to_runbook_seconds_max": 600,
                        },
                        "failures_total": 0,
                        "rollbacks_total": 0,
                        "runbook_opened_total": 0,
                        "failures_with_runbook": 0,
                        "runbook_coverage_rate": 0.0,
                        "avg_time_to_runbook_seconds": None,
                        "latest_failure_at": None,
                        "latest_runbook_opened_at": None,
                        "target_status": {
                            "runbook_coverage": "no_data",
                            "time_to_runbook": "no_data",
                            "overall": "no_data",
                        },
                    },
                    "action_execution": {
                        "method": {
                            "id": "action_execution",
                            "version": "action_execution_v1_2026-03-16",
                            "label": "Execução de ações por origem",
                            "description": "Sem organização ativa para cálculo.",
                        },
                        "actions_dispatched_total": 0,
                        "actions_completed_total": 0,
                        "actions_failed_total": 0,
                        "completion_rate": 0.0,
                        "failure_rate": 0.0,
                        "sources": {
                            "dashboard": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
                            "reports": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
                            "operations": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
                            "other": {"dispatched": 0, "completed": 0, "failed": 0, "completion_rate": 0.0, "failure_rate": 0.0},
                        },
                        "rollout": {
                            "dispatched": 0,
                            "completed": 0,
                            "failed": 0,
                            "completion_rate": 0.0,
                            "failure_rate": 0.0,
                        },
                        "top_source": None,
                    },
                }
            )

        org_id = str(org_ids[0])
        store_id = request.query_params.get("store_id")
        tz = _get_org_timezone(org_id)
        start, end, period = _parse_date_range(request, tz)

        payload = _build_report_payload(
            org_id=org_id,
            store_id=store_id,
            start=start,
            end=end,
        )
        payload["period"] = period
        return Response(payload)


class ProductivityCoverageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_ids = get_user_org_ids(request.user)
        if not org_ids:
            return Response(
                {
                    "period": "7d",
                    "from": None,
                    "to": None,
                    "store_id": None,
                    "stores_count": 0,
                    "method": {
                        "id": "coverage_proxy",
                        "version": "coverage_proxy_v1_2026-03-13",
                        "label": "Cobertura operacional por referência",
                        "description": "Sem organização ativa para cálculo.",
                    },
                    "confidence_governance": {
                        "status": "insuficiente",
                        "score": 0,
                        "source_flags": {
                            "footfall": "official",
                            "staff_planned_ref": "proxy",
                            "staff_detected_est": "estimated",
                            "coverage_gap": "derived",
                        },
                        "caveats": ["Sem organização ativa para cálculo de cobertura."],
                    },
                    "summary": {
                        "gaps_total": 0,
                        "critical_windows": 0,
                        "warning_windows": 0,
                        "adequate_windows": 0,
                        "worst_window": None,
                        "best_window": None,
                        "peak_flow_window": None,
                        "opportunity_window": None,
                    },
                    "windows": [],
                }
            )

        org_id = str(org_ids[0])
        store_id = request.query_params.get("store_id")
        tz = _get_org_timezone(org_id)
        start, end, period = _parse_date_range(request, tz)
        payload = _build_productivity_coverage_payload(
            org_id=org_id,
            store_id=store_id,
            start=start,
            end=end,
        )
        payload["period"] = period
        return Response(payload)


class ReportExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_ids = get_user_org_ids(request.user)
        if not org_ids:
            return Response({"detail": "Sem organização."}, status=403)

        org_id = str(org_ids[0])
        store_id = request.query_params.get("store_id")
        fmt = (request.query_params.get("format") or "csv").lower()
        tz = _get_org_timezone(org_id)
        start, end, period = _parse_date_range(request, tz)
        payload = _build_report_payload(
            org_id=org_id,
            store_id=store_id,
            start=start,
            end=end,
        )
        payload["period"] = period

        filename = f"report_{period}_{timezone.now().strftime('%Y%m%d_%H%M')}.{fmt}"

        if fmt == "csv":
            output = StringIO()
            writer = csv.writer(output)
            writer.writerow(["period", payload.get("period")])
            writer.writerow(["from", payload.get("from")])
            writer.writerow(["to", payload.get("to")])
            writer.writerow([])
            writer.writerow(["kpi", "value"])
            for key, value in payload.get("kpis", {}).items():
                writer.writerow([key, value])
            writer.writerow([])
            writer.writerow(["footfall_by_hour"])
            writer.writerow(["hour", "footfall"])
            for row in payload.get("chart_footfall_by_hour", []):
                writer.writerow([row.get("hour"), row.get("footfall")])
            writer.writerow([])
            writer.writerow(["alerts_by_type"])
            writer.writerow(["type", "count"])
            for row in payload.get("alert_counts_by_type", []):
                writer.writerow([row.get("type"), row.get("count")])
            writer.writerow([])
            writer.writerow(["insights"])
            for insight in payload.get("insights", []):
                writer.writerow([insight])

            response = HttpResponse(
                output.getvalue().encode("utf-8"),
                content_type="text/csv; charset=utf-8",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        if fmt == "pdf":
            try:
                import matplotlib

                matplotlib.use("Agg")
                import matplotlib.pyplot as plt

                fig = plt.figure(figsize=(8.27, 11.69))
                fig.suptitle("DALE Vision — Relatório", fontsize=16, fontweight="bold")

                kpis = payload.get("kpis", {})
                kpi_text = "\n".join(
                    [
                        f"Visitantes: {kpis.get('total_visitors', 0)}",
                        f"Permanência média (s): {kpis.get('avg_dwell_seconds', 0)}",
                        f"Fila média (s): {kpis.get('avg_queue_seconds', 0)}",
                        f"Conversão média: {kpis.get('avg_conversion_rate', 0):.2f}",
                        f"Total alertas: {kpis.get('total_alerts', 0)}",
                    ]
                )

                fig.text(0.08, 0.9, f"Período: {payload.get('from')} → {payload.get('to')}", fontsize=9)
                fig.text(0.08, 0.85, kpi_text, fontsize=10)

                ax = fig.add_axes([0.1, 0.55, 0.8, 0.25])
                hours = [row.get("hour") for row in payload.get("chart_footfall_by_hour", [])]
                values = [row.get("footfall") for row in payload.get("chart_footfall_by_hour", [])]
                if hours and values:
                    ax.bar(hours, values, color="#2563eb")
                ax.set_title("Visitantes por hora")
                ax.set_xlabel("Hora")
                ax.set_ylabel("Visitantes")

                alerts = payload.get("alert_counts_by_type", [])
                alert_lines = "\n".join([f"{row.get('type')}: {row.get('count')}" for row in alerts])
                fig.text(0.08, 0.45, "Alertas (Top)", fontsize=10, fontweight="bold")
                fig.text(0.08, 0.42, alert_lines or "Sem alertas", fontsize=9)

                insights = payload.get("insights", [])
                insights_text = "\n".join([f"- {i}" for i in insights]) or "- Nenhum insight"
                fig.text(0.08, 0.3, "Insights", fontsize=10, fontweight="bold")
                fig.text(0.08, 0.27, insights_text, fontsize=9)

                buffer = BytesIO()
                fig.savefig(buffer, format="pdf", bbox_inches="tight")
                plt.close(fig)
                pdf_bytes = buffer.getvalue()

                response = HttpResponse(pdf_bytes, content_type="application/pdf")
                response["Content-Disposition"] = f'attachment; filename="{filename}"'
                return response
            except Exception:
                return Response({"detail": "Falha ao gerar PDF."}, status=500)

        return Response({"detail": "Formato inválido."}, status=400)


class ReportImpactView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_ids = get_user_org_ids(request.user)
        if not org_ids:
            return Response(
                {
                    "period": "7d",
                    "from": None,
                    "to": None,
                    "store_id": None,
                    "stores_count": 0,
                    "method": {
                        "id": "report_impact",
                        "version": "report_impact_v1_2026-03-13",
                        "label": "Impacto operacional estimado",
                        "description": "Sem organizacao ativa para calculo.",
                    },
                    "confidence_governance": {
                        "status": "insuficiente",
                        "score": 0,
                        "source_flags": {},
                        "caveats": ["Sem organizacao ativa para calculo do impacto."],
                    },
                    "kpis": {
                        "total_visitors": 0,
                        "avg_dwell_seconds": 0,
                        "avg_queue_seconds": 0,
                        "avg_conversion_rate": 0,
                        "total_alerts": 0,
                    },
                    "chart_footfall_by_day": [],
                    "chart_footfall_by_hour": [],
                    "alert_counts_by_type": [],
                    "insights": [],
                    "impact": {
                        "idle_seconds_total": 0,
                        "queue_wait_seconds_total": 0,
                        "avg_hourly_labor_cost": 0,
                        "queue_abandon_rate": 0,
                        "cost_idle": 0,
                        "cost_queue": 0,
                        "potential_monthly_estimated": 0,
                        "currency": "BRL",
                        "estimated": True,
                        "method": "idle_proxy_from_staff_active_est_and_footfall",
                        "method_version": "report_impact_v1_2026-03-13",
                    },
                    "segment": "default",
                    "features_blocked": [],
                }
            )

        org_id = str(org_ids[0])
        store_id = request.query_params.get("store_id")
        tz = _get_org_timezone(org_id)
        start, end, period = _parse_date_range(request, tz)
        payload = _build_report_impact_payload(
            org_id=org_id,
            store_id=store_id,
            start=start,
            end=end,
        )
        payload["period"] = period
        return Response(payload)
