#!/usr/bin/env bash
set -euo pipefail

TARGET_DATE="${COPILOT_LEDGER_REBUILD_DATE:-$(date -u -d 'yesterday' +%F)}"
ORG_ID="${COPILOT_LEDGER_REBUILD_ORG_ID:-}"
STORE_ID="${COPILOT_LEDGER_REBUILD_STORE_ID:-}"
DELETE_ORPHANS="${COPILOT_LEDGER_REBUILD_DELETE_ORPHANS:-0}"
SNAPSHOT_DAYS="${COPILOT_LEDGER_SNAPSHOT_DAYS:-7}"
SNAPSHOT_MAX_STORES="${COPILOT_LEDGER_SNAPSHOT_MAX_STORES:-500}"
SNAPSHOT_SLO_SECONDS="${COPILOT_LEDGER_SNAPSHOT_SLO_SECONDS:-900}"

echo "[render-job] rebuild_value_ledger_daily date=${TARGET_DATE} store_id=${STORE_ID:-all} org_id=${ORG_ID:-all} delete_orphans=${DELETE_ORPHANS}"

cmd=(
  python manage.py rebuild_value_ledger_daily
  --date "${TARGET_DATE}"
)

if [[ -n "${STORE_ID}" ]]; then
  cmd+=(--store-id "${STORE_ID}")
fi
if [[ -n "${ORG_ID}" ]]; then
  cmd+=(--org-id "${ORG_ID}")
fi
if [[ "${DELETE_ORPHANS}" == "1" ]]; then
  cmd+=(--delete-orphans)
fi

"${cmd[@]}"

echo "[render-job] copilot_value_ledger_health_snapshot days=${SNAPSHOT_DAYS} max_stores=${SNAPSHOT_MAX_STORES} slo=${SNAPSHOT_SLO_SECONDS}s"
python manage.py copilot_value_ledger_health_snapshot \
  --days "${SNAPSHOT_DAYS}" \
  --max-stores "${SNAPSHOT_MAX_STORES}" \
  --slo-target-seconds "${SNAPSHOT_SLO_SECONDS}"
