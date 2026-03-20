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

## Limitacoes atuais (checkpoint 2026-03-20)
- Parte do pipeline já está em produção, mas ainda há variação de qualidade por câmera/ângulo/iluminação.
- Cenários com reflexo e oclusão (vitrine/luminária) ainda geram FN/FP acima do ideal em algumas lojas.
- Falta ampliar validação de campo multi-loja com benchmark contínuo por tipo de câmera.

## Proximos passos
1. Consolidar tuning operacional por papel de câmera (entrada, balcão, salão).
2. Fechar ciclo de calibração com evidência antes/depois para cada ação crítica.
3. Evoluir monitoramento de drift com gatilho automático de backlog de calibração.

## Atualização
- Data: `2026-03-20`
- Motivo: refletir estado real do pipeline edge->backend->app e foco atual em confiabilidade operacional.
