# Status Atual do Produto de Visao

## Data de referencia
- 2026-03-09

## Referencia de sprint
- Sprint atual: `S0 - Stabilize Edge in Production`
- Documento de execucao: `dalevision-specs/70_ops/Sprint_Execution_Reference.md`

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

---

## Atualizacao executiva (2026-03-13)

### Onde estamos agora (visao total)
- Fase macro: transicao de `S0 estabilizacao edge` para `S3 readiness de escala`.
- Maturidade atual estimada: `78-82/100`.
- Estado comercial-produto: pronto para operacao assistida e onboarding guiado; ainda nao pronto para prometer benchmark multi-loja como verdade oficial.

### O que avancou desde a ultima leitura
- Edge autostart/remocao: fluxo estabilizado com evidencias de remocao de tasks + kill de processos residuais.
- Dashboard: separacao entre experiencia `trial`, `paid_setup` e `paid_executive` implementada no frontend.
- Copilot data foundation: dominio `copilot_*` criado no backend e migracao aplicada.
- Navegacao operacional: consolidacao de rotas para leitura executiva (Dashboard/Operations/Alerts/Reports/Settings).
- Performance frontend: ajuste de timeouts e politicas de retry para reduzir cascata de timeouts.

### Erros relevantes encontrados (e aprendizado)
1. Regra de limite de cameras parecia quebrada.
- Fato tecnico: org com `subscription active/pro` pode ter mais de 3 cameras; limite 3 e regra de trial.
- Problema real de UX: fallback no dashboard mostrava "Limite do plano: 3" mesmo sem retorno confiavel do endpoint.
- Acao: remover fallback enganoso e exibir "Sem limite" quando plano nao possui limite numerico.

2. Possivel bypass de limite no update de camera.
- Fato tecnico: criacao de camera validava limite, mas ativacao via `PATCH /v1/cameras/{id}/` podia nao revalidar transicao `inactive -> active`.
- Acao: revalidacao de limite adicionada no `perform_update` + tratamento de `PaywallError` no update.

3. Latencia percebida alta (ate ~2 min).
- Causa: retries no interceptor HTTP + timeouts longos.
- Acao: timeout/retry reduzidos, retries limitados para 502/503/504 e logs pesados restritos a DEV.

### Risco atual por trilha de valor ICP multilojista
- Verde:
  - visao operacional por loja com sinais reais de edge/camera/eventos.
  - onboarding e suporte assistido mais previsiveis.
- Amarelo:
  - confianca metrica heterogenea por loja/turno (depende calibracao e cobertura).
  - qualidade de experiencia sob degradacao de rede ainda exige hardening continuo.
- Vermelho:
  - comparabilidade oficial de rede sem gate de elegibilidade e cobertura minima.

### Foco de valor (o que o cliente paga para receber)
- Menos tempo do dono/gestor em operacao reativa.
- Mais acao orientada por prioridade (onde agir agora).
- Menos risco de perda operacional por fila/equipe/cobertura.
- Mais controle executivo da rede sem expor complexidade tecnica.

---

## Atualizacao executiva (2026-03-15) - Fechamento Sprint 1 (governanca)

### Leitura rapida
- Sprint 1 (Aderencia Operacional) em estado de fechamento tecnico/governanca.
- Progresso estimado da sprint: `85-90%`.
- Base pronta para operacao assistida com trilha executiva de acao.

### Feito nesta etapa de fechamento
- Scheduler de materializacao operacional validado (`tick` 5/10 min).
- Retencao operacional validada (`cleanup` diario).
- Saude de ingestao consolidada em:
  - Dashboard da rede,
  - Reports,
  - Store View.
- Saude da materializacao (`operational_window`) exposta em API e UI:
  - `status`,
  - `freshness`,
  - `coverage_stores/coverage_rate`.
- Fluxo de delegacao com `action_dispatched` padronizado:
  - por evento (`delegate-whatsapp`);
  - generico (`POST /api/v1/alerts/actions/dispatch/`).

### Impacto direto para o produto
- Copiloto deixou de ser apenas leitura e passou a registrar acao executiva.
- Reports e Dashboard convergem para a mesma semantica de confianca e pipeline.
- Reducao de risco de tela "analitica passiva" sem prova de valor acionavel.

### O que falta para encerrar 100% da sprint
1. Rodar smoke final em producao com evidencia consolidada (tick, cleanup, dispatch, UI).
2. Registrar outcome de acao (depois da execucao) para fechar loop no value ledger.
3. Incluir monitoramento operacional de erro por endpoint de dispatch (SLO minimo).
