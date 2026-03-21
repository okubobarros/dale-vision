# Render Free - Configuração Estável (Aplicada)

- Data: 2026-03-21
- Ambiente: `api.dalevision.com` (Render Web Service `dale-vision`)
- Objetivo: reduzir `503`/`Acordando servidor` sem upgrade imediato de plano.

## Mudanças aplicadas

## Render
- Plano mantido em `Free` (sem always-on neste momento).
- `Build Command` mantido em:
  - `pip install -U pip setuptools wheel && pip install -r requirements.prod.txt`
- `Start Command` alterado para:
  - `bash bin/render_start.sh`
- `Health Check Path` validado em:
  - `/health/`
- Ajustes de runtime via Environment:
  - `WEB_CONCURRENCY=1`
  - `GUNICORN_THREADS=4`
  - `GUNICORN_WORKER_CLASS=gthread`
  - `GUNICORN_KEEPALIVE=10`
  - `GUNICORN_MAX_REQUESTS=1000`
  - `GUNICORN_MAX_REQUESTS_JITTER=100`

## GitHub Actions
- Workflow ativo: `.github/workflows/keep_api_warm.yml`
- Status: execução manual confirmada (`Keep API Warm #1`).
- Janela operacional aplicada (BRT):
  - `08:00-22:00`, intervalo de `15 min`.
- Cron efetivo (UTC):
  - `*/15 11-23 * * *`
  - `*/15 0-1 * * *`

## Frontend (mitigação UX)
- Redução de retries/refetch em endpoints best-effort da tela de câmeras.
- Feedback consolidado para indisponibilidade (`503/ERR_NETWORK`) com cooldown.
- Objetivo: evitar tempestade de requests e ruído ao usuário.

## Limitações conhecidas (Free)
- Free pode hibernar instância e aumentar latência de primeiro acesso.
- Ainda pode ocorrer indisponibilidade transitória em janela de spin-up ou restart de plataforma.

## Próxima etapa (semana seguinte)
- Migrar para Starter (always-on) para eliminar spin-down em horário de operação.
- Manter deploy manual fora do horário de loja.

## Checklist de validação pós-ajuste
1. `Actions` com runs agendados do `Keep API Warm`.
2. `Render Logs` sem sequência recorrente de `health check timed out after 5 seconds`.
3. Login em `app.dalevision.com` sem mensagem recorrente de “Acordando servidor”.
4. `/app/cameras` carregando `edge-status`, `cameras`, `limits` e `support` com `200`.
