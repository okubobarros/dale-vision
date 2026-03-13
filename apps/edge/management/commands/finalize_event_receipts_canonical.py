import json
from typing import Any, Optional

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime


HEARTBEAT_EVENT_NAMES = ("edge_heartbeat", "camera_heartbeat", "edge_camera_heartbeat")


def _parse_event_ts(raw_ts: Optional[str], fallback_dt):
    if not raw_ts:
        return fallback_dt
    parsed = parse_datetime(str(raw_ts).replace("Z", "+00:00"))
    if parsed is None:
        return fallback_dt
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.utc)
    return parsed


def _extract_payload_ts(payload: Any, fallback_dt):
    if not isinstance(payload, dict):
        return fallback_dt
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    raw_ts = data.get("ts") or payload.get("ts")
    return _parse_event_ts(raw_ts, fallback_dt)


class Command(BaseCommand):
    help = "Finaliza consolidação de receipts: backfill edge_edgeeventreceipt -> event_receipts e desativa tabela legada."

    def add_arguments(self, parser):
        parser.add_argument(
            "--deactivate-legacy-table",
            action="store_true",
            help="Renomeia tabela legada e cria view de compatibilidade somente leitura.",
        )
        parser.add_argument(
            "--drop-compat-view",
            action="store_true",
            help="Remove a view de compatibilidade edge_edgeeventreceipt e apaga tabelas legadas renomeadas.",
        )

    def _relation_kind(self, relname: str):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.relkind
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relname = %s
                LIMIT 1
                """,
                [relname],
            )
            row = cursor.fetchone()
        return row[0] if row else None

    def handle(self, *args, **options):
        deactivate = bool(options.get("deactivate_legacy_table"))
        drop_compat_view = bool(options.get("drop_compat_view"))
        legacy_rel = "edge_edgeeventreceipt"
        legacy_kind = self._relation_kind(legacy_rel)

        if legacy_kind is None:
            self.stdout.write(self.style.WARNING("Tabela legada não encontrada; nada para backfill."))
        elif legacy_kind != "r":
            self.stdout.write(
                self.style.WARNING(
                    f"Relação '{legacy_rel}' não é tabela física (relkind={legacy_kind}); pulando backfill."
                )
            )
        else:
            inserted = 0
            deduped = 0
            total = 0
            with connection.cursor() as read_cursor:
                read_cursor.execute(
                    """
                    SELECT receipt_id, event_name, source, store_id, payload, created_at
                    FROM public.edge_edgeeventreceipt
                    ORDER BY created_at ASC
                    """
                )
                while True:
                    batch = read_cursor.fetchmany(1000)
                    if not batch:
                        break

                    with transaction.atomic():
                        with connection.cursor() as write_cursor:
                            for receipt_id, event_name, source, store_id, payload, created_at in batch:
                                total += 1
                                payload_json = payload if isinstance(payload, dict) else {}
                                ts_value = _extract_payload_ts(payload_json, created_at)
                                meta = {
                                    "store_id": store_id or (payload_json.get("data") or {}).get("store_id"),
                                    "migrated_from": "edge_edgeeventreceipt",
                                }

                                write_cursor.execute(
                                    """
                                    INSERT INTO public.event_receipts
                                    (event_id, event_name, event_version, ts, source, raw, meta)
                                    VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
                                    ON CONFLICT (event_id) DO NOTHING
                                    """,
                                    [
                                        receipt_id,
                                        event_name,
                                        1,
                                        ts_value,
                                        source or "edge",
                                        json.dumps(payload_json, ensure_ascii=False),
                                        json.dumps(meta, ensure_ascii=False),
                                    ],
                                )
                                if write_cursor.rowcount == 1:
                                    inserted += 1
                                else:
                                    deduped += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"Backfill concluído: total={total} inserted={inserted} deduped={deduped}"
                )
            )

        if not deactivate and not drop_compat_view:
            self.stdout.write("Desativação da tabela legada não solicitada (use --deactivate-legacy-table).")
            return

        if deactivate:
            legacy_kind = self._relation_kind(legacy_rel)
            if legacy_kind == "v":
                self.stdout.write(
                    self.style.SUCCESS("Tabela legada já está desativada (view de compatibilidade ativa).")
                )
            elif legacy_kind != "r":
                self.stdout.write(
                    self.style.WARNING(
                        f"Não foi possível desativar '{legacy_rel}': tipo de relação inesperado ({legacy_kind})."
                    )
                )
            else:
                backup_name = f"edge_edgeeventreceipt_legacy_{timezone.now():%Y%m%d_%H%M%S}"
                with transaction.atomic():
                    with connection.cursor() as cursor:
                        cursor.execute(f"ALTER TABLE public.{legacy_rel} RENAME TO {backup_name}")
                        cursor.execute(
                            f"""
                            CREATE VIEW public.{legacy_rel} AS
                            SELECT
                                er.event_id::varchar(128) AS receipt_id,
                                er.event_name::varchar(64) AS event_name,
                                er.source::varchar(32) AS source,
                                COALESCE(
                                    er.meta->>'store_id',
                                    er.raw->'data'->>'store_id',
                                    er.raw->>'store_id'
                                )::varchar(64) AS store_id,
                                er.raw AS payload,
                                COALESCE(er.ts, er.received_at, er.created_at) AS created_at
                            FROM public.event_receipts er
                            WHERE er.source = 'edge'
                              AND er.event_name = ANY(%s)
                            """,
                            [list(HEARTBEAT_EVENT_NAMES)],
                        )

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Desativação concluída: tabela renomeada para '{backup_name}' e view '{legacy_rel}' criada."
                    )
                )

        if not drop_compat_view:
            return

        with transaction.atomic():
            with connection.cursor() as cursor:
                kind_now = self._relation_kind(legacy_rel)
                if kind_now == "v":
                    cursor.execute(f"DROP VIEW IF EXISTS public.{legacy_rel}")
                    self.stdout.write(self.style.SUCCESS(f"View de compatibilidade removida: {legacy_rel}"))
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"View de compatibilidade não removida: '{legacy_rel}' não é view (relkind={kind_now})."
                        )
                    )

                cursor.execute(
                    """
                    SELECT c.relname
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public'
                      AND c.relkind = 'r'
                      AND c.relname LIKE 'edge_edgeeventreceipt_legacy_%'
                    ORDER BY c.relname
                    """
                )
                legacy_tables = [row[0] for row in cursor.fetchall()]
                for table_name in legacy_tables:
                    cursor.execute(f"DROP TABLE IF EXISTS public.{table_name}")
                    self.stdout.write(self.style.SUCCESS(f"Tabela legada removida: {table_name}"))

                if not legacy_tables:
                    self.stdout.write("Nenhuma tabela legada edge_edgeeventreceipt_legacy_* encontrada.")
