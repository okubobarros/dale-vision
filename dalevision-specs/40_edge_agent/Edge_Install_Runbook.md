# Edge Install Runbook

## Objetivo
Instalar e iniciar o edge-agent em ambiente de loja.

## Pré-requisitos
- Máquina com acesso às câmeras
- Acesso a uma store válida

## Passos
1. Solicitar credenciais via `GET /api/v1/stores/{store_id}/edge-setup/`
2. Baixar e extrair o ZIP do edge-agent (pode ser em qualquer pasta)
3. Configurar `.env` com `EDGE_TOKEN`, `STORE_ID`, `AGENT_ID`, `CLOUD_BASE_URL`
   - Defaults de visão recomendados:
     - `VISION_ENABLED=1`
     - `VISION_BUCKET_SECONDS=30`
     - `VISION_POLL_SECONDS=5`
     - `VISION_SNAPSHOT_TIMEOUT_SECONDS=10`
4. Fase 1 (teste manual): executar `01_TESTE_RAPIDO.bat`
5. Fase 2 (auto start): executar `02_INSTALAR_AUTOSTART.bat` e reiniciar o PC
6. Verificar status: `03_VERIFICAR_STATUS.bat`
7. Validar heartbeat via `/api/v1/stores/{store_id}/edge-status/`

## Conteúdo do bundle (Windows)
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

## Notas de instalacao (Windows)
- `02_INSTALAR_AUTOSTART.bat` copia o bundle para `C:\ProgramData\DaleVision\EdgeAgent\dalevision-edge-agent-windows`.
- A tarefa agendada passa a apontar para o caminho em `ProgramData`.
- Nao mover a pasta depois da instalacao. Se mover, rode `04_REMOVER_AUTOSTART.bat` e depois `02_INSTALAR_AUTOSTART.bat`.

## Verificações
- Edge status `online` ou `degraded`
- `last_heartbeat` recente
- Logs em `logs\agent.log`
 - Vision worker:
   - `[VISION] worker started`
   - nao deve conter `yolo failed`

## Erros comuns
- Token inválido (`X-EDGE-TOKEN`)
- Store sem permissão

## Update (MVP)
1. Preencher `UPDATE_GITHUB_REPO` no `.env` (ex: `org/repo`)
2. Executar `scripts\update.ps1`
3. Ver logs em `logs\update.log`

## Logs adicionais
- `logs\service_install.log` e `logs\service_install.ps1.log` (instalacao)
- `logs\run_agent.log` (execucao do agente via task)
