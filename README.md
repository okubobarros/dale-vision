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

## Render (build/start)

Build Command:
`bash bin/render_build.sh`

Start Command:
`bash bin/render_start.sh`

Observações:
- O start **não** roda migrate/collectstatic para evitar timeout no port scan.
- O gunicorn deve bindar em `0.0.0.0:$PORT` (Render usa `PORT`, default 10000).

## Repo (git)

- `.agent/skills-src/` contém um repositório git interno usado por ferramentas locais.
- Mantenha em `.gitignore` para evitar o warning de "embedded git repository" e submodules acidentais.
