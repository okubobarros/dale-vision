# Plano de Execucao - Reliable Vision

## Objetivo
Executar a evolucao do produto em slices que aumentem confiabilidade real, vendabilidade
e escalabilidade sem quebrar o que ja existe.

## Principio de priorizacao
Priorizar primeiro o que:
- reduz risco de decisao errada para o cliente
- impede comparacao injusta entre lojas
- aumenta explicabilidade para admin e gestor
- melhora a base de dados para evolucao futura

## Epico 1 - Governanca de Metrica no Produto
Objetivo:
- parar de misturar numero oficial com proxy/estimativa

Entregas:
- backend retorna `metric_status`, `source_method` e `ownership_mode`
- dashboard e analytics exibem `official | proxy | estimated`
- agregacoes usam filtros por `camera_role` quando fizer sentido
- comparacoes multi-loja destacam quando dado nao e oficial

Repos:
- `dale-vision`

Slice 1:
- `metrics_summary` e `ceo_dashboard` com `meta.metric_governance`
- badges no dashboard e analytics
- testes backend e frontend

## Epico 2 - Ownership Real no Analytics
Objetivo:
- usar apenas camera dona na metrica oficial

Entregas:
- aplicar `ownership=primary` no path de analytics
- fallback controlado para dados legados
- bloquear agregacao oficial quando houver ambiguidade
- expor cobertura por metrica

Repos:
- `dale-vision`
- `dalevision-edge-agent`

Slice 2:
- payload edge inclui ownership consistente
- backend persiste ownership/metodo
- queries oficiais ignoram fontes `secondary`

## Epico 3 - Eventos Atomicos de Visao
Objetivo:
- sair de bucket-only para trilha auditavel real

Entregas:
- `vision.crossing.v1`
- `vision.queue_state.v1`
- `vision.checkout_proxy.v1`
- `vision.zone_occupancy.v1`
- jobs/agregacao derivados dos eventos

Repos:
- `dalevision-edge-agent`
- `dale-vision`

Slice 3:
- `vision.crossing.v1` ponta a ponta
- `vision.queue_state.v1` ponta a ponta
- `vision.checkout_proxy.v1` ponta a ponta
- `vision.zone_occupancy.v1` ponta a ponta
- agregacao 30s derivada para `traffic_metrics` e `conversion_metrics`
- `receipt_id`/idempotencia por evento atomico
- trilha auditavel em `vision_atomic_events`
- endpoint de auditoria backend: `GET /api/v1/stores/{store_id}/vision/audit/`
- secao de auditoria operacional exposta no frontend de Analytics

Status:
- Slice 1: concluido
- Slice 2: concluido
- Slice 3: concluido
- Slice 4: concluido
- Proximo foco: Slice 5

## Epico 4 - Calibracao e Confianca Operacional
Objetivo:
- transformar calibracao em processo governado

Entregas:
- pagina de confianca por camera/metrica
- ultima calibracao e erro observado
- aprovacao manual por loja
- status operacional da loja: pronto, parcial, recalibrar

Repos:
- `dale-vision`

Slice 4:
- endpoint backend de confianca operacional: `GET /api/v1/stores/{store_id}/vision/confidence/`
- plano priorizado de recalibracao: `GET /api/v1/stores/{store_id}/vision/calibration-plan/`
- persistencia de calibracao manual em `store_calibration_runs`
- historico e aprovacao manual: `GET/POST /api/v1/stores/{store_id}/vision/calibration-runs/`
- Analytics com:
  - confianca por camera/metrica
  - plano de recalibracao
  - historico de calibracao
  - formulario de aprovacao manual
  - guardrail de permissao para `owner|admin|manager`

## Epico 5 - Produto Multi-Loja Vendavel
Objetivo:
- permitir comparacao entre lojas com guardrails

Entregas:
- ranking por turno/janela comparavel
- cobertura minima por loja
- padrao por segmento
- relatorio executivo com limitacoes explicitas

Repos:
- `dale-vision`

## Epico 6 - Escalabilidade e Evolucao Comercial
Objetivo:
- preparar o produto para escalar com menos suporte manual

Entregas:
- presets por segmento
- metricas customizadas governadas
- reprocessamento por `roi_version`
- observabilidade por loja/camera/worker
- POS para conversao real

Repos:
- `dale-vision`
- `dalevision-edge-agent`

## Ordem Recomendada
1. Governanca de metrica no produto
2. Ownership real no analytics
3. Eventos atomicos de visao
4. Calibracao e confianca operacional
5. Produto multi-loja vendavel
6. Escalabilidade comercial

## Implementacao Imediata
Proximo passo:
- iniciar testes na rede da loja com cameras reais e ROI publicada
- validar conectividade edge, resolucao RTSP e heartbeat por camera
- executar calibracao manual em pelo menos `entrada`, `balcao` e `salao`
- medir erros observados e registrar aprovacao manual por metrica
- levantar gaps para Slice 5: cobertura minima por loja/turno e comparacao multi-loja confiavel
