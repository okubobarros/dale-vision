from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.utils import timezone


class Command(BaseCommand):
    help = "Snapshot de saúde da identidade de conversion_metrics (metric_type/roi_entity_id)."

    def add_arguments(self, parser):
        parser.add_argument("--store-id", type=str, default=None, help="Filtra por loja (opcional).")
        parser.add_argument("--max-null-rate", type=float, default=5.0, help="Threshold máximo de nulos (%%).")
        parser.add_argument("--json-output", type=str, default=None, help="Arquivo JSON de saída (opcional).")
        parser.add_argument("--fail-on-breach", action="store_true", help="Retorna erro se null_rate > max-null-rate.")

    def handle(self, *args, **options):
        store_id = (options.get("store_id") or "").strip() or None
        max_null_rate = float(options.get("max_null_rate") or 5.0)
        json_output = (options.get("json_output") or "").strip() or None
        fail_on_breach = bool(options.get("fail_on_breach"))

        where = []
        params = []
        if store_id:
            where.append("store_id = %s")
            params.append(store_id)
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""

        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                  COUNT(*) FILTER (WHERE metric_type IS NULL OR metric_type = '') AS metric_type_null,
                  COUNT(*) FILTER (WHERE roi_entity_id IS NULL OR roi_entity_id = '') AS roi_entity_id_null,
                  COUNT(*) FILTER (
                    WHERE metric_type IS NULL OR metric_type = '' OR roi_entity_id IS NULL OR roi_entity_id = ''
                  ) AS any_identity_null,
                  COUNT(*) AS total_count
                FROM public.conversion_metrics
                {where_sql}
                """,
                params,
            )
            metric_type_null, roi_entity_id_null, any_identity_null, total_count = cursor.fetchone()

            cursor.execute(
                f"""
                SELECT metric_type, COUNT(*) AS qty
                FROM public.conversion_metrics
                {where_sql}
                GROUP BY metric_type
                ORDER BY qty DESC
                LIMIT 10
                """,
                params,
            )
            by_metric_type = cursor.fetchall()

        total_count = int(total_count or 0)
        any_identity_null = int(any_identity_null or 0)
        null_rate = round((any_identity_null / total_count) * 100, 2) if total_count > 0 else 0.0
        breached = null_rate > max_null_rate

        payload = {
            "generated_at": timezone.now().isoformat(),
            "scope": {"store_id": store_id},
            "thresholds": {"max_null_rate": max_null_rate},
            "counts": {
                "total_count": total_count,
                "metric_type_null": int(metric_type_null or 0),
                "roi_entity_id_null": int(roi_entity_id_null or 0),
                "any_identity_null": any_identity_null,
            },
            "null_rate_pct": null_rate,
            "breached": breached,
            "status": "breached" if breached else "healthy",
            "top_metric_types": [
                {"metric_type": str(mt) if mt is not None else None, "count": int(qty or 0)}
                for mt, qty in by_metric_type
            ],
        }

        if json_output:
            out_path = Path(json_output)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        self.stdout.write(
            self.style.SUCCESS(
                "conversion_metrics_identity_health: "
                f"status={payload['status']} null_rate_pct={null_rate} max_null_rate={max_null_rate}"
            )
        )

        if fail_on_breach and breached:
            raise CommandError(
                "conversion_metrics identity breach: "
                f"null_rate_pct={null_rate} > max_null_rate={max_null_rate}"
            )
