#!/usr/bin/env bash
set -euo pipefail

WINDOW_MINUTES="${COPILOT_OPERATIONAL_WINDOW_MINUTES:-5}"
MAX_STORES="${COPILOT_OPERATIONAL_WINDOW_MAX_STORES:-500}"

echo "[render-job] copilot_operational_window_tick window=${WINDOW_MINUTES} max_stores=${MAX_STORES}"
python manage.py copilot_operational_window_tick \
  --window-minutes "${WINDOW_MINUTES}" \
  --max-stores "${MAX_STORES}"
