# Edge Install Runbook

## Objetivo
Instalar e iniciar o edge-agent em ambiente de loja.

## Pré-requisitos
- Máquina com acesso às câmeras
- Acesso a uma store válida

## Passos
1. Solicitar credenciais via `GET /api/v1/stores/{store_id}/edge-setup/`
2. Baixar e extrair o ZIP do edge-agent
3. Configurar `.env` com `EDGE_TOKEN`, `STORE_ID`, `AGENT_ID`, `CLOUD_BASE_URL`
4. Fase 1 (teste manual): executar `02_TESTE_RAPIDO.bat`
5. Fase 2 (auto start): executar `03_INSTALAR_AUTOSTART.bat` e reiniciar o PC
6. Verificar status: `04_VERIFICAR_STATUS.bat`
7. Validar heartbeat via `/api/v1/stores/{store_id}/edge-status/`

## Conteúdo do bundle (Windows)
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

## Verificações
- Edge status `online` ou `degraded`
- `last_heartbeat` recente
- Logs em `logs\agent.log`

## Erros comuns
- Token inválido (`X-EDGE-TOKEN`)
- Store sem permissão

## Update (MVP)
1. Preencher `UPDATE_GITHUB_REPO` no `.env` (ex: `org/repo`)
2. Executar `update.ps1`
3. Ver logs em `logs\update.log`
