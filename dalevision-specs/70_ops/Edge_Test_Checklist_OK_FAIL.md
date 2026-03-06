# Checklist - Teste na Loja (OK/FAIL)

## Identificação
- Data:
- Loja:
- Store ID:
- Operador:
- Versão do Edge Agent:

## Pré-Loja (Remoto)
- ZIP atualizado baixado e extraído (OK/FAIL)
- `yolov8n.pt` presente na pasta extraída (OK/FAIL)
- `.env` atualizado com token atual (OK/FAIL)
- Nenhuma cópia antiga em `C:\ProgramData\DaleVision\EdgeAgent\` (OK/FAIL)
- `CAMERAS_JSON` vazio no primeiro setup (OK/FAIL)
- `CAMERAS_JSON` preenchido no modo loja (OK/FAIL)
- `VISION_MODEL_PATH=yolov8n.pt` (OK/FAIL)
- `DALE_LOG_DIR=./logs` (OK/FAIL)
- Somente 1 instância do agente rodando (OK/FAIL)
- `Get-Process dalevision-edge-agent` retorna 0 ou 1 processo (OK/FAIL)

## T-0 Diagnóstico
- Diagnose.bat rodou (OK/FAIL)
- edge_auth_ok=sim (OK/FAIL)
- edge_cameras_count > 0 (OK/FAIL)
- NET002 (VLAN) nao apareceu (OK/FAIL)

## T+2 Smoke
- 02_TESTE_RAPIDO.bat (OK/FAIL)
- heartbeat_ok=True (OK/FAIL)
- camera_health_posted == total_cameras (OK/FAIL)
- logs\agent.log criado (OK/FAIL)
- `logs\agent.log` na pasta extraída (OK/FAIL)

## T+5 Autostart
- 03_INSTALAR_AUTOSTART.bat (OK/FAIL)
- Task criada e ativa (OK/FAIL)
- Task To Run aponta para pasta extraida (OK/FAIL)
- Run As User = usuario local (OK/FAIL)
- Task agendada ONLOGON (OK/FAIL)
- `schtasks /Query /TN DaleVisionEdgeAgent /V /FO LIST` validado (OK/FAIL)

## T+8 App
- Store online no dashboard (OK/FAIL)
- last_comm_at recente (OK/FAIL)
- Cameras online/degraded (OK/FAIL)
- Snapshot visivel no dashboard (OK/FAIL)

## T+10 Substream
- 1 camera com subtype=1 OK (OK/FAIL)
- RTSP ONVIF completo e canal correto (OK/FAIL)

## T+12 ROI
- ROI publicado sem erro (OK/FAIL)
- Snapshot atualiza no ROI editor (OK/FAIL)

## T+15 Analytics
- Evento `vision.metrics.v1` chegou (OK/FAIL)
- Dashboard exibiu métricas (OK/FAIL)

## Saida
- Reabrir app apos 2-3 min (OK/FAIL)
- Store continua online (OK/FAIL)
- Autostart recria agente após reboot (OK/FAIL)

## Observacoes
- 
