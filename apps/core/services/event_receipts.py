import json
import uuid
from typing import Any, Dict, Optional

from django.db import connection
from django.test.testcases import DatabaseOperationForbidden
from django.utils import timezone


def build_pdv_receipt_id(*, store_id: str, source_system: str, transaction_id: str) -> str:
    base = f"pdv:{store_id}:{source_system}:{transaction_id}"
    return str(uuid.uuid5(uuid.NAMESPACE_URL, base))


def insert_event_receipt_if_new(
    *,
    event_id: str,
    event_name: str,
    source: str,
    payload: Dict[str, Any],
    meta: Optional[Dict[str, Any]] = None,
) -> bool:
    raw = json.dumps(payload or {}, ensure_ascii=False)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO public.event_receipts (event_id, event_name, event_version, ts, source, raw, meta)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
            ON CONFLICT (event_id) DO NOTHING
            """,
            [
                str(event_id),
                str(event_name),
                1,
                timezone.now(),
                str(source or "app"),
                raw,
                json.dumps(meta or {}),
            ],
        )
        return cursor.rowcount == 1


def mark_event_receipt_processed(*, event_id: Optional[str]) -> None:
    if not event_id:
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE public.event_receipts
                SET processed_at = now(),
                    last_error = NULL,
                    attempt_count = COALESCE(attempt_count, 0) + 1,
                    updated_at = now()
                WHERE event_id = %s
                """,
                [str(event_id)],
            )
    except DatabaseOperationForbidden:
        return


def mark_event_receipt_failed(*, event_id: Optional[str], error_message: str) -> None:
    if not event_id:
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE public.event_receipts
                SET attempt_count = COALESCE(attempt_count, 0) + 1,
                    last_error = %s,
                    updated_at = now()
                WHERE event_id = %s
                """,
                [str(error_message or "processing_failed")[:500], str(event_id)],
            )
    except DatabaseOperationForbidden:
        return
