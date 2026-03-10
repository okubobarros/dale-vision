# Referencia de Execucao por Sprint (DaleVision)

## Plano executivo consolidado
- Ver `70_ops/Plano_Executavel_Edge_to_Product.md` para backlog com DoR, DoD, testes e evidencias por task.

## Data de referencia
- 2026-03-09

## Sprint atual (oficial)
- `Sprint S0 - Stabilize Edge in Production`
- Status: `IN_PROGRESS`
- Janela alvo: ate retorno em loja (12/03/2026 ou 13/03/2026)
- Objetivo: sair de `Unreliable` para `Operationally Stable` no piloto.

## Regra de mudanca de sprint
- So muda de sprint quando **todos os gates de saida** do sprint atual forem aprovados com evidencia.
- Sem evidencia em log/teste repetivel = item nao concluido.

## Como saber em qual sprint estamos
- Estamos em `S0` enquanto qualquer item abaixo nao estiver 100% aprovado:
1. autostart 5/5 reboots sem intervencao manual;
2. soak >= 30 min com heartbeat e camera health ativos;
3. integridade por camera sem contaminacao;
4. eventos atomicos minimos ativos no piloto.
- Quando os 4 itens acima estiverem aprovados com evidencia, o status muda para `S1`.

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
