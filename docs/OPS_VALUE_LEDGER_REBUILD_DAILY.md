# OPS: Value Ledger Rebuild Daily

## Finalidade
Executar rebuild diário de `value_ledger_daily` (D-1) com evidência operacional do estado pós-rebuild.

Esse job fecha duas necessidades:
- recomposição determinística de ledger em caso de atraso/erro no ingest;
- trilha auditável do resultado via snapshot JSON.

## Comando padrão (Render Cron Job)
```bash
bash bin/render_job_value_ledger_daily.sh
```

Variáveis opcionais:
- `COPILOT_LEDGER_REBUILD_DATE`: força data (`YYYY-MM-DD`). Default: ontem em UTC.
- `COPILOT_LEDGER_REBUILD_STORE_ID`: rebuild de uma loja específica.
- `COPILOT_LEDGER_REBUILD_ORG_ID`: rebuild de uma organização específica.
- `COPILOT_LEDGER_REBUILD_DELETE_ORPHANS`: `1` remove linhas sem outcome no período.
- `COPILOT_LEDGER_SNAPSHOT_DAYS`: janela do snapshot pós-rebuild (default `7`).
- `COPILOT_LEDGER_SNAPSHOT_MAX_STORES`: limite de lojas no snapshot (default `500`).
- `COPILOT_LEDGER_SNAPSHOT_SLO_SECONDS`: SLO de frescor no snapshot (default `900`).

## Setup no Render
Criar um **Cron Job** com:
- **Command**: `bash bin/render_job_value_ledger_daily.sh`
- **Schedule**: `10 3 * * *` (03:10 UTC / 00:10 BRT)
- **Environment**: mesmo backend (`DATABASE_URL`, `DJANGO_SECRET_KEY`, etc.)

## Automação via GitHub Actions
Workflow:
- `.github/workflows/copilot_value_ledger_rebuild_daily.yml`

Comportamento:
- `schedule`: diário às `03:10 UTC`.
- `workflow_dispatch`: permite data/loja/org manualmente.
- gera artifact `value-ledger-rebuild-evidence` com:
  - `value_ledger_health_snapshot_after_rebuild.json`.

## Smoke test manual
```bash
python manage.py rebuild_value_ledger_daily --date 2026-03-18
python manage.py copilot_value_ledger_health_snapshot --days 7 --max-stores 20 --slo-target-seconds 900
```

## Evidência mínima de aceite diário
- `rebuild_value_ledger_daily concluído` no log.
- artifact JSON gerado no workflow agendado.
- `coverage_rate` do snapshot sem regressão vs dia anterior.

## Rollback rápido
1. Pausar cron (`Render` e/ou workflow schedule).
2. Rodar manual por loja com `--store-id` para correções pontuais.
3. Reativar agendamento após validar snapshot.
