# OPS: Event Receipts Processing Health

## Finalidade
Manter `event_receipts.processed_at` consistente em produção e alertar regressões de pendências envelhecidas.

## Comando de backfill
```bash
python manage.py backfill_event_receipts_processed_at --grace-minutes 5 --limit 20000
```

## Comando de health check
```bash
python manage.py event_receipts_processing_health --grace-minutes 5 --max-pending 50 --fail-on-breach
```

Parâmetros úteis:
- `--json-output <path>`: salva snapshot para evidência.
- `--fail-on-breach`: retorna erro quando `pending_aged > max_pending`.

## Job Render (cron)
Comando:
```bash
bash bin/render_job_event_receipts_processing.sh
```

Variáveis opcionais:
- `EVENT_RECEIPTS_GRACE_MINUTES` (default `5`)
- `EVENT_RECEIPTS_BACKFILL_LIMIT` (default `20000`)
- `EVENT_RECEIPTS_MAX_PENDING` (default `50`)

## Workflow GitHub Actions
Arquivo:
- `.github/workflows/event_receipts_processing_health.yml`

Comportamento:
- agenda de hora em hora (`20 * * * *`);
- executa backfill;
- gera snapshot JSON;
- falha o job quando `pending_aged` ultrapassa threshold.

Artifact:
- `event-receipts-processing-health` com `event_receipts_processing_health.json`.
