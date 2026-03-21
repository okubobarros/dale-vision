#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-10000}"
WEB_CONCURRENCY="${WEB_CONCURRENCY:-1}"
GUNICORN_THREADS="${GUNICORN_THREADS:-4}"
GUNICORN_KEEPALIVE="${GUNICORN_KEEPALIVE:-10}"
GUNICORN_MAX_REQUESTS="${GUNICORN_MAX_REQUESTS:-1000}"
GUNICORN_MAX_REQUESTS_JITTER="${GUNICORN_MAX_REQUESTS_JITTER:-100}"
GUNICORN_WORKER_CLASS="${GUNICORN_WORKER_CLASS:-gthread}"

exec gunicorn backend.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --worker-class "${GUNICORN_WORKER_CLASS}" \
  --workers "${WEB_CONCURRENCY}" \
  --threads "${GUNICORN_THREADS}" \
  --keep-alive "${GUNICORN_KEEPALIVE}" \
  --max-requests "${GUNICORN_MAX_REQUESTS}" \
  --max-requests-jitter "${GUNICORN_MAX_REQUESTS_JITTER}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
