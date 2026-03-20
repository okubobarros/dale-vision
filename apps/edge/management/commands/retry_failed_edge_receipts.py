from __future__ import annotations

import json
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

from apps.edge.vision_metrics import (
    apply_vision_checkout_proxy,
    apply_vision_crossing,
    apply_vision_metrics,
    apply_vision_queue_state,
    apply_vision_zone_occupancy,
    insert_vision_atomic_event_if_new,
    mark_event_receipt_failed,
    mark_event_receipt_processed,
)


class Command(BaseCommand):
    help = "Retry de receipts edge com falha (DLQ operacional), com replay de projeções vision.*."

    def add_arguments(self, parser):
        parser.add_argument("--hours", type=int, default=24, help="Janela em horas para buscar falhas (default: 24).")
        parser.add_argument("--limit", type=int, default=500, help="Limite de receipts por execução (default: 500).")
        parser.add_argument(
            "--max-attempts",
            type=int,
            default=8,
            help="Ignorar receipts com attempt_count >= max-attempts (default: 8).",
        )
        parser.add_argument("--dry-run", action="store_true", help="Somente listar candidatos sem reprocessar.")

    def handle(self, *args, **options):
        hours = max(1, min(int(options.get("hours") or 24), 24 * 30))
        limit = max(1, min(int(options.get("limit") or 500), 5000))
        max_attempts = max(1, min(int(options.get("max_attempts") or 8), 100))
        dry_run = bool(options.get("dry_run"))
        start = timezone.now() - timedelta(hours=hours)

        rows = self._load_failed_receipts(start=start, limit=limit, max_attempts=max_attempts)
        if not rows:
            self.stdout.write("Nenhum receipt elegível para retry.")
            return

        self.stdout.write(f"Candidatos ao retry: {len(rows)} (hours={hours}, limit={limit}, dry_run={dry_run})")

        retried = 0
        recovered = 0
        skipped = 0
        failed = 0

        for row in rows:
            event_id = str(row["event_id"])
            event_name = str(row["event_name"] or "")
            raw_payload = row["raw_payload"]
            retried += 1

            if dry_run:
                self.stdout.write(
                    f"[DRY-RUN] event_id={event_id} event_name={event_name} last_error={row['last_error']}"
                )
                continue

            payload = self._safe_parse_payload(raw_payload)
            if not payload:
                mark_event_receipt_failed(event_id=event_id, error_message="retry_failed_invalid_raw_payload")
                failed += 1
                continue

            try:
                handled = self._replay_event(event_id=event_id, event_name=event_name, payload=payload)
                if not handled:
                    skipped += 1
                    mark_event_receipt_failed(event_id=event_id, error_message="retry_skipped_event_not_supported")
                    continue
                mark_event_receipt_processed(event_id=event_id)
                recovered += 1
            except Exception as exc:
                failed += 1
                mark_event_receipt_failed(
                    event_id=event_id,
                    error_message=f"retry_failed:{str(exc)[:200]}",
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Retry concluído. retried={retried} recovered={recovered} skipped={skipped} failed={failed}"
            )
        )

    @staticmethod
    def _safe_parse_payload(raw_payload):
        if raw_payload in (None, ""):
            return None
        if isinstance(raw_payload, dict):
            return raw_payload
        try:
            return json.loads(raw_payload)
        except Exception:
            return None

    @staticmethod
    def _replay_event(*, event_id: str, event_name: str, payload: dict) -> bool:
        if event_name == "vision.metrics.v1":
            apply_vision_metrics(payload)
            return True
        if event_name == "vision.crossing.v1":
            inserted = insert_vision_atomic_event_if_new(receipt_id=event_id, payload=payload)
            if inserted:
                apply_vision_crossing(payload)
            return True
        if event_name == "vision.queue_state.v1":
            inserted = insert_vision_atomic_event_if_new(receipt_id=event_id, payload=payload)
            if inserted:
                apply_vision_queue_state(payload)
            return True
        if event_name == "vision.checkout_proxy.v1":
            inserted = insert_vision_atomic_event_if_new(receipt_id=event_id, payload=payload)
            if inserted:
                apply_vision_checkout_proxy(payload)
            return True
        if event_name == "vision.zone_occupancy.v1":
            inserted = insert_vision_atomic_event_if_new(receipt_id=event_id, payload=payload)
            if inserted:
                apply_vision_zone_occupancy(payload)
            return True
        return False

    @staticmethod
    def _load_failed_receipts(*, start, limit: int, max_attempts: int):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    event_id,
                    event_name,
                    raw::text AS raw_payload,
                    last_error,
                    attempt_count
                FROM public.event_receipts
                WHERE source = 'edge'
                  AND ts >= %s
                  AND processed_at IS NULL
                  AND COALESCE(NULLIF(TRIM(last_error), ''), NULL) IS NOT NULL
                  AND COALESCE(attempt_count, 0) < %s
                ORDER BY ts ASC
                LIMIT %s
                """,
                [start, max_attempts, limit],
            )
            cols = [col[0] for col in cursor.description]
            return [dict(zip(cols, row)) for row in cursor.fetchall()]
