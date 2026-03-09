# Status Atual do Produto de Visao

## Data de referencia
- 2026-03-09

## Leitura executiva
O projeto saiu do estado `Broken` e entrou em `Unreliable`, mas ainda nao chegou em
`Measurement-Ready` para multilojistas.

Score atual estimado:
- antes: `47/100`
- agora: `72-78/100`

Veredito atual:
- single-store: defendivel e operacionalmente calibravel com trilha de aprovacao manual
- multi-store: ainda nao confiavel como fonte oficial executiva sem cobertura minima por loja/turno

## Momento atual
Fase 1 foi concluida no nucleo tecnico e o produto entrou em estado mais proximo de
`Measurement-Ready por camera/loja`, com lacunas restantes concentradas em cobertura minima,
comparabilidade multi-loja e validacao disciplinada em rede real.

## Feito

### Contrato de ROI
- ROI v2 definido com `zones + lines + ownership`
- `line` assumido como shape correto para `entry_exit`
- `metric_type`, `roi_entity_id` e `zone_id` definidos no contrato
- matriz de ownership por camera/metrica documentada

### App / Admin
- editor ROI ja suporta `line`
- publish separado entre `zones` e `lines`
- ownership e semantica operacional refletidos na documentacao
- fluxo de calibracao/admin mais explicito para suporte e ajuste fino

### Edge-agent
- line crossing reativado no worker ativo
- payload enriquecido com contexto de ROI
- `checkout_events` tratado explicitamente como proxy no contrato
- bug real de `frame_stride=1` corrigido no worker
- emissao atomica de `vision.crossing.v1`
- emissao atomica de `vision.queue_state.v1`
- emissao atomica de `vision.checkout_proxy.v1`
- emissao atomica de `vision.zone_occupancy.v1`
- `dwell_seconds_est` em `salao` calculado por permanencia de trilha local

### Backend
- persistencia por camera/bucket mantida
- `zone_id` passa a entrar no fluxo de traffic metrics
- receipt/meta com `zone_id`, `roi_entity_id` e `metric_type`
- testes de contrato adicionados no ingest/backend
- tabela `vision_atomic_events` criada para trilha auditavel
- agregacao de 30s derivada a partir dos eventos atomicos
- idempotencia por `receipt_id` aplicada aos eventos atomicos
- endpoint de auditoria `vision/audit` exposto para operacao

### Frontend / Produto
- dashboard e analytics exibem governanca `official | proxy | estimated`
- analytics agora expõe uma secao de auditoria operacional dos eventos atomicos
- admin/operacao conseguem inspecionar camera, ROI, valor, duracao e timestamp dos eventos
- analytics agora exibe confianca operacional por camera/metrica
- analytics agora exibe plano de recalibracao por prioridade
- analytics agora exibe historico de calibracao com aprovador e erro observado
- analytics agora permite registrar aprovacao manual de calibracao
- UI aplica guardrail de permissao para aprovacao manual (`owner|admin|manager`)

## Parcial

### Analytics e produto
- fila operacional no balcao: util, mas ainda proxy
- checkout proxy: util, mas ainda nao e venda real
- fluxo de entrada/saida: contrato, persistencia e auditoria corretos, mas ainda sem validacao forte em loja
- ownership: aplicado nas queries oficiais principais
- confianca operacional: implementada, faltando validacao forte em campo

### Operacao e suporte
- admin ja tem melhor base para calibrar loja a loja
- ainda falta UX explicita de confianca operacional por camera/metrica e status de calibracao da loja

## Faltando

### Para confianca de produto
- cobertura operacional por loja e turno
- validacao em rede de loja com erro tolerado por metrica
- fechamento operacional do criterio minimo para marcar loja como pronta para comparacao

### Para vendabilidade multi-store
- comparacao normalizada entre lojas
- governanca visual: expandir regras oficiais para todas as telas e comparativos
- classificacao UX por metrica: `oficial`, `proxy`, `estimada`, com score de cobertura
- validacao disciplinada em lojas reais com erro aceitavel por metrica

### Para maturidade tecnica
- dedupe multi-camera real
- homografia/re-id quando houver sobreposicao relevante
- integracao POS para conversao real

## Risco Para Venda

### Baixo risco
- monitoramento de edge/cameras
- sinal operacional de fila
- suporte remoto e manutencao basica de configuracao

### Medio risco
- checkout proxy como indicio operacional
- leitura de produtividade de balcao
- uso em trial guiado com boa calibracao

### Alto risco
- comparacao entre lojas como numero oficial
- conversao como verdade de negocio
- ocupacao/dwell como base de decisao executiva
- qualquer agregado multi-camera sem dedupe real

## Avaliacao por repositorio

### `dale-vision`
- situacao: base de produto e contrato bem melhores
- principal gap: analytics e UX ainda nao traduzem toda a governanca de ownership e confianca

### `dalevision-edge-agent`
- situacao: worker ja produz os quatro eventos atomicos principais de visao
- principal gap: validacao ampla em campo, calibracao governada e confianca operacional explicita

## O que precisa acontecer para subir para 85+
1. Validar em rede de loja com checklist e erro tolerado por metrica.
2. Definir cobertura minima por loja e turno antes de comparacao multi-loja.
3. Bloquear leitura oficial quando cobertura ou calibracao estiverem abaixo do minimo.
4. Validar em 3 lojas reais com disciplina operacional repetivel.
5. So depois avancar para dedupe multi-camera e POS.

## Regra de decisao
Nao vender como "verdade operacional multi-loja" antes de cumprir os cinco itens acima.
Vender como:
- monitoramento operacional assistido
- deteccao de fila e suporte a calibracao
- inteligencia operacional com metricas oficiais e metricas proxy claramente separadas
