# Deploy Render

Python:
- Preferably set `PYTHON_VERSION=3.12.3` in Render env vars (fully qualified), or rely on `.python-version` at repo root.

Build:
`pip install -U pip setuptools wheel && pip install -r requirements.prod.txt`

Predeploy:
`python manage.py migrate --noinput && python manage.py collectstatic --noinput`

Start:
`gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --timeout 120`

Variaveis obrigatorias:
- DJANGO_SECRET_KEY
- DEBUG=0
- ALLOWED_HOSTS
- CSRF_TRUSTED_ORIGINS
- DATABASE_URL
- N8N_EVENTS_WEBHOOK
