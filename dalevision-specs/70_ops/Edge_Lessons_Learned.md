# Lições Aprendidas — Edge Agent (pilotos iniciais)

## Autostart e instalação
- **Instalação correta** é sempre em `C:\ProgramData\DaleVision\EdgeAgent\dalevision-edge-agent-windows`.
- Se tentar apagar a pasta com o agente rodando, o Windows bloqueia (“Pasta em uso”).
- `04_REMOVER_AUTOSTART.bat` remove a task, mas não mata processos ativos.
- Limpeza segura (admin):
  - `taskkill /F /IM dalevision-edge-agent.exe`
  - `takeown /F C:\ProgramData\DaleVision /R /D Y`
  - `icacls C:\ProgramData\DaleVision /grant *S-1-5-32-544:(OI)(CI)F /T`
  - `Remove-Item -Recurse -Force C:\ProgramData\DaleVision`

## Logs confiáveis
- Fonte principal: `C:\ProgramData\DaleVision\logs\agent.log`.
- `run_agent.log` fica em `C:\ProgramData\DaleVision\EdgeAgent\dalevision-edge-agent-windows\logs`.
- `03_VERIFICAR_STATUS.bat` deve sempre apontar logs de ProgramData (não da pasta Downloads).

## Câmeras
- Câmera “Aguardando validação” é esperado após cadastro.
- Status muda quando o Edge envia health + heartbeat e consegue acessar RTSP/snapshot.
- DELETE de câmera falhou (HTTP 500) por dependências no backend; corrigido com deleção em cascata (snapshots, ROI, health).

## Edge token
- Endpoint de lista de câmeras precisa aceitar `X-EDGE-TOKEN`.
- Se retornar 403, o worker de visão não processa e só o heartbeat funciona.

## Snapshot / ROI
- Snapshot 404 antes de upload é comportamento esperado.
- Upload de snapshot + ROI habilita a calibração.
- ROI inválido ou ausente → câmera ignorada pelo worker de visão.

## Vision Worker
- Precisa de dependências (`ultralytics`, `torch`, `opencv`, `numpy`) no EXE.
- Sem dependências, loga `yolo failed` e não gera métricas.
- Snapshot é suficiente para MVP; RTSP contínuo fica para etapa seguinte.
- Se `cameras list failed 403`, revisar `STORE_ID` e `EDGE_TOKEN` no `.env` e gerar novo token no wizard.
