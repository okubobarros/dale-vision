# Edge Install Runbook

## Objetivo
Instalar e iniciar o edge-agent em ambiente de loja.

## Pré-requisitos
- Máquina com acesso às câmeras
- Acesso a uma store válida

## Passos
1. Solicitar credenciais via `GET /api/v1/stores/{store_id}/edge-setup/`
2. Configurar `.env` com `EDGE_TOKEN`, `STORE_ID`, `AGENT_ID`, `CLOUD_BASE_URL`
3. Iniciar o agent
4. Validar heartbeat via `/api/v1/stores/{store_id}/edge-status/`

## Verificações
- Edge status `online` ou `degraded`
- `last_heartbeat` recente

## Erros comuns
- Token inválido (`X-EDGE-TOKEN`)
- Store sem permissão
