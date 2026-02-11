#!/usr/bin/env bash
set -euo pipefail

echo "[render] migrate"
python manage.py migrate --noinput

echo "[render] collectstatic"
python manage.py collectstatic --noinput
