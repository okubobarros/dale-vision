# Edge Vision MVP (YOLO)

## Objetivo
Mensurar fluxo de pessoas, conversao (proxy por checkout), tempo de atendimento e ocupacao do salao usando 3 cameras no trial.

## Escopo MVP (v1)
- **Entrada**: fluxo (entradas/saidas) via linha virtual.
- **Balcao**: fila + checkout (interacao cliente + funcionario).
- **Salao**: ocupacao por zona.

## Topologia recomendada (3 cameras)
1. **Cam01 - Balcao**
   - Zonas: `ponto_pagamento`, `zona_funcionario_caixa`, `area_atendimento_fila`.
2. **Cam02 - Salao**
   - Zona: `area_consumo`.
3. **Cam03 - Entrada**
   - Linha: `linha_entrada`.

## Implementacao (Edge Agent)
O core do Lab foi migrado para o edge-agent em `dalevision_edge_agent/vision/`:
- `store_runner.py` (base v4)
- `geometry.py`, `config.py`

Dependencias opcionais:
- `ultralytics` (YOLOv8)
- `opencv-python`

## Configuracao (env)
- `VISION_ENABLED=1`
- `VISION_BUCKET_SECONDS=30`
- `VISION_POLL_SECONDS=5`
- `VISION_MAX_CAMERAS=10`
- `VISION_SNAPSHOT_TIMEOUT_SECONDS=10`
- `VISION_MODEL_PATH=yolov8n.pt`
- `VISION_ROLE_MAP` (JSON, ex: `{"balcao":"cam01","salao":"cam02","entrada":"cam03"}`)

## Eventos/Métricas geradas (v1)
- `entries`, `exits` (fluxo)
- `fila_max`, `fila_avg` (fila)
- `checkout_events` (proxy de conversao)
- `consumo_max`, `consumo_avg` (ocupacao do salao)

## Limitacoes atuais
- MVP usa 1 frame por tick (RTSP ou snapshot). Para maior precisao, evoluir para tracking RTSP low-FPS.
- Ingestao backend e painel ainda nao implementados (SPEC-007).

## Proximos passos
1. Integrar inferencia do Edge com envio de eventos (SPEC-007).
2. Persistir e agregar em buckets no backend.
3. Exibir metricas no app.
