# SPEC-001 Edge Setup Wizard

## Objetivo
Guiar o usuário na instalação do Edge e validação de heartbeat.

## Não-objetivos
- Diagnóstico avançado de rede

## Fluxo
1. Usuário abre wizard
2. Sistema chama `GET /api/v1/stores/{store_id}/edge-setup/`
3. Usuário baixa e extrai o ZIP do edge-agent
4. Usuário configura `.env`
5. Usuário executa `02_TESTE_RAPIDO.bat` (teste)
6. Usuário executa `03_INSTALAR_AUTOSTART.bat` (produção)
7. Usuário valida status com `04_VERIFICAR_STATUS.bat`
8. Sistema valida status via `GET /api/v1/stores/{store_id}/edge-status/`

## Estados
- idle
- fetching_token
- waiting_heartbeat
- success
- error

## Payloads
- `GET /api/v1/stores/{store_id}/edge-setup/` -> `{ supported, edge_token, cloud_base_url, agent_id_default, agent_id_suggested }`
- `POST /api/v1/stores/{store_id}/edge-token/rotate/` -> `{ supported, edge_token, cloud_base_url, agent_id_suggested }`

## Bundle atual (Windows)
- `.env`
- `dalevision-edge-agent.exe`
- `02_TESTE_RAPIDO.bat`
- `03_INSTALAR_AUTOSTART.bat`
- `04_VERIFICAR_STATUS.bat`
- `05_REMOVER_SERVICO.bat`
- `Diagnose.bat`
- `install-service.ps1`
- `uninstall-service.ps1`
- `verify-service.ps1`
- `update.ps1`
- `README.txt`
- `logs/`

## Erros
- 403 sem permissão
- 404 store inexistente
- 500 JSON padronizado:
  - `{ code: "EDGE_SETUP_ERROR", message, details }`
  - `{ code: "EDGE_TOKEN_ROTATE_FAILED", message, details }`

## DOR
- Fluxo de permissão definido
- Campos do payload confirmados

## DOD
- Wizard funcional com validação de heartbeat

## Testes
- Usuário sem permissão -> 403
- Token rotacionado -> novo token retornado
