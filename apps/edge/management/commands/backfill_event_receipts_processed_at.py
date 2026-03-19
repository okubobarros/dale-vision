from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Backfill de event_receipts.processed_at para linhas antigas sem erro."

    def add_arguments(self, parser):
        parser.add_argument("--source", type=str, default=None, help="Filtra por source (opcional)")
        parser.add_argument("--event-name", type=str, default=None, help="Filtra por event_name exato (opcional)")
        parser.add_argument("--grace-minutes", type=int, default=5, help="Ignora eventos mais recentes que N minutos")
        parser.add_argument("--limit", type=int, default=20000, help="Limite máximo de linhas por execução")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        source = (options.get("source") or "").strip() or None
        event_name = (options.get("event_name") or "").strip() or None
        grace_minutes = int(options.get("grace_minutes") or 5)
        limit = int(options.get("limit") or 20000)
        dry_run = bool(options.get("dry_run"))

        where = [
            "processed_at IS NULL",
            "last_error IS NULL",
            "received_at < now() - (%s || ' minutes')::interval",
        ]
        params = [str(grace_minutes)]
        if source:
            where.append("source = %s")
            params.append(source)
        if event_name:
            where.append("event_name = %s")
            params.append(event_name)

        count_sql = f"""
            SELECT COUNT(*)
            FROM public.event_receipts
            WHERE {' AND '.join(where)}
        """
        with connection.cursor() as cursor:
            cursor.execute(count_sql, params)
            pending = int(cursor.fetchone()[0] or 0)

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"backfill_event_receipts_processed_at dry-run: pending={pending} grace_minutes={grace_minutes} limit={limit}"
                )
            )
            return

        update_sql = f"""
            WITH targets AS (
                SELECT id
                FROM public.event_receipts
                WHERE {' AND '.join(where)}
                ORDER BY received_at ASC
                LIMIT %s
            )
            UPDATE public.event_receipts er
            SET processed_at = COALESCE(er.updated_at, er.received_at, er.ts, er.created_at, now()),
                attempt_count = GREATEST(COALESCE(er.attempt_count, 0), 1),
                status = CASE WHEN er.status = 'received' THEN 'processed' ELSE er.status END,
                updated_at = now()
            FROM targets
            WHERE er.id = targets.id
        """
        with connection.cursor() as cursor:
            cursor.execute(update_sql, [*params, limit])
            updated = int(cursor.rowcount or 0)

        self.stdout.write(
            self.style.SUCCESS(
                f"backfill_event_receipts_processed_at apply: pending={pending} updated={updated} grace_minutes={grace_minutes} limit={limit}"
            )
        )
