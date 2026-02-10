# Deploy Render

Python:
- Preferably set `PYTHON_VERSION=3.12.3` in Render env vars (fully qualified), or rely on `.python-version` at repo root.
- `runtime.txt` is ignored by Render (safe to keep for other platforms).

Build:
`pip install -U pip setuptools wheel && pip install -r requirements.prod.txt`

Start:
`bash -lc "python manage.py migrate --noinput && gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --timeout 120"`

Variaveis recomendadas:
- PYTHON_VERSION=3.12.3
- DJANGO_SECRET_KEY
- DEBUG=0
- ALLOWED_HOSTS=api.dalevision.com,.onrender.com
- CORS_ALLOWED_ORIGINS=https://app.dalevision.com,https://dalevision.com,https://www.dalevision.com
- CSRF_TRUSTED_ORIGINS=https://app.dalevision.com,https://api.dalevision.com,https://dalevision.com,https://www.dalevision.com
- DATABASE_URL=...
- N8N_EVENTS_WEBHOOK
