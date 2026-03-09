# Blueprint Para Produto Reliable e Vendavel

## Objetivo
Levar o produto do estado atual `Unreliable` para um estado `Reliable` e comercialmente
defensavel para multilojistas do varejo, com foco em:
- confianca de medicao
- explicabilidade para gestor e admin
- escalabilidade tecnica e operacional
- comparabilidade entre lojas

## Dor Real do Multilojista
O cliente nao compra "visao computacional". Ele compra resposta confiavel para:
- onde estou perdendo venda por fila e atendimento lento
- qual loja opera melhor por turno e horario
- onde estou com equipe mal dimensionada
- qual alteracao operacional gerou resultado real
- como comparar lojas sem distorcer a leitura por camera ou layout

## Resultado de Produto Esperado
O produto precisa responder, com clareza:
- qual camera gerou a metrica
- qual ROI foi usado
- se a metrica e `oficial`, `proxy` ou `estimada`
- qual o nivel de confianca
- qual acao operacional o cliente deve tomar

## Principios de Arquitetura
- uma metrica fisica deve ter uma camera dona
- eventos atomicos primeiro, agregados depois
- separar `medicao` de `insight`
- toda metrica deve ser auditavel por camera, ROI, versao e metodo
- nao vender multi-camera consolidado sem dedupe real

## Estado-Alvo

### Nivel 1 - Reliable por camera
Cada camera consegue produzir metricas confiaveis, auditaveis e comparaveis no tempo:
- entrada/saida por `line`
- fila e atendimento por `poly`
- ocupacao por zonas semanticas
- ownership explicito

### Nivel 2 - Reliable por loja
Cada loja passa a ter agregados corretos por metrica oficial:
- somente `ownership=primary` entra no numero oficial
- metricas proxy ficam marcadas como proxy
- confianca por metrica/camera entra na leitura do dashboard

### Nivel 3 - Reliable multi-loja
Comparacao entre lojas passa a ser aceitavel:
- horario e timezone normalizados
- comparacao por janela operacional semelhante
- definicoes metricas padronizadas por segmento
- cobertura operacional minima por loja/turno

## Arquitetura Recomendada

### 1. Camada de eventos atomicos
Hoje o pipeline esta centrado em buckets. Isso funciona para MVP, mas nao sustenta
bem auditabilidade e evolucao de metrica.

Adicionar eventos atomicos de visao:
- `vision.crossing.v1`
- `vision.queue_state.v1`
- `vision.checkout_proxy.v1`
- `vision.zone_occupancy.v1`

Campos minimos:
- `store_id`
- `camera_id`
- `camera_role`
- `zone_id`
- `roi_entity_id`
- `roi_version`
- `metric_type`
- `ts`
- `confidence`
- `ownership`

Campos por tipo:
- `vision.crossing.v1`: `direction`, `track_id_hash`
- `vision.queue_state.v1`: `queue_length`, `staff_active_est`
- `vision.checkout_proxy.v1`: `duration_seconds`, `interaction_count`
- `vision.zone_occupancy.v1`: `occupancy_count`, `dwell_seconds_est`

### 2. Camada de agregacao
Buckets continuam existindo, mas passam a ser derivados dos eventos atomicos.

Agregados recomendados:
- 30s para operacao em tempo quase real
- 5m para analytics intra-day
- 1h para comparacao entre lojas e relatarios
- 1d para relatorio executivo

### 3. Camada semantica de metricas
Criar uma camada de regras de negocio que decida:
- o que e oficial
- o que e proxy
- o que esta bloqueado por baixa cobertura
- o que pode ou nao entrar em ranking multi-loja

### 4. Camada de confianca
Cada numero exibido no produto precisa ter:
- `metric_status`: `official | proxy | estimated | unsupported`
- `confidence_score`: `0-100`
- `coverage_score`: `0-100`
- `source_camera_count`
- `source_roi_ids`

## Banco de Dados Recomendado

### Manter
- `traffic_metrics`
- `conversion_metrics`
- `event_receipts`
- `camera_roi_configs`

### Evoluir
Adicionar colunas de governanca nas tabelas agregadas, quando ainda nao existirem:
- `roi_entity_id`
- `metric_type`
- `metric_status`
- `confidence_score`
- `coverage_score`
- `ownership`
- `source_method`

### Novas tabelas recomendadas

#### `vision_atomic_events`
Objetivo:
- trilha auditavel de tudo que a visao realmente mediu

Campos:
- `id`
- `store_id`
- `camera_id`
- `camera_role`
- `zone_id`
- `roi_entity_id`
- `roi_version`
- `event_type`
- `metric_type`
- `direction`
- `count_value`
- `staff_active_est`
- `duration_seconds`
- `confidence`
- `ownership`
- `track_id_hash`
- `ts`
- `raw_payload`

Estado atual:
- implementada no backend
- recebe `vision.crossing.v1`, `vision.queue_state.v1`, `vision.checkout_proxy.v1` e `vision.zone_occupancy.v1`
- usada como fonte de agregacao derivada em janela de 30s
- auditavel via endpoint `stores/{store_id}/vision/audit`

#### `metric_definitions`
Objetivo:
- padronizar metrica por segmento e tipo de negocio

Campos:
- `id`
- `segment`
- `metric_key`
- `metric_label`
- `metric_status_default`
- `shape_type_required`
- `camera_role_required`
- `is_standard`
- `is_enabled`

#### `metric_source_assignments`
Objetivo:
- explicitar ownership de metrica por loja/camera/ROI

Campos:
- `id`
- `store_id`
- `camera_id`
- `roi_entity_id`
- `metric_type`
- `ownership`
- `active_from`
- `active_to`
- `status`

#### `store_calibration_runs`
Objetivo:
- registrar calibracao e qualidade da loja ao longo do tempo

Campos:
- `id`
- `store_id`
- `camera_id`
- `metric_type`
- `roi_version`
- `manual_sample_size`
- `manual_reference_value`
- `system_value`
- `error_pct`
- `approved_by`
- `approved_at`
- `notes`

Estado atual:
- implementada no backend via migration
- alimentada por `POST stores/{store_id}/vision/calibration-runs`
- usada para projetar `latest_calibration` na confianca operacional
- exposta no historico de calibracao no Analytics

## Features Necessarias

### Fase A - Para virar Reliable
- editor ROI mostrando direcao da linha de entrada/saida
- dashboard exibindo `oficial`, `proxy`, `estimada`
- analytics filtrando e agregando apenas `primary` por padrao
- pagina de confianca por loja/camera/metrica
- validacao manual assistida no admin
- comparacao entre lojas bloqueada quando cobertura for insuficiente

Feito ate agora:
- eventos atomicos principais implementados ponta a ponta
- buckets derivados de 30s preservando pipeline legado
- auditoria operacional de eventos atomicos no backend e no frontend
- confianca operacional por camera/metrica
- plano de recalibracao priorizado por camera/metrica
- historico e aprovacao manual de calibracao no produto
- guardrail de permissao para aprovacao manual

### Fase B - Para virar vendavel
- ranking multi-loja confiavel por horario e dia
- heatmap por turno
- cobertura operacional por loja
- relatorio executivo com ganho potencial explicavel
- presets por segmento: farmacia, alimentacao, moda, conveniencia
- metrica customizada controlada por tipo de negocio

### Fase C - Para virar escalavel
- pipeline assinado por versao de schema
- processamento assíncrono de eventos atomicos
- jobs de agregacao incremental
- reprocessamento por roi_version
- observabilidade por loja/camera/worker

## Solucoes Para Dores Reais

### Dor: comparacao injusta entre lojas
Solucao:
- padronizar metricas oficiais por segmento
- exigir cobertura minima por loja e turno
- ranking apenas com metricas `official`

### Dor: falsa produtividade por duplicacao
Solucao:
- ownership explicito por camera/metrica
- agregacao por `primary` apenas
- multi-camera apenas quando dedupe existir

### Dor: ROI pouco explicavel
Solucao:
- mostrar camera fonte, ROI fonte e versao
- mostrar metodo: oficial/proxy/estimada
- mostrar confianca e ultima calibracao
- mostrar aprovador e erro observado da ultima calibracao

### Dor: dificuldade de suporte em lojas diferentes
Solucao:
- presets por segmento
- hands-on e checklist de calibracao
- historico de calibracoes por loja
- metricas customizadas com governanca

### Dor: sem traducao para acao operacional
Solucao:
- cada insight precisa apontar recomendacao
- fila alta + equipe baixa -> reforcar caixa/balcao
- ocupacao alta em zona especifica -> redistribuir equipe ou layout
- baixa cobertura -> acao recomendada e recalibrar camera/ROI

## Roadmap Recomendado

### Fase 1 - 0 a 4 semanas
Objetivo:
- fechar `Reliable por camera`

Entregas:
- governanca `official/proxy/estimated`
- analytics respeitando `ownership=primary`
- persistencia minima de `roi_entity_id` e `metric_type` nos agregados
- UI de direcao da line
- pagina de confianca/calibracao por camera

Status atual:
- concluida no nucleo tecnico e de produto

### Fase 2 - 4 a 8 semanas
Objetivo:
- fechar `Reliable por loja`

Entregas:
- `vision_atomic_events`
- agregacao derivada dos eventos
- cobertura por loja e turno
- score de confianca por metrica
- validacao de 3 lojas reais por segmento

Status atual:
- concluida no nucleo de confianca/calibracao
- proximo passo real e validar em rede de loja antes de iniciar comparacao multi-loja

### Fase 3 - 8 a 16 semanas
Objetivo:
- virar produto vendavel multi-loja

Entregas:
- ranking e comparacao multi-loja confiaveis
- presets por segmento
- metricas customizadas governadas
- relatorio executivo e ROI dashboard com transparencia

### Fase 4 - 16+ semanas
Objetivo:
- virar produto escalavel e defensavel

Entregas:
- dedupe multi-camera
- POS integration para conversao real
- reprocessamento historico por schema/roi_version
- camada de recomendacao operacional orientada por segmento

## Criterio Para Subir a Nota de Prontidao

### Para 70+
- ownership aplicado no analytics
- classificacao `official/proxy/estimated`
- validacao manual em lojas piloto
- dashboard sem misturar metrica oficial e proxy

### Para 80+
- eventos atomicos + agregacao derivada
- cobertura e confianca por metrica
- comparacao multi-loja com padronizacao por segmento

### Para 85+
- POS real para conversao
- zona analytics confiavel
- dedupe multi-camera onde houver sobreposicao

## Regra Comercial
Nao vender como:
- "fonte unica de verdade multi-loja"
- "conversao real"
- "ocupacao consolidada entre cameras"

Pode vender como:
- monitoramento operacional confiavel por camera
- inteligencia de fila e atendimento
- comparacao entre lojas com guardrails explicitos
- produto assistido com calibracao e melhoria continua
