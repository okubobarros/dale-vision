# Roadmap Técnico de Productização da Visão

## Fase 1 — Métrica confiável por câmera
- ROI v2 com `zones + lines + ownership`
- line crossing no worker ativo
- payload com `zone_id`, `roi_entity_id`, `metric_type`
- `checkout_events` explicitamente tratado como proxy
- dashboard e analytics mostrando apenas métricas com ownership primário
- `vision.crossing.v1`, `vision.queue_state.v1`, `vision.checkout_proxy.v1` e `vision.zone_occupancy.v1` persistidos como eventos atomicos
- agregação derivada de 30s alimentando `traffic_metrics` e `conversion_metrics`
- auditoria operacional de eventos atomicos exposta no Analytics/Admin

Status:
- Fase 1: concluida no nucleo tecnico
- Fase 2: concluida no nucleo de confianca operacional
- Proximo passo: Fase 3

## Fase 2 — Calibração e valor por segmento
- presets de ROI por tipo de negócio
- playbooks de calibração por loja
- métricas customizadas por segmento: mesa, provador, corredor quente, fila self-checkout
- relatório de confiança por métrica/câmera
- zone analytics persistido ponta a ponta

Objetivo imediato da fase:
- transformar metrica auditavel em metrica confiavel para venda e operacao
- registrar aprovacao, cobertura e erro observado por camera/metrica

Feito:
- `vision/confidence` por loja/camera/metrica
- `vision/calibration-plan` com acoes priorizadas
- `store_calibration_runs` persistindo erro observado e aprovacao
- `vision/calibration-runs` para historico e aprovacao manual
- Analytics com confianca, plano, historico e formulario de calibracao
- guardrail de permissao no frontend para aprovacao manual

Proximo uso pratico:
- executar piloto na rede da loja
- coletar erros observados por camera/metrica
- consolidar quais metricas ficam prontas para comparacao entre lojas

## Fase 3 — Dedupe multi-câmera real
- homografia e mapa da loja
- re-identificação temporal entre câmeras sobrepostas
- trilhas unificadas por pessoa
- ocupação/fluxo consolidados no nível da loja
- integração POS para conversão real

## Critério de valor ao cliente
- métrica precisa informar uma decisão operacional acionável
- métrica precisa ser explicável ao admin e ao gestor
- cada número exibido precisa ter câmera dona, ROI fonte e método de cálculo auditável
