# Incidente: API 503 + CORS (App Cameras/Admin)

- Data: 2026-03-21
- Severidade: Alta (degradação crítica de UX)
- Contexto: loja em operação, telas `/app/cameras` e áreas administrativas com erro recorrente.

## Sintoma observado
- Frontend loga múltiplos erros:
  - `net::ERR_FAILED 503 (Service Unavailable)`
  - `No 'Access-Control-Allow-Origin' header is present...`
- Usuário percebe "Acordando servidor... tente novamente" e dados não carregam.

## Causa técnica (consolidada)
- O erro principal é indisponibilidade temporária do backend (`503`) no `https://api.dalevision.com`.
- Em parte dos 503, a resposta não vem do Django (vem do gateway/plataforma), por isso não inclui cabeçalhos CORS.
- O browser reporta como erro de CORS, mas o evento raiz é backend indisponível.
- Havia efeito cascata de chamadas best-effort na tela de câmeras, amplificando ruído e piorando UX.

## Evidências
- Console do browser com falhas simultâneas em:
  - `/api/v1/onboarding/progress/`
  - `/api/v1/onboarding/next-step/`
  - `/api/v1/stores/{id}/limits/`
  - `/api/v1/stores/{id}/support/requests/`
  - `/api/v1/stores/{id}/cameras/`
  - `/api/v1/stores/{id}/edge-status/`
- Mensagens repetidas de `503` + `ERR_NETWORK` + alerta CORS.
- Logs Render (janela crítica):
  - `22:21:12` recebeu `Handling signal: term` e finalizou worker/master.
  - Depois do shutdown, houve lacuna até nova atividade por volta de `00:03:53`.
  - Após retomada, OPTIONS/GET voltaram `200` para os mesmos endpoints.
  - Isso confirma indisponibilidade transitória do serviço (restart/hibernação) como gatilho primário.
- Print de Events no Render:
  - Banner explícito: `Your free instance will spin down with inactivity, which can delay requests by 50 seconds or more.`
  - Eventos repetidos de `Instance failed: HTTP health check failed (timed out after 5 seconds)` seguidos de `Service recovered`.
  - Eventos de `Deploy started/live` ao longo do dia, aumentando risco de interrupção em horário de uso.

## Correções aplicadas (frontend)
- Redução de pressão em endpoints best-effort:
  - `onboarding.getProgress`: `timeoutCategory=best-effort`, `noRetry=true`.
  - `cameras.getStoreCameras`: `timeoutCategory=best-effort`, `noRetry=true`.
  - `support.getMyStoreSupportRequests`: `timeoutCategory=best-effort`, `noRetry=true`.
- Tela de câmeras:
  - `retry:false` e `refetchOnWindowFocus:false` para queries de `edge-status`, `cameras`, `limits`, `support`.
- UX de indisponibilidade:
  - toast consolidado para `503/ERR_NETWORK`: `API indisponível no momento (503). Retentando automaticamente.`
  - redução de spam por cooldown.

## Ação definitiva necessária (infra/backend)
- Garantir disponibilidade contínua da API (evitar cold start/instância adormecida) no serviço `api.dalevision.com`.
- Garantir resposta de erro padronizada com CORS também em camada de borda (gateway/proxy) para não mascarar 503 como CORS.
- Revisar no Render o motivo de `SIGTERM` (`Deploy`, `Autoscaling`, `Maintenance`, `OOM`) na faixa `2026-03-20 22:21 BRT`.
- Se houver spin-down/hibernação: migrar para instância always-on (mínimo 1 instância ativa) durante horário de operação.
- Evitar deploy automático em horário de loja aberta (janela operacional protegida).
- Aplicar tuning de gunicorn para reduzir risco de health check timeout sob carga:
  - `worker_class=gthread`, `workers=1`, `threads=4`, `keepalive=10`, `max_requests=1000`, `max_requests_jitter=100`.
- SLO alvo:
  - disponibilidade API >= 99.9%
  - p95 de boot endpoint crítico < 2s
  - erro 503 em horário comercial < 0.1%

## Status
- Mitigação de UX aplicada no frontend.
- Pendência para fechamento definitivo: ajuste de disponibilidade/edge proxy no ambiente de produção.
