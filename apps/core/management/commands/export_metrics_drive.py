from __future__ import annotations

import csv
import json
import os
import tempfile
from datetime import datetime, timedelta
from typing import Iterable, Tuple
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand
from django.db import connection

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


DEFAULT_TZ = "America/Sao_Paulo"
SCOPES = ["https://www.googleapis.com/auth/drive.file"]


TABLE_CONFIG = {
    "traffic_metrics": {
        "ts_column": "ts_bucket",
    },
    "conversion_metrics": {
        "ts_column": "ts_bucket",
    },
    "event_receipts": {
        "ts_column": "received_at",
    },
}


def _env(name: str, default: str | None = None) -> str | None:
    return os.getenv(name, default)


def _parse_date(date_str: str, tz_name: str) -> Tuple[datetime, datetime]:
    tz = ZoneInfo(tz_name)
    day = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=tz)
    start = day
    end = day + timedelta(days=1)
    return start, end


def _default_window(tz_name: str) -> Tuple[datetime, datetime, str]:
    tz = ZoneInfo(tz_name)
    now = datetime.now(tz)
    day = (now - timedelta(days=1)).date()
    start = datetime(day.year, day.month, day.day, tzinfo=tz)
    end = start + timedelta(days=1)
    return start, end, start.strftime("%Y-%m-%d")


def _query_table(table: str, ts_column: str, start: datetime, end: datetime) -> Tuple[Iterable[str], Iterable[tuple]]:
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT *
            FROM public.{table}
            WHERE {ts_column} >= %s AND {ts_column} < %s
            ORDER BY {ts_column} ASC
            """,
            [start, end],
        )
        rows = cursor.fetchall()
        headers = [col.name for col in cursor.description]
    return headers, rows


def _write_csv(path: str, headers: Iterable[str], rows: Iterable[tuple]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)


def _build_drive_service(sa_json_path: str):
    creds = service_account.Credentials.from_service_account_file(
        sa_json_path, scopes=SCOPES
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _upload_file(service, folder_id: str, file_path: str, filename: str) -> str:
    file_metadata = {
        "name": filename,
        "parents": [folder_id],
    }
    media = MediaFileUpload(file_path, mimetype="text/csv", resumable=False)
    uploaded = service.files().create(
        body=file_metadata, media_body=media, fields="id"
    ).execute()
    return uploaded.get("id")


def _cleanup_table(table: str, ts_column: str, ttl_days: int) -> int:
    if ttl_days <= 0:
        return 0
    with connection.cursor() as cursor:
        cursor.execute(
            f"DELETE FROM public.{table} WHERE {ts_column} < (now() - interval '%s days')",
            [ttl_days],
        )
        return cursor.rowcount or 0


class Command(BaseCommand):
    help = "Exporta métricas para Google Drive (CSV diário) e aplica retenção."

    def add_arguments(self, parser):
        parser.add_argument("--date", help="Data YYYY-MM-DD (default: ontem, TZ local)")
        parser.add_argument("--tz", help="Timezone (default America/Sao_Paulo)")
        parser.add_argument("--tables", help="Lista de tabelas separadas por vírgula")
        parser.add_argument("--no-cleanup", action="store_true", help="Não executar retenção")

    def handle(self, *args, **options):
        tz_name = options.get("tz") or _env("GOOGLE_DRIVE_EXPORT_TZ", DEFAULT_TZ)
        if options.get("date"):
            start, end = _parse_date(options["date"], tz_name)
            date_label = options["date"]
        else:
            start, end, date_label = _default_window(tz_name)

        tables_raw = options.get("tables") or _env(
            "GOOGLE_DRIVE_EXPORT_TABLES",
            "traffic_metrics,conversion_metrics,event_receipts",
        )
        tables = [t.strip() for t in tables_raw.split(",") if t.strip()]

        sa_json = _env("GOOGLE_DRIVE_SA_JSON")
        folder_id = _env("GOOGLE_DRIVE_FOLDER_ID")
        if not sa_json or not folder_id:
            raise RuntimeError("GOOGLE_DRIVE_SA_JSON e GOOGLE_DRIVE_FOLDER_ID são obrigatórios.")
        if not os.path.exists(sa_json):
            raise RuntimeError(f"Service account JSON não encontrado: {sa_json}")

        service = _build_drive_service(sa_json)
        tmpdir = tempfile.mkdtemp(prefix="dalevision-export-")

        self.stdout.write(f"[EXPORT] window={start.isoformat()} -> {end.isoformat()} tz={tz_name}")
        self.stdout.write(f"[EXPORT] tables={tables}")

        for table in tables:
            cfg = TABLE_CONFIG.get(table)
            if not cfg:
                self.stdout.write(f"[WARN] tabela desconhecida: {table} (skip)")
                continue
            headers, rows = _query_table(table, cfg["ts_column"], start, end)
            filename = f"{table}_{date_label}.csv"
            path = os.path.join(tmpdir, filename)
            _write_csv(path, headers, rows)
            file_id = _upload_file(service, folder_id, path, filename)
            self.stdout.write(f"[EXPORT] {table}: {len(rows)} rows -> {filename} (drive_id={file_id})")

        if not options.get("no_cleanup"):
            traffic_ttl = int(_env("TRAFFIC_METRICS_TTL_DAYS", "90") or 90)
            conversion_ttl = int(_env("CONVERSION_METRICS_TTL_DAYS", "90") or 90)
            receipts_ttl = int(_env("EVENT_RECEIPTS_TTL_DAYS", "14") or 14)
            deleted = {}
            deleted["traffic_metrics"] = _cleanup_table(
                "traffic_metrics", TABLE_CONFIG["traffic_metrics"]["ts_column"], traffic_ttl
            )
            deleted["conversion_metrics"] = _cleanup_table(
                "conversion_metrics", TABLE_CONFIG["conversion_metrics"]["ts_column"], conversion_ttl
            )
            deleted["event_receipts"] = _cleanup_table(
                "event_receipts", TABLE_CONFIG["event_receipts"]["ts_column"], receipts_ttl
            )
            self.stdout.write(f"[CLEANUP] {json.dumps(deleted, ensure_ascii=False)}")

