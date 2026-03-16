# Referencia de Execucao por Sprint (DaleVision)

## Plano executivo consolidado
- Ver `70_ops/Plano_Executavel_Edge_to_Product.md` para backlog com DoR, DoD, testes e evidencias por task.
- Ver `70_ops/Matriz_Operacional_CV_AI_2026-03.md` para trilha tecnica completa de dados/CV/ML/MLOps e estagio de maturidade.
- Ver `70_ops/Backlog_Executavel_CV_AI_MLOps_2026-03.md` para tickets priorizados por sprint com owner, esforco e aceite.
- Ver `30_system/AI_Operations_Brain_Backend_Deep_Spec_2026-03.md` para arquitetura backend alvo (`evento -> decisao -> acao -> outcome -> valor`) e sequencia de implementacao por sprint.

## Data de referencia
- 2026-03-09

## Atualizacao complementar (2026-03-15)
- Trilha produto/ROI (Sprint 2): `DONE (ENG + GOVERNANCA)` com validacao de campo pendente.
- Pendencia remanescente: evidencia operacional em loja remota (dados reais multi-loja).
- Decisao: manter checklist de Sprint 2 marcado como concluido em engenharia e seguir em paralelo com:
1. auto-update do edge-agent;
2. refinamento de computer vision via admin (calibracao e confianca).

Gate de encerramento tecnico (definitivo):
1. `incident_response.target_status.overall = go` por 3 dias seguidos;
2. `runbook_coverage_rate_pct >= 80`;
3. `avg_time_to_runbook_seconds <= 900`;
4. evidence pack diario sem falha.
Checklist de campo para aceite final: `70_ops/S2_Field_Validation_Gate.md`.

## Atualizacao complementar (2026-03-16)
- Reports recebeu governanca de desfecho de acao (status `completed`/`failed`) com filtro operacional dedicado.
- Resumo executivo passou a destacar tambem taxa de falha (`failure_rate`) e total de falhas (`actions_failed_total`).
- Breakdown por source de acao (dispatch/completion/failure) incorporado para leitura de gargalo por canal.
- Completion rate agora pode ser acompanhado junto de failure rate na mesma superficie, reduzindo "falso positivo" de execucao.
- Sprint 4 (auto-update) avancou para estado `ENG AVANCADA`:
  - canal de rollout (`all/stable/canary`) ativo em Operations, Reports e Dashboard;
  - leitura de `current_version` + `target_version` + `version_gap` nas lojas criticas;
  - edge-agent com `attempt` incremental persistido no ciclo de update (pre/post restart).

Leitura de sprint:
- `S2` continua fechado para engenharia.
- pendencia restante continua exclusivamente operacional (validacao remota de campo + evidencia de estabilidade).
- `S4` segue em execucao com pendencia de campo (canary real + rollback controlado + lote de lojas).

## Plano da semana (complementar ao roadmap de sprint)

### D1-D2 (Sprint 2 operacional)
1. Validar em loja remota:
- autostart sem intervencao;
- ingestao backend com `camera_health` e eventos atomicos;
- status de pipeline no reports.
2. Capturar primeira rodada de evidencia automatica:
- `sprint2-evidence-pack`;
- `sprint2-daily-log`.

### D3-D4 (ponte para Sprint 4 auto-update)
1. Definir contrato de update:
- versao atual/alvo por loja;
- canal `stable/canary`;
- eventos de update (`started`, `downloaded`, `activated`, `healthy`, `rolled_back`, `failed`).
2. Publicar runbook de rollback remoto.

Status atual (2026-03-16):
- contrato backend em andamento com validacao tecnica de idempotencia no `update-report` e fingerprint de policy no `update-policy`;
- proximo fechamento: acoplar executor no edge-agent para publicar `idempotency_key` de forma padronizada.

### D5-D7 (ponte para Sprint 3 CV/admin)
1. Rodar ajuste de calibracao assistida por admin:
- ROI/thresholds por camera;
- criterios de aceitacao por segmento.
2. Consolidar comparativo before/after:
- fila, cobertura, confianca;
- impacto estimado em R$ com governanca (`official/proxy/estimated`).

### Entregavel da semana (executivo)
- decisao operacional documentada: `GO` ou `NO-GO` da validacao de campo;
- backlog priorizado e pronto para execucao de:
1. Sprint 4 (auto-update);
2. Sprint 3 (confianca CV/admin).

## Sprint atual (oficial)
- `Sprint S2 - Repeatable Multi-Store Foundation`
- Status: `DONE (ENG + GOVERNANCA) / FIELD VALIDATION PENDING`
- Janela alvo: fechamento operacional nesta semana de campo
- Objetivo: confirmar em campo que o pacote tecnico ja implantado sustenta repeticao multi-loja.

## Atualizacao de status (11/03/2026)
- `S0`:
- autostart install/remove validado em ambiente remoto (task scheduler + encerramento de processos) com evidencia em log.
- heartbeat do edge recuperado apos ajuste de infraestrutura backend (migrations/render).
- pendencia: validacao presencial com cameras reais para fechamento completo do S0.
- `S1`:
- iniciado hardening de confiabilidade no frontend para timeout de API (fallback por cache em dashboard e edge-status).
- contrato de projecao com identidade forte ja aplicado no backend/db.
- `S2`:
- implementado em codigo:
- edge-agent com `CAMERA_SOURCE_MODE` (`api_first` default, `local_only` contingencia) e fallback explicito para `CAMERAS_JSON`.
- wizard/frontend atualizado para gerar perfil com `CAMERA_SOURCE_MODE`.
- pendencia para fechamento operacional: validacao em 1 loja com perfil `api_first`.
- `S3`:
- planejamento de escala iniciado em `70_ops/S3_Product_Scale_Readiness_Plan.md`.
- execucao de S3 condicionada ao aceite operacional de loja em `api_first`.

## Regra de mudanca de sprint
- So muda de sprint quando **todos os gates de saida** do sprint atual forem aprovados com evidencia.
- Sem evidencia em log/teste repetivel = item nao concluido.

## Como saber em qual sprint estamos
- `S2` fecha quando o gate tecnico acima ficar `go` por 3 dias e a validacao em loja remota for anexada.
- Enquanto isso, podemos executar itens de `S3/S4` em paralelo desde que:
1. nao removam evidencias do S2;
2. nao quebrem o `incident_response` no reports;
3. mantenham rollback rapido para edge update.

---

## Sprint S0 - Stabilize Edge in Production

### Objetivo
Garantir que o agente inicia sozinho, sustenta conexao, publica health/eventos sem intervencao manual.

### Entregaveis
1. Autostart unico e previsivel (sem caminhos concorrentes).
2. Processo do agente sustentado por watchdog/restart com logs claros.
3. Integridade por camera sem contaminacao entre streams.
4. Eventos atomicos minimos ativos no piloto (entrada, balcao, salao).

### Definition of Ready (DoR)
- Build unico publicado e instalado no host da loja.
- `.env` validado e congelado para teste.
- Mapeamento fisico camera_id -> funcao aprovado.
- Metodo de startup definido (Task Scheduler **ou** Startup shortcut), sem duplicidade.

### Testes obrigatorios
1. 5 ciclos reboot/login com evidencia.
2. 30 minutos de soak sem abrir shell manual.
3. `camera health` 3/3 e heartbeat continuo.
4. Eventos `crossing`, `queue_state`, `checkout_proxy`, `zone_occupancy` com timestamp recente.
5. Verificacao de processo: sem dependencia de janela aberta de PowerShell.

### Gate de saida (DoD)
- 5/5 reboots com sucesso.
- Soak >= 30 minutos sem queda.
- Ultimo heartbeat < 2 minutos durante teste.
- Ultimo camera health < 2 minutos para 3/3.
- 0 casos de sobrescrita entre cameras em auditoria.

---

## Sprint S1 - Measurement-Ready (Single Store)

### Objetivo
Transformar telemetria em medicao confiavel para operacao diaria da loja piloto.

### Entregaveis
1. Governanca oficial/proxy/estimada aplicada em telas e APIs.
2. Playbook operacional do segmento (gelateria + cafe).
3. Relatorio executivo de 1 pagina com baseline e recomendacoes.
4. Pipeline inicial de calibracao/validacao humana (ground truth v1).

### DoR
- Sprint S0 concluido.
- ROI por camera aprovado em campo.
- Taxonomia de eventos e ownership fechados.

### Testes obrigatorios
1. Comparacao observacao humana vs sistema em janelas definidas.
2. Auditoria de labels `official | proxy | estimated` em dashboards.
3. Simulacao de decisao operacional usando playbook (ex.: fila > limite).
4. Registro de confianca por metrica/camera.

### Gate de saida (DoD)
- Baseline operacional documentado.
- Erro por metrica dentro do tolerado para piloto.
- Cliente entende diferenca entre proxy e oficial sem ambiguidade.
- Material comercial-tecnico pronto para repetir em nova loja.

---

## Sprint S2 - Repeatable Multi-Store Foundation

### Objetivo
Repetir o piloto em mais lojas do mesmo operador com padrao de qualidade e suporte.

### Entregaveis
1. Pacote de onboarding replicavel por loja.
2. Comparabilidade entre lojas com cobertura minima por turno.
3. Operacao de suporte remoto com runbooks padrao.
4. Auto-update e observabilidade de rollout controlado.

### DoR
- S1 concluido e aprovado.
- Checklist de instalacao e calibracao padronizado.

### Testes obrigatorios
1. Repetir onboarding em 2a loja com mesmo resultado de estabilidade.
2. Validar SLA de recuperacao apos falha de internet/host.
3. Validar pacote de atualizacao sem interromper operacao.

### Gate de saida (DoD)
- Operacao consistente em mais de uma loja.
- Indicadores comparaveis entre lojas com cobertura minima atendida.
- Runbook de suporte com MTTR medido.

---

## Sprint S3 - Product Scale Readiness

### Objetivo
Preparar a plataforma para escala comercial com confianca executiva.

### Entregaveis
1. Ground truth continuo com detecao de drift.
2. Camada de confianca auditavel por metrica.
3. Copiloto operacional (recomendacoes com impacto estimado).
4. Roadmap de integracoes (POS, RH, estoque) por valor.

### DoR
- S2 concluido.
- Dados historicos suficientes por segmento.

### Testes obrigatorios
1. Drift detection ativo com alertas e acao recomendada.
2. Validacao mensal de acuracia por segmento/condicao.
3. Teste de explainability para recomendacoes.

### Gate de saida (DoD)
- Produto vendavel como plataforma de decisao, nao apenas dashboard.
- Nivel de confianca sustentado por auditoria recorrente.

---

## Backlog imediato (iniciar hoje)

1. Fechar metodo unico de autostart e remover caminhos concorrentes.
2. Rodar protocolo de 5 reboot/login com checklist e evidencias.
3. Rodar soak de 30 min + coleta de heartbeat/camera health.
4. Auditar integridade por camera no `vision/audit`.
5. Congelar playbook v1 de gelateria/cafe com acoes e thresholds.
6. Preparar relatorio executivo v1 com baseline atual.

## Ritual diario de acompanhamento (obrigatorio)
- Abrir o board de retorno e atualizar status de cada item.
- Registrar evidencias (log/print/query) no mesmo dia.
- Revisar gate GO/NO-GO ao fim do dia.
- Publicar decisao diaria:
- `segue plano`
- `replanejar`
- `no-go tecnico`

## Dono por trilha (preencher)
- Edge stability:
- Backend/auditoria:
- Produto/playbook:
- Suporte/operacao:

## Evidencias obrigatorias por item
- Caminho do log:
- Timestamp inicial/final:
- Resultado:
- Decisao:
