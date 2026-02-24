# Edge Doctor Diagnostics

## Objetivo
Diagnosticar falhas de conectividade e saúde do edge-agent.

## Endpoint principal
- `GET /api/v1/stores/{store_id}/edge-status/`

## Campos relevantes
- `online`, `store_status`, `store_status_reason`
- `last_heartbeat`, `last_heartbeat_at`
- `cameras_total`, `cameras_online`, `cameras_degraded`, `cameras_offline`

## Diagnóstico rápido
- `store_status_reason = no_heartbeat` -> agente offline
- `store_status_reason = partial_camera_coverage` -> câmeras instáveis

## Ações recomendadas
- Validar rede da loja
- Revalidar RTSP
- Regerar token se necessário

## Ferramentas no bundle (Windows)
- `Diagnose.bat` (gera ZIP de diagnóstico)
- `04_VERIFICAR_STATUS.bat` / `verify-service.ps1` (status do serviço)
- Logs: `logs\agent.log` e `logs\update.log`
