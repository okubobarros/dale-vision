# SPEC-001 Edge Setup Wizard

## Objetivo
Guiar o usuário na instalação do Edge e validação de heartbeat.

## Não-objetivos
- Diagnóstico avançado de rede

## Fluxo
1. Usuário abre wizard
2. Sistema chama `GET /api/v1/stores/{store_id}/edge-setup/`
3. Usuário instala agent e configura `.env`
4. Sistema valida status via `GET /api/v1/stores/{store_id}/edge-status/`

## Estados
- idle
- fetching_token
- waiting_heartbeat
- success
- error

## Payloads
- `GET /api/v1/stores/{store_id}/edge-setup/` -> `{ store_id, edge_token, agent_id_suggested, cloud_base_url, has_active_token, token_created_at, token_last_used_at }`
- `POST /api/v1/stores/{store_id}/edge-token/rotate/` -> `{ store_id, edge_token, rotated, has_active_token, ... }`

## Erros
- 403 sem permissão
- 404 store inexistente

## DOR
- Fluxo de permissão definido
- Campos do payload confirmados

## DOD
- Wizard funcional com validação de heartbeat

## Testes
- Usuário sem permissão -> 403
- Token rotacionado -> novo token retornado
