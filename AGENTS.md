# AGENTS

## Visão geral do sistema
- Frontend: React + Vite (`frontend/`), rotas públicas e área logada sob `/app`.
- Backend: Django (`backend/`, `manage.py` na raiz) expõe APIs e integrações.
- Supabase: Auth e dados auxiliares (frontend usa anon key; backend usa service role).
- n8n: automações via webhook (`N8N_EVENTS_WEBHOOK`) disparadas pelo backend.
- Edge-agent: agente local/edge (`edge-agent/`) que se autentica com tokens e envia dados ao backend.

## Comandos padrão
Frontend (rodar em `frontend/`):
- Dev: `pnpm dev`
- Build: `pnpm build`
- Test: `pnpm lint` (até testes automatizados existirem)

Backend (rodar na raiz do repo, onde está `manage.py`):
- Dev: `python manage.py runserver`
- Build (deploy): `pip install -U pip setuptools wheel && pip install -r requirements.prod.txt`
- Test: `python manage.py test`

## Convenções de env vars
Geral:
- Nunca commitar segredos.
- Frontend usa prefixo `VITE_` (exposto ao browser). Backend e edge-agent não usam `VITE_`.

Frontend (exemplos em `frontend/.env.example`):
- `VITE_API_BASE_URL` (base da API, sem hardcode)
- `VITE_SITE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend:
- `DJANGO_SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_KEY` (service role; não usar no frontend)
- `N8N_EVENTS_WEBHOOK`
- `EDGE_AGENT_TOKEN`, `EDGE_SHARED_TOKEN`, `EDGE_SERVICE_USERNAME` (integração edge)

Edge-agent:
- `CLOUD_BASE_URL`
- `EDGE_TOKEN` (aceita fallback `DALE_EDGE_TOKEN`)
- `STORE_ID`, `AGENT_ID`
- `EDGE_CLOUD_TOKEN` (quando aplicável)

## Convenções de rotas do app
- Públicas: `/`, `/login`, `/auth/callback`, `/agendar-demo`, `/register`, `/onboarding`, `/onboarding/success`.
- Protegidas: tudo sob `/app/*` (ex.: `/app/dashboard`, `/app/stores`, `/app/alerts`).
- Compat: rotas antigas sem `/app` devem redirecionar para `/app/*`.

## Regras
- Evitar hardcode de `localhost` ou URLs absolutas; sempre usar env (`VITE_API_BASE_URL`, `VITE_SITE_URL`, `CLOUD_BASE_URL`).
- Sempre usar env vars para integrações externas (Supabase, n8n, edge).
- Sempre logar falhas de integração (ex.: requests externos, webhooks, auth third‑party).

## Definition of Done (auth/onboarding/trial)
- Fluxos cobertos ponta a ponta: login, registro, callback, onboarding e trial.
- Validação de permissões em rotas `/app/*` e redirects públicos.
- Erros de integração logados e com mensagens de usuário adequadas.
- Supabase e backend com chaves corretas (anon no frontend, service role só no backend).
- Eventos relevantes enviados ao n8n quando aplicável.
- Migrações e variáveis necessárias documentadas.
- Testes atualizados ou justificativa registrada quando não aplicáveis.
