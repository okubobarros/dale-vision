from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.utils import timezone


class Command(BaseCommand):
    help = "Snapshot de saúde de processamento de event_receipts com threshold de pendências."

    def add_arguments(self, parser):
        parser.add_argument("--grace-minutes", type=int, default=5, help="Ignora receipts recentes nesta janela.")
        parser.add_argument("--max-pending", type=int, default=50, help="Threshold de pendências aceitáveis.")
        parser.add_argument("--json-output", type=str, default=None, help="Arquivo JSON de saída (opcional).")
        parser.add_argument("--fail-on-breach", action="store_true", help="Retorna erro se pending > max-pending.")

    def handle(self, *args, **options):
        grace_minutes = int(options.get("grace_minutes") or 5)
        max_pending = int(options.get("max_pending") or 50)
        json_output = (options.get("json_output") or "").strip() or None
        fail_on_breach = bool(options.get("fail_on_breach"))

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  COUNT(*) FILTER (WHERE processed_at IS NULL) AS pending_all,
                  COUNT(*) FILTER (
                    WHERE processed_at IS NULL
                      AND last_error IS NULL
                      AND received_at < now() - (%s || ' minutes')::interval
                  ) AS pending_aged,
                  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) AS processed_count,
                  COUNT(*) FILTER (WHERE last_error IS NOT NULL) AS failed_count,
                  COUNT(*) AS total_count
                FROM public.event_receipts
                """,
                [str(grace_minutes)],
            )
            pending_all, pending_aged, processed_count, failed_count, total_count = cursor.fetchone()

            cursor.execute(
                """
                SELECT source, COUNT(*) AS qty
                FROM public.event_receipts
                WHERE processed_at IS NULL
                  AND last_error IS NULL
                  AND received_at < now() - (%s || ' minutes')::interval
                GROUP BY source
                ORDER BY qty DESC
                LIMIT 10
                """,
                [str(grace_minutes)],
            )
            by_source_rows = cursor.fetchall()

            cursor.execute(
                """
                SELECT event_name, COUNT(*) AS qty
                FROM public.event_receipts
                WHERE processed_at IS NULL
                  AND last_error IS NULL
                  AND received_at < now() - (%s || ' minutes')::interval
                GROUP BY event_name
                ORDER BY qty DESC
                LIMIT 10
                """,
                [str(grace_minutes)],
            )
            by_event_rows = cursor.fetchall()

        pending_aged = int(pending_aged or 0)
        payload = {
            "generated_at": timezone.now().isoformat(),
            "grace_minutes": grace_minutes,
            "max_pending": max_pending,
            "pending_all": int(pending_all or 0),
            "pending_aged": pending_aged,
            "processed_count": int(processed_count or 0),
            "failed_count": int(failed_count or 0),
            "total_count": int(total_count or 0),
            "breached": pending_aged > max_pending,
            "status": "breached" if pending_aged > max_pending else "healthy",
            "pending_by_source": [{"source": str(s), "count": int(c or 0)} for s, c in by_source_rows],
            "pending_by_event_name": [{"event_name": str(n), "count": int(c or 0)} for n, c in by_event_rows],
        }

        if json_output:
            out_path = Path(json_output)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        self.stdout.write(
            self.style.SUCCESS(
                "event_receipts_processing_health: "
                f"status={payload['status']} pending_aged={pending_aged} max_pending={max_pending}"
            )
        )

        if fail_on_breach and payload["breached"]:
            raise CommandError(
                f"event_receipts pending_aged breach: pending_aged={pending_aged} > max_pending={max_pending}"
            )
