# Deploy Render

Python:
- Preferably set `PYTHON_VERSION=3.12.3` in Render env vars (fully qualified), or rely on `.python-version` at repo root.
- `runtime.txt` is ignored by Render (safe to keep for other platforms).

Build:
`pip install -U pip setuptools wheel && pip install -r requirements.prod.txt`

Start:
Build Command:
`bash bin/render_build.sh`

Start Command:
`bash bin/render_start.sh`

Nota:
- O start não deve executar migrate/collectstatic para não atrasar o bind do `PORT`.

Variaveis recomendadas:
- PYTHON_VERSION=3.12.3
- DJANGO_SECRET_KEY
- DEBUG=0
- ALLOWED_HOSTS=api.dalevision.com,.onrender.com
- CORS_ALLOWED_ORIGINS=https://app.dalevision.com,https://dalevision.com,https://www.dalevision.com
- CSRF_TRUSTED_ORIGINS=https://app.dalevision.com,https://api.dalevision.com,https://dalevision.com,https://www.dalevision.com
- DATABASE_URL=...
- N8N_EVENTS_WEBHOOK

## Cron Job (Sprint 1 - aderência operacional)
Para materializar `operational_window_hourly` continuamente:

1. Criar um Render Cron Job apontando para o mesmo repo/branch do backend.
2. Command:
`bash bin/render_job_operational_window.sh`
3. Schedule:
`*/5 * * * *`
4. Variáveis opcionais:
- `COPILOT_OPERATIONAL_WINDOW_MINUTES=5`
- `COPILOT_OPERATIONAL_WINDOW_MAX_STORES=500`

Smoke manual:
`python manage.py copilot_operational_window_tick --max-stores 5 --window-minutes 5`

Sem Render Jobs (plano Free):
- usar GitHub Actions agendado (`.github/workflows/copilot_operational_window_tick.yml`)

## Cron Job (Sprint 2 - rebuild diário do ledger)
Para recompor `value_ledger_daily` (D-1) e gerar evidência de saúde:

1. Criar um Render Cron Job apontando para o mesmo repo/branch do backend.
2. Command:
`bash bin/render_job_value_ledger_daily.sh`
3. Schedule:
`10 3 * * *`
4. Variáveis opcionais:
- `COPILOT_LEDGER_REBUILD_DATE` (default: ontem UTC)
- `COPILOT_LEDGER_REBUILD_ORG_ID`
- `COPILOT_LEDGER_REBUILD_STORE_ID`
- `COPILOT_LEDGER_REBUILD_DELETE_ORPHANS=0|1`
- `COPILOT_LEDGER_SNAPSHOT_DAYS=7`
- `COPILOT_LEDGER_SNAPSHOT_MAX_STORES=500`
- `COPILOT_LEDGER_SNAPSHOT_SLO_SECONDS=900`

Smoke manual:
`python manage.py rebuild_value_ledger_daily --date 2026-03-18`

Sem Render Jobs (plano Free):
- usar GitHub Actions agendado (`.github/workflows/copilot_value_ledger_rebuild_daily.yml`)

## Cron Job (Qualidade de receipts processados)
Para manter `event_receipts.processed_at` sem passivo e sinalizar regressão:

1. Criar um Render Cron Job no backend.
2. Command:
`bash bin/render_job_event_receipts_processing.sh`
3. Schedule:
`20 * * * *`
4. Variáveis opcionais:
- `EVENT_RECEIPTS_GRACE_MINUTES=5`
- `EVENT_RECEIPTS_BACKFILL_LIMIT=20000`
- `EVENT_RECEIPTS_MAX_PENDING=50`

Smoke manual:
`python manage.py event_receipts_processing_health --grace-minutes 5 --max-pending 50`

Sem Render Jobs (plano Free):
- usar GitHub Actions agendado (`.github/workflows/event_receipts_processing_health.yml`)

## Cron Job (Qualidade de identidade em conversion_metrics)
Para reduzir e monitorar nulos de `metric_type` e `roi_entity_id`:

1. Criar um Render Cron Job no backend.
2. Command:
`bash bin/render_job_conversion_identity_health.sh`
3. Schedule:
`40 * * * *`
4. Variáveis opcionais:
- `CONVERSION_IDENTITY_BACKFILL_LIMIT=200`
- `CONVERSION_IDENTITY_BACKFILL_BATCHES=2`
- `CONVERSION_IDENTITY_MAX_NULL_RATE=65`
- `CONVERSION_IDENTITY_STORE_ID` (opcional)

Smoke manual:
`python manage.py conversion_metrics_identity_health --max-null-rate 65`

Sem Render Jobs (plano Free):
- usar GitHub Actions agendado (`.github/workflows/conversion_metrics_identity_health.yml`)
