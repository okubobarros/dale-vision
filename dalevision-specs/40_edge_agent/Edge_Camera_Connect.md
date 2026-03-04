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
