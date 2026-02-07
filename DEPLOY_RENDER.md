# Deploy Render

Build:
`pip install -r requirements.prod.txt`

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
