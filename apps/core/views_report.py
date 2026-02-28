from datetime import datetime, timedelta
from io import BytesIO, StringIO
import csv
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import connection
from django.utils import timezone
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Count
from apps.core.models import Store, DetectionEvent, Organization
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
                       COALESCE(AVG(dwell_seconds_avg), 0) AS dwell_avg
                FROM public.traffic_metrics
                WHERE store_id = ANY(%s) AND ts_bucket >= %s AND ts_bucket < %s
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
                SELECT date_trunc('day', ts_bucket) AS bucket,
                       COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                       COALESCE(AVG(conversion_rate), 0) AS conversion_rate
                FROM public.conversion_metrics
                WHERE store_id = ANY(%s) AND ts_bucket >= %s AND ts_bucket < %s
                GROUP BY 1
                ORDER BY 1 ASC
                """,
                [store_ids, start, end],
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
                       COALESCE(AVG(dwell_seconds_avg), 0) AS avg_dwell_seconds
                FROM public.traffic_metrics
                WHERE store_id = ANY(%s) AND ts_bucket >= %s AND ts_bucket < %s
                """,
                [store_ids, start, end],
            )
            row = cursor.fetchone()
            if row:
                totals["total_visitors"] = int(row[0] or 0)
                totals["avg_dwell_seconds"] = int(row[1] or 0)

            cursor.execute(
                """
                SELECT COALESCE(AVG(queue_avg_seconds), 0) AS avg_queue_seconds,
                       COALESCE(AVG(conversion_rate), 0) AS avg_conversion_rate
                FROM public.conversion_metrics
                WHERE store_id = ANY(%s) AND ts_bucket >= %s AND ts_bucket < %s
                """,
                [store_ids, start, end],
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
                WHERE store_id = ANY(%s) AND ts_bucket >= %s AND ts_bucket < %s
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
                FROM public.conversion_metrics cm
                LEFT JOIN public.traffic_metrics tm
                  ON tm.store_id = cm.store_id AND tm.ts_bucket = cm.ts_bucket
                WHERE cm.store_id = ANY(%s) AND cm.ts_bucket >= %s AND cm.ts_bucket < %s
                """,
                [store_ids, start, end],
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
    }
    payload["segment"] = segment or "default"
    payload["features_blocked"] = [
        "Produtividade por funcionário",
        "Alertas configuráveis",
        "Heatmap e benchmarking",
        "Integração PDV",
    ]
    return payload


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
