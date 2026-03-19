from __future__ import annotations

import json
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone


METHOD_VERSION = "store_kpis_daily_v1_2026-03-19"


def _parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _iter_dates(start_date: date, end_date: date):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def _day_window_utc(business_date: date, tz_name: str) -> tuple[datetime, datetime]:
    tz = ZoneInfo(tz_name)
    start_local = datetime.combine(business_date, time.min, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)


class Command(BaseCommand):
    help = "Materializa KPIs diarios auditaveis por loja em public.store_kpis_daily."

    def add_arguments(self, parser):
        parser.add_argument("--date", help="Data unica YYYY-MM-DD")
        parser.add_argument("--start", help="Inicio YYYY-MM-DD (inclusive)")
        parser.add_argument("--end", help="Fim YYYY-MM-DD (inclusive)")
        parser.add_argument("--store-id", help="Filtrar por store_id")

    def handle(self, *args, **options):
        today_local = timezone.localdate()
        default_date = today_local - timedelta(days=1)

        if options.get("date"):
            start_date = _parse_date(options["date"])
            end_date = start_date
        else:
            start_date = _parse_date(options["start"]) if options.get("start") else default_date
            end_date = _parse_date(options["end"]) if options.get("end") else start_date

        if end_date < start_date:
            start_date, end_date = end_date, start_date

        store_filter = (options.get("store_id") or "").strip() or None
        rows = self._load_store_rows(store_filter=store_filter)
        if not rows:
            self.stdout.write("Nenhuma loja encontrada para materializacao.")
            return

        upserted = 0
        for store_row in rows:
            store_id = str(store_row["store_id"])
            org_id = str(store_row["org_id"])
            tz_name = str(store_row.get("timezone") or settings.TIME_ZONE)
            avg_hourly_labor_cost = float(store_row.get("avg_hourly_labor_cost") or 0.0)
            segment = str(store_row.get("business_type") or "default").strip().lower()
            abandon_rate = float(
                getattr(settings, "TRIAL_QUEUE_ABANDON_RATE_BY_SEGMENT", {}).get(
                    segment,
                    getattr(settings, "TRIAL_QUEUE_ABANDON_RATE_BY_SEGMENT", {}).get("default", 0.08),
                )
            )

            for business_date in _iter_dates(start_date, end_date):
                start_utc, end_utc = _day_window_utc(business_date, tz_name)
                metrics = self._compute_metrics_for_store_day(
                    store_id=store_id,
                    start_utc=start_utc,
                    end_utc=end_utc,
                    avg_hourly_labor_cost=avg_hourly_labor_cost,
                    abandon_rate=abandon_rate,
                )
                inputs_json = {
                    "window_utc": {
                        "start": start_utc.isoformat(),
                        "end": end_utc.isoformat(),
                    },
                    "timezone": tz_name,
                    "segment": segment,
                    "avg_hourly_labor_cost": avg_hourly_labor_cost,
                    "queue_abandon_rate": abandon_rate,
                    "source_flags": {
                        "flow_in_total": "official",
                        "flow_out_total": "official",
                        "transactions_total": "proxy",
                        "conversion_rate": "proxy",
                        "queue_wait_peak": "official",
                        "queue_loss_estimated": "derived",
                        "idle_cost_estimated": "derived",
                        "money_at_risk": "estimated",
                        "alerts_total": "official",
                        "useful_alert_rate": "proxy",
                    },
                }
                self._upsert_store_kpi_daily(
                    org_id=org_id,
                    store_id=store_id,
                    business_date=business_date,
                    metrics=metrics,
                    inputs_json=inputs_json,
                )
                upserted += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"store_kpis_daily materializado: {upserted} linhas ({start_date} -> {end_date})."
            )
        )

    def _load_store_rows(self, *, store_filter: str | None):
        sql = """
            SELECT s.id AS store_id,
                   s.org_id AS org_id,
                   s.avg_hourly_labor_cost,
                   s.business_type,
                   COALESCE(o.timezone, %s) AS timezone
            FROM public.stores s
            LEFT JOIN public.organizations o ON o.id = s.org_id
        """
        params = [settings.TIME_ZONE]
        if store_filter:
            sql += " WHERE s.id = %s"
            params.append(store_filter)
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def _compute_metrics_for_store_day(
        self,
        *,
        store_id: str,
        start_utc: datetime,
        end_utc: datetime,
        avg_hourly_labor_cost: float,
        abandon_rate: float,
    ) -> dict:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COALESCE(SUM(footfall), 0)
                FROM public.traffic_metrics
                WHERE store_id = %s
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                  AND (camera_role = 'entrada' OR camera_role IS NULL)
                  AND (ownership = 'primary' OR ownership IS NULL)
                """,
                [store_id, start_utc, end_utc],
            )
            flow_in_total = int(cursor.fetchone()[0] or 0)

            cursor.execute(
                """
                SELECT COALESCE(SUM(count_value), 0)
                FROM public.vision_atomic_events
                WHERE store_id = %s
                  AND ts >= %s
                  AND ts < %s
                  AND event_type = 'vision.crossing.v1'
                  AND lower(COALESCE(direction, '')) = 'exit'
                  AND (ownership = 'primary' OR ownership IS NULL)
                """,
                [store_id, start_utc, end_utc],
            )
            flow_out_total = int(cursor.fetchone()[0] or 0)

            cursor.execute(
                """
                SELECT COALESCE(SUM(checkout_events), 0),
                       COALESCE(MAX(queue_avg_seconds), 0)
                FROM public.conversion_metrics
                WHERE store_id = %s
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                  AND (camera_role = 'balcao' OR camera_role IS NULL)
                  AND (ownership = 'primary' OR ownership IS NULL)
                """,
                [store_id, start_utc, end_utc],
            )
            conversion_row = cursor.fetchone() or (0, 0)
            transactions_total = int(conversion_row[0] or 0)
            queue_wait_peak = float(conversion_row[1] or 0)

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
                    SELECT ts_bucket,
                           COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                           COALESCE(AVG(staff_active_est), 0) AS staff_active_est
                    FROM public.conversion_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                ) cm
                LEFT JOIN (
                    SELECT ts_bucket,
                           COALESCE(SUM(footfall), 0) AS footfall
                    FROM public.traffic_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                ) tm ON tm.ts_bucket = cm.ts_bucket
                """,
                [store_id, start_utc, end_utc, store_id, start_utc, end_utc],
            )
            idle_row = cursor.fetchone() or (0, 0)
            idle_seconds_total = float(idle_row[0] or 0)
            queue_wait_seconds_total = float(idle_row[1] or 0)

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM public.detection_events
                WHERE store_id = %s
                  AND COALESCE(occurred_at, created_at) >= %s
                  AND COALESCE(occurred_at, created_at) < %s
                """,
                [store_id, start_utc, end_utc],
            )
            alerts_total = int(cursor.fetchone()[0] or 0)

            cursor.execute(
                """
                SELECT COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                       COUNT(*) AS dispatched
                FROM public.action_outcome
                WHERE store_id = %s
                  AND dispatched_at >= %s
                  AND dispatched_at < %s
                """,
                [store_id, start_utc, end_utc],
            )
            action_row = cursor.fetchone() or (0, 0)
            actions_completed = int(action_row[0] or 0)
            actions_dispatched = int(action_row[1] or 0)

        conversion_rate = float(transactions_total / flow_in_total) if flow_in_total > 0 else None
        idle_cost_estimated = float((idle_seconds_total / 3600.0) * avg_hourly_labor_cost)
        queue_loss_estimated = float((queue_wait_seconds_total / 3600.0) * avg_hourly_labor_cost * abandon_rate)
        money_at_risk = float(idle_cost_estimated + queue_loss_estimated)
        useful_alert_rate = float(actions_completed / alerts_total) if alerts_total > 0 else None

        return {
            "flow_in_total": flow_in_total,
            "flow_out_total": flow_out_total,
            "transactions_total": transactions_total,
            "conversion_rate": conversion_rate,
            "avg_ticket": None,
            "queue_wait_peak": queue_wait_peak,
            "queue_loss_estimated": queue_loss_estimated,
            "idle_cost_estimated": idle_cost_estimated,
            "money_at_risk": money_at_risk,
            "alerts_total": alerts_total,
            "useful_alert_rate": useful_alert_rate,
            "actions_dispatched": actions_dispatched,
            "actions_completed": actions_completed,
        }

    def _upsert_store_kpi_daily(
        self,
        *,
        org_id: str,
        store_id: str,
        business_date: date,
        metrics: dict,
        inputs_json: dict,
    ):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO public.store_kpis_daily (
                    org_id,
                    store_id,
                    business_date,
                    flow_in_total,
                    flow_out_total,
                    transactions_total,
                    conversion_rate,
                    avg_ticket,
                    queue_wait_peak,
                    queue_loss_estimated,
                    idle_cost_estimated,
                    money_at_risk,
                    alerts_total,
                    useful_alert_rate,
                    method_version,
                    inputs_json,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, now()
                )
                ON CONFLICT (store_id, business_date)
                DO UPDATE SET
                    org_id = EXCLUDED.org_id,
                    flow_in_total = EXCLUDED.flow_in_total,
                    flow_out_total = EXCLUDED.flow_out_total,
                    transactions_total = EXCLUDED.transactions_total,
                    conversion_rate = EXCLUDED.conversion_rate,
                    avg_ticket = EXCLUDED.avg_ticket,
                    queue_wait_peak = EXCLUDED.queue_wait_peak,
                    queue_loss_estimated = EXCLUDED.queue_loss_estimated,
                    idle_cost_estimated = EXCLUDED.idle_cost_estimated,
                    money_at_risk = EXCLUDED.money_at_risk,
                    alerts_total = EXCLUDED.alerts_total,
                    useful_alert_rate = EXCLUDED.useful_alert_rate,
                    method_version = EXCLUDED.method_version,
                    inputs_json = EXCLUDED.inputs_json,
                    updated_at = now()
                """,
                [
                    org_id,
                    store_id,
                    business_date,
                    metrics["flow_in_total"],
                    metrics["flow_out_total"],
                    metrics["transactions_total"],
                    metrics["conversion_rate"],
                    metrics["avg_ticket"],
                    metrics["queue_wait_peak"],
                    metrics["queue_loss_estimated"],
                    metrics["idle_cost_estimated"],
                    metrics["money_at_risk"],
                    metrics["alerts_total"],
                    metrics["useful_alert_rate"],
                    METHOD_VERSION,
                    json.dumps(inputs_json, ensure_ascii=False),
                ],
            )
