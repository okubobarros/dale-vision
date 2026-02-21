# Edge Camera Connect

## Objetivo
Conectar câmeras no Edge com rastreabilidade.

## Fluxo
1. Registrar câmera via `/api/v1/stores/{store_id}/cameras/`
2. Edge valida stream e reporta saúde em `/api/v1/cameras/{camera_id}/health/`
3. Status atualizado no dashboard

## Regras
- Backend não valida rede no create.
- Edge envia `X-EDGE-TOKEN` em endpoints de health/roi.

## Erros comuns
- RTSP inválido
- Credenciais incorretas
