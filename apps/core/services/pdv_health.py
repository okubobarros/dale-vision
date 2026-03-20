from typing import Iterable, Optional

from django.db import connection
from django.utils import timezone


def _coerce_store_ids(store_ids: Optional[Iterable[str]]) -> list[str]:
    if not store_ids:
        return []
    return [str(store_id) for store_id in store_ids if store_id]


def get_pdv_ingestion_health(*, start, store_ids: Optional[Iterable[str]] = None) -> dict:
    store_ids_norm = _coerce_store_ids(store_ids)

    filters = ["event_name = %s", "ts >= %s"]
    params: list = ["pdv_transaction_ingest", start]
    if store_ids_norm:
        filters.append("(meta->>'store_id') = ANY(%s)")
        params.append(store_ids_norm)

    where_clause = " AND ".join(filters)

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                COUNT(*)::int AS total_receipts,
                COUNT(*) FILTER (WHERE processed_at IS NOT NULL AND COALESCE(last_error, '') = '')::int AS processed_total,
                COUNT(*) FILTER (WHERE COALESCE(last_error, '') <> '')::int AS failed_total,
                COUNT(*) FILTER (WHERE processed_at IS NULL AND COALESCE(last_error, '') = '')::int AS pending_total,
                MAX(ts) AS latest_received_at
            FROM public.event_receipts
            WHERE {where_clause}
            """,
            params,
        )
        row = cursor.fetchone() or [0, 0, 0, 0, None]

        cursor.execute(
            f"""
            SELECT last_error, COUNT(*)::int AS count
            FROM public.event_receipts
            WHERE {where_clause}
              AND COALESCE(last_error, '') <> ''
            GROUP BY last_error
            ORDER BY count DESC
            LIMIT 5
            """,
            params,
        )
        error_rows = cursor.fetchall() or []

    total_receipts = int(row[0] or 0)
    processed_total = int(row[1] or 0)
    failed_total = int(row[2] or 0)
    pending_total = int(row[3] or 0)
    latest_received_at = row[4].isoformat() if row[4] else None

    failure_rate = round((failed_total / total_receipts), 4) if total_receipts > 0 else 0.0
    processing_rate = round((processed_total / total_receipts), 4) if total_receipts > 0 else 0.0
    now = timezone.now()

    return {
        "from": start.isoformat(),
        "to": now.isoformat(),
        "total_receipts": total_receipts,
        "processed_total": processed_total,
        "failed_total": failed_total,
        "pending_total": pending_total,
        "processing_rate": processing_rate,
        "failure_rate": failure_rate,
        "latest_received_at": latest_received_at,
        "top_errors": [
            {"error": str(error or "unknown_error"), "count": int(count or 0)}
            for error, count in error_rows
        ],
    }
