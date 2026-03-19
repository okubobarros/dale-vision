#!/usr/bin/env bash
set -euo pipefail

BATCH_LIMIT="${CONVERSION_IDENTITY_BACKFILL_LIMIT:-200}"
BATCHES="${CONVERSION_IDENTITY_BACKFILL_BATCHES:-2}"
MAX_NULL_RATE="${CONVERSION_IDENTITY_MAX_NULL_RATE:-65}"
STORE_ID="${CONVERSION_IDENTITY_STORE_ID:-}"

echo "[render-job] conversion identity backfill batches=${BATCHES} limit=${BATCH_LIMIT} store_id=${STORE_ID:-all}"
for i in $(seq 1 "${BATCHES}"); do
  if [[ -n "${STORE_ID}" ]]; then
    python manage.py backfill_conversion_metric_identity --store-id "${STORE_ID}" --limit "${BATCH_LIMIT}"
  else
    python manage.py backfill_conversion_metric_identity --limit "${BATCH_LIMIT}"
  fi
done

echo "[render-job] conversion identity health max_null_rate=${MAX_NULL_RATE}%"
if [[ -n "${STORE_ID}" ]]; then
  python manage.py conversion_metrics_identity_health \
    --store-id "${STORE_ID}" \
    --max-null-rate "${MAX_NULL_RATE}" \
    --fail-on-breach
else
  python manage.py conversion_metrics_identity_health \
    --max-null-rate "${MAX_NULL_RATE}" \
    --fail-on-breach
fi
