#!/usr/bin/env bash
set -euo pipefail

GRACE_MINUTES="${EVENT_RECEIPTS_GRACE_MINUTES:-5}"
LIMIT="${EVENT_RECEIPTS_BACKFILL_LIMIT:-20000}"
MAX_PENDING="${EVENT_RECEIPTS_MAX_PENDING:-50}"

echo "[render-job] backfill_event_receipts_processed_at grace=${GRACE_MINUTES}m limit=${LIMIT}"
python manage.py backfill_event_receipts_processed_at \
  --grace-minutes "${GRACE_MINUTES}" \
  --limit "${LIMIT}"

echo "[render-job] event_receipts_processing_health grace=${GRACE_MINUTES}m max_pending=${MAX_PENDING}"
python manage.py event_receipts_processing_health \
  --grace-minutes "${GRACE_MINUTES}" \
  --max-pending "${MAX_PENDING}" \
  --fail-on-breach
