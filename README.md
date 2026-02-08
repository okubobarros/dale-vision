# Dale Vision

## Dependencias

Render:
`pip install -r requirements.prod.txt`

Dev local:
`pip install -r requirements.txt`

## Render (env vars)

- DJANGO_SECRET_KEY
- DEBUG=0
- DATABASE_URL=...
- N8N_EVENTS_WEBHOOK
- ALLOWED_HOSTS=api.dalevision.com,.onrender.com
- CORS_ALLOWED_ORIGINS=https://app.dalevision.com,https://dalevision.com,https://www.dalevision.com,http://localhost:5173
- CSRF_TRUSTED_ORIGINS=https://app.dalevision.com,https://api.dalevision.com,https://dalevision.com,https://www.dalevision.com
