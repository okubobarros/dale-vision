# Edge Camera Connect

## Objetivo
Conectar câmeras no Edge com rastreabilidade.

## Fluxo
1. Registrar câmera via `/api/v1/stores/{store_id}/cameras/`
2. Edge valida stream e reporta saúde via `POST /api/edge/events/` com `event_name=camera_health`
3. Status atualizado no dashboard

## Regras
- Backend não valida rede no create.
- Edge envia `X-EDGE-TOKEN` em endpoints de health/roi.

## Erros comuns
- RTSP inválido
- Credenciais incorretas

## Observações
- Em modo local (`CAMERAS_JSON`), `camera_id` deve existir no backend (UUID/external_id/nome).
- Alguns NVRs Intelbras exigem URI ONVIF completa:
  - `rtsp://<user>:<pass>@<ip>:554/cam/realmonitor?channel=<N>&subtype=1&unicast=true&proto=Onvif`
- Mapeamento de canais deve ser correto (ex.: 1,2,3) para evitar `401` e `open_failed`.
- Flapping pode ocorrer por multiplas instancias abrindo RTSP simultaneamente.
