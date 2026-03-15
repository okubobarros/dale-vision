# Scheduler Operacional (Sprint 1)

## Objetivo
Materializar `operational_window_hourly` a cada 5 minutos para alimentar:
- `/api/v1/productivity/coverage`
- `/api/v1/stores/:store_id/productivity/coverage`
- blocos de aderência operacional no Dashboard/Store View

## Comando de produção
```bash
bash bin/render_job_operational_window.sh
```

O script usa:
- `COPILOT_OPERATIONAL_WINDOW_MINUTES` (default `5`, aceita `10`)
- `COPILOT_OPERATIONAL_WINDOW_MAX_STORES` (default `500`)

## Política de retenção (`operational_window_hourly`)
Comando:
```bash
python manage.py copilot_operational_window_cleanup --retention-days 30
```

Parâmetros:
- `--retention-days` (default `30`)
- `--store-id` (opcional para limpeza pontual)
- `--window-minutes` (opcional, ex.: `5`)
- `--dry-run` (simula sem deletar)

## Setup no Render (Cron Job)
Criar um **Cron Job** com:
- **Command**: `bash bin/render_job_operational_window.sh`
- **Schedule**: `*/5 * * * *`
- **Environment**: mesmo backend (`DATABASE_URL`, `DJANGO_SECRET_KEY`, etc.)

## Smoke test manual
```bash
python manage.py copilot_operational_window_tick --max-stores 5 --window-minutes 5
```

Saída esperada:
- linhas `[op_window] ... confidence=...`
- resumo `copilot_operational_window_tick concluído`

## Verificação pós-deploy
1. Abrir `/app/reports` e confirmar `method.version = coverage_operational_window_v1_2026-03-14`.
2. Abrir Store View e confirmar tabela de aderência com janelas de 5 minutos.
3. Validar que `confidence_governance.score` está preenchido.

## Rollback rápido
1. Pausar o Cron Job.
2. Frontend continua com fallback de leitura legada por hora.
3. Retomar o cron após ajuste.

## Alternativa sem Render Jobs: GitHub Actions
Use o workflow:
- `.github/workflows/copilot_operational_window_tick.yml`

Ele executa:
- agendado a cada 5 min (`*/5 * * * *`)
- manualmente via `workflow_dispatch`

Cleanup diário:
- `.github/workflows/copilot_operational_window_cleanup.yml`
- agenda: `03:17 UTC` (diário)
- comando: `copilot_operational_window_cleanup --retention-days 30`

### Secrets obrigatórios (GitHub Repository Secrets)
- `DJANGO_SECRET_KEY`
- `ALLOWED_HOSTS`
- `DATABASE_URL`

### Secrets não necessários para este workflow
- `EDGE_SERVICE_USERNAME`
- `EDGE_AGENT_TOKEN`
- `EDGE_SHARED_TOKEN`
- `STORE_ID`, `EDGE_TOKEN` por loja (não usar aqui)

### Variáveis opcionais (GitHub Repository Variables)
- `COPILOT_OPERATIONAL_WINDOW_MINUTES` (default `5`)
- `COPILOT_OPERATIONAL_WINDOW_MAX_STORES` (default `500`)
- `COPILOT_OPERATIONAL_WINDOW_RETENTION_DAYS` (default `30`)

### Observações
- O cron do GitHub usa UTC e pode ter atraso de poucos minutos.
- Em pico, prefira reduzir `MAX_STORES` para manter execução abaixo de 10 minutos.

## Checklist de Fechamento (Sprint 1)
- [x] Tick operacional agendado (`copilot_operational_window_tick.yml`).
- [x] Cleanup diário agendado (`copilot_operational_window_cleanup.yml`).
- [x] API de cobertura em produção com `method.version` versionado.
- [x] Dashboard/Reports/Store View exibindo confiança + saúde de ingestão.
- [x] Endpoints de ingestão com `operational_window.status` e `coverage_rate`.
- [x] Fluxo de ação com `action_dispatched`:
  - via `delegate-whatsapp` por evento;
  - via endpoint genérico `POST /api/v1/alerts/actions/dispatch/`.
- [x] Lint/build frontend e testes backend críticos executados.
