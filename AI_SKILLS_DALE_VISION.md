# AI Skills Dale Vision

Colecao local de skills para este workspace em [`.codex/skills`](/c:/workspace/dale-vision/.codex/skills).

Objetivo: manter um conjunto enxuto e util para produto, edge-agent, analytics operacional, arquitetura orientada a eventos e copilotos de varejo.

## Compatibilidade

Estrutura validada para o agente atual:
- pasta raiz local: [`.codex/skills`](/c:/workspace/dale-vision/.codex/skills)
- cada skill fica em um diretorio plano proprio
- cada skill exposta possui [`SKILL.md`](/c:/workspace/dale-vision/.codex/skills)
- sem aninhamento por dominio dentro de `.codex/skills`, para nao quebrar discovery

Status:
- instaladas da colecao `sickn33/antigravity-awesome-skills`: `17`
- mantidas da colecao local ja existente: `3`
- total do bundle Dale Vision descrito aqui: `20`

Skills mantidas da instalacao local anterior por compatibilidade:
- `ai-engineer`
- `analytics-tracking`
- `brainstorming`

## Dominios

### Produto e descoberta

#### `brainstorming`
- Serve para: destravar ideias vagas e transformar problemas abertos em direcoes testaveis.
- Quando usar: novos modulos, reposicionamento de produto, definicao de metricas operacionais.
- Exemplo Dale Vision: `Use brainstorming para propor 3 formas de transformar a auditoria de visao em um copiloto operacional de loja.`

#### `analytics-product`
- Serve para: pensar instrumentacao de produto, funis, cohorts e indicadores de uso.
- Quando usar: desenho de eventos do app, onboarding, funil de ativacao de lojas.
- Exemplo Dale Vision: `Use analytics-product para redesenhar o funil de onboarding de cameras e ROI no app.`

#### `ai-product`
- Serve para: ligar oportunidade de produto com arquitetura de IA executavel.
- Quando usar: copiloto de operacao, assistentes para suporte, recomendacoes operacionais.
- Exemplo Dale Vision: `Use ai-product para definir o MVP do Dale Copiloto para varejo fisico.`

#### `data-storytelling`
- Serve para: transformar dado bruto em narrativa executiva.
- Quando usar: relatorios para cliente, deck comercial, QBR, resumo de insights.
- Exemplo Dale Vision: `Use data-storytelling para converter eventos de fila, ocupacao e entrada em um resumo executivo para o lojista.`

#### `pricing-strategy`
- Serve para: modelar embalagem, monetizacao e willingness to pay.
- Quando usar: definicao de planos por loja, camera, modulo ou insight.
- Exemplo Dale Vision: `Use pricing-strategy para comparar precificacao por camera versus por loja para o Dale Vision.`

#### `product-inventor`
- Serve para: explorar novas propostas de valor e formatos de experiencia.
- Quando usar: novas superficies de UX, copiloto operacional, painel de calibracao.
- Exemplo Dale Vision: `Use product-inventor para reinventar a experiencia de configuracao de ROI com assistencia por IA.`

### Arquitetura e decisao tecnica

#### `software-architecture`
- Serve para: analisar trade-offs de arquitetura com foco em qualidade e operacao.
- Quando usar: decisoes entre edge, cloud, sync, filas, armazenamento de eventos.
- Exemplo Dale Vision: `Use software-architecture para decidir entre edge stateless com reidratacao de ROI e edge com cache persistente local.`

#### `c4-architecture-c4-architecture`
- Serve para: documentar arquitetura em C4.
- Quando usar: alinhamento tecnico, handoff para time, revisao de desenho.
- Exemplo Dale Vision: `Use c4-architecture-c4-architecture para documentar app web, backend Django, Supabase, n8n e edge-agent.`

#### `architecture-decision-records`
- Serve para: registrar ADRs de decisoes relevantes.
- Quando usar: qualquer decisao estrutural que afete deploy, confiabilidade ou custo.
- Exemplo Dale Vision: `Use architecture-decision-records para registrar a decisao de autostart do edge-agent via launcher local com supervisao.`

### IA, ML e agentes

#### `ai-ml`
- Serve para: fluxo geral de desenvolvimento de IA e ML.
- Quando usar: modelos de deteccao, pipelines de inferencia, RAG, avaliacao.
- Exemplo Dale Vision: `Use ai-ml para planejar a evolucao do pipeline de visao do edge-agent para modelos mais robustos de crossing e queue.`

#### `ai-engineer`
- Serve para: construir sistemas de IA produtivos, com foco em confiabilidade.
- Quando usar: RAG, copilotos, integrações LLM, arquitetura de agentes.
- Exemplo Dale Vision: `Use ai-engineer para desenhar um copiloto que interprete eventos do varejo e explique anomalias operacionais.`

#### `ai-agent-development`
- Serve para: desenvolver agentes autonomos e multiagentes.
- Quando usar: copiloto que investiga eventos, auditor de configuracao, assistente de suporte.
- Exemplo Dale Vision: `Use ai-agent-development para propor um agente que diagnostique problemas de loja combinando logs do edge, analytics e configuracao de ROI.`

#### `advanced-evaluation`
- Serve para: avaliar qualidade de modelos, prompts e agentes.
- Quando usar: LLM-as-judge, comparacao de respostas, rubricas de qualidade.
- Exemplo Dale Vision: `Use advanced-evaluation para definir um protocolo de avaliacao do Copiloto de Loja contra respostas de especialistas.`

### Qualidade de dados e analytics

#### `analytics-tracking`
- Serve para: desenhar tracking confiavel e util para decisao.
- Quando usar: eventos do app, ativacao, trial, fluxos de calibracao e setup.
- Exemplo Dale Vision: `Use analytics-tracking para definir os eventos minimos de onboarding, publicacao de ROI e ativacao do edge.`

#### `data-quality-frameworks`
- Serve para: validar contratos, regras e consistencia de dados.
- Quando usar: qualidade de eventos, ground truth, projeções e health de cameras.
- Exemplo Dale Vision: `Use data-quality-frameworks para criar verificacoes entre vision.crossing.v1, camera health e relatorios agregados.`

### Confiabilidade e fluxos operacionais

#### `error-handling-patterns`
- Serve para: definir padroes de erro, degradacao graciosa e recuperacao.
- Quando usar: edge-agent, integracoes HTTP, falhas de RTSP, retry e fallback.
- Exemplo Dale Vision: `Use error-handling-patterns para redesenhar o comportamento do edge-agent quando heartbeat funciona mas a visao cai.`

#### `workflow-orchestration-patterns`
- Serve para: orquestrar fluxos duraveis e de longa duracao.
- Quando usar: retry/replay de tarefas, sincronizacao edge-cloud, remediacao automatica.
- Exemplo Dale Vision: `Use workflow-orchestration-patterns para modelar um fluxo de reidratacao de ROI e recuperacao do edge-agent apos reboot.`

### Event sourcing, CQRS e read models

#### `cqrs-implementation`
- Serve para: separar lado de escrita e leitura.
- Quando usar: eventos brutos do edge versus projeções usadas em analytics.
- Exemplo Dale Vision: `Use cqrs-implementation para separar ingestao dos eventos vision.* das tabelas de relatorio operacional.`

#### `projection-patterns`
- Serve para: construir read models e projeções a partir de eventos.
- Quando usar: dashboards, relatorios, store health, confianca operacional.
- Exemplo Dale Vision: `Use projection-patterns para revisar por que Store Health e Analytics ficam defasados quando o edge cai.`

#### `event-store-design`
- Serve para: pensar persistencia de eventos, versionamento e replay.
- Quando usar: streams do edge, auditoria de visao, idempotencia e temporalidade.
- Exemplo Dale Vision: `Use event-store-design para revisar o desenho dos eventos vision.queue_state.v1, vision.zone_occupancy.v1 e vision.crossing.v1.`

## Playbooks

### Diagnosticar problema de edge-agent

Fluxo sugerido:
1. `error-detective`
2. `error-handling-patterns`
3. `workflow-orchestration-patterns`
4. `architecture-decision-records`

Prompt exemplo:
`Use error-detective e error-handling-patterns para identificar por que o edge-agent envia heartbeat 201 por alguns minutos e depois para. Em seguida use architecture-decision-records para registrar a correcao proposta.`

### Desenhar arquitetura escalavel

Fluxo sugerido:
1. `software-architecture`
2. `c4-architecture-c4-architecture`
3. `architecture-decision-records`
4. `cqrs-implementation`
5. `projection-patterns`

Prompt exemplo:
`Use software-architecture, cqrs-implementation e projection-patterns para desenhar uma arquitetura escalavel do Dale Vision com edge local, ingestao orientada a eventos e read models para dashboards.`

### Melhorar qualidade de dados e ground truth

Fluxo sugerido:
1. `analytics-tracking`
2. `data-quality-frameworks`
3. `advanced-evaluation`
4. `data-storytelling`

Prompt exemplo:
`Use analytics-tracking e data-quality-frameworks para propor um framework de qualidade de dados entre eventos vision.*, calibracao manual e relatorios de loja. Depois use advanced-evaluation para definir validacao de ground truth.`

### Planejar copiloto operacional para varejo

Fluxo sugerido:
1. `brainstorming`
2. `ai-product`
3. `ai-engineer`
4. `ai-agent-development`
5. `pricing-strategy`

Prompt exemplo:
`Use brainstorming, ai-product e ai-agent-development para planejar um copiloto operacional que detecte problemas de fila, queda do edge e baixa conversao por loja. Inclua proposta de monetizacao.`

## Estrutura final relevante

```text
.codex/skills/
  advanced-evaluation/
  ai-agent-development/
  ai-engineer/
  ai-ml/
  ai-product/
  analytics-product/
  analytics-tracking/
  architecture-decision-records/
  brainstorming/
  c4-architecture-c4-architecture/
  cqrs-implementation/
  data-quality-frameworks/
  data-storytelling/
  error-handling-patterns/
  event-store-design/
  pricing-strategy/
  product-inventor/
  projection-patterns/
  software-architecture/
  workflow-orchestration-patterns/
```

## Comandos usados

```powershell
python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/brainstorming --dest "c:\workspace\dale-vision\.codex\skills"

git clone --depth 1 https://github.com/sickn33/antigravity-awesome-skills.git ".codex\_tmp\antigravity-awesome-skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/software-architecture --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/ai-ml --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/advanced-evaluation --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/data-quality-frameworks --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/error-handling-patterns --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/workflow-orchestration-patterns --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/cqrs-implementation --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/projection-patterns --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/event-store-design --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/analytics-product --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/ai-product --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/ai-agent-development --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/data-storytelling --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/pricing-strategy --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/product-inventor --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/c4-architecture-c4-architecture --dest "c:\workspace\dale-vision\.codex\skills"

python "C:\Users\Alexandre\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py" --repo sickn33/antigravity-awesome-skills --path skills/architecture-decision-records --dest "c:\workspace\dale-vision\.codex\skills"
```

## Observacoes

- Nenhum codigo da aplicacao foi alterado.
- A organizacao por dominio foi documentada neste arquivo para preservar compatibilidade da discovery plana do agente.
- A colecao temporaria clonada para mapeamento ficou em [`.codex/_tmp/antigravity-awesome-skills`](/c:/workspace/dale-vision/.codex/_tmp/antigravity-awesome-skills).
