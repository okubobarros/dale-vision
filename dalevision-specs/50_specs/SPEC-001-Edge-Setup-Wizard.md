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
5. Usuário executa `01_TESTE_RAPIDO.bat` (teste)
6. Usuário executa `02_INSTALAR_AUTOSTART.bat` (produção)
7. Usuário valida status com `03_VERIFICAR_STATUS.bat`
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
- `01_TESTE_RAPIDO.bat`
- `02_INSTALAR_AUTOSTART.bat`
- `03_VERIFICAR_STATUS.bat`
- `04_REMOVER_AUTOSTART.bat`
- `Diagnose.bat`
- `run_agent.cmd`
- `BUILD_INFO.txt`
- `scripts/install-service.ps1`
- `scripts/uninstall-service.ps1`
- `scripts/verify-service.ps1`
- `scripts/update.ps1`
- `README.txt`
- `logs/`

## Notas de instalacao
- `02_INSTALAR_AUTOSTART.bat` copia o bundle para `C:\ProgramData\DaleVision\EdgeAgent\dalevision-edge-agent-windows`.
- A task passa a apontar para o caminho em `ProgramData`.

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
