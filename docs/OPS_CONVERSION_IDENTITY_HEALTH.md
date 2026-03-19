# OPS: Conversion Identity Health

## Finalidade
Reduzir agressivamente nulos críticos de `conversion_metrics`:
- `metric_type`
- `roi_entity_id`

e manter monitoramento com threshold de regressão.

## Comando de backfill
```bash
python manage.py backfill_conversion_metric_identity --limit 200
```

Parâmetros úteis:
- `--store-id <uuid>`
- `--from YYYY-MM-DD --to YYYY-MM-DD`
- `--dry-run`

## Comando de health check
```bash
python manage.py conversion_metrics_identity_health --max-null-rate 65 --fail-on-breach
```

Parâmetros úteis:
- `--store-id <uuid>`
- `--json-output <path>`

## Job Render (cron)
Comando:
```bash
bash bin/render_job_conversion_identity_health.sh
```

Variáveis opcionais:
- `CONVERSION_IDENTITY_BACKFILL_LIMIT` (default `200`)
- `CONVERSION_IDENTITY_BACKFILL_BATCHES` (default `2`)
- `CONVERSION_IDENTITY_MAX_NULL_RATE` (default `65`)
- `CONVERSION_IDENTITY_STORE_ID` (opcional)

## Workflow GitHub Actions
Arquivo:
- `.github/workflows/conversion_metrics_identity_health.yml`

Comportamento:
- roda de hora em hora (`40 * * * *`);
- executa batches de backfill;
- gera snapshot JSON;
- falha quando `null_rate_pct > max_null_rate`.

Artifact:
- `conversion-metrics-identity-health` com `conversion_metrics_identity_health.json`.

## Estratégia de endurecimento de threshold
- Semana atual: `max_null_rate=65`.
- Semana seguinte: reduzir para `40`.
- Semana 3: reduzir para `20`.
- Meta final de produção: `<=5`.
