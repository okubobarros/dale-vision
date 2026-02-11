#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-10000}"

exec gunicorn backend.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
