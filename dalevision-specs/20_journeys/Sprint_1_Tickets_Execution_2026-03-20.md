# Sprint 1 - Tickets de Execucao (Jira-ready)

Data: `2026-03-20`
Base: `Sprint_1_PRD_UX_2026-03-20.md`
Escopo: `UX-01`, `UX-02`, `UX-03`, `UX-07`, `UX-13`

## Convencoes
- Story Points (SP): 1, 2, 3, 5, 8
- Prioridade: `P0`
- Status inicial sugerido: `TODO`
- Tipos: `Design`, `Frontend`, `Backend`, `Data`, `QA`

## Epic sugerida
- `EPIC-S1-UX-ACTIVATION-VALUE`: Refino de ativacao e tempo ate primeira acao com valor.

## UX-01 - Ativacao e Callback Unificados

### TICKET S1-DES-01
- Tipo: `Design`
- Titulo: `Definir fluxo visual unificado de ativacao/callback com estados de erro`
- Descricao:
  - Criar fluxo e copy para estados `validando`, `sucesso`, `acao necessaria` em `/auth/callback`.
  - Incluir variacoes de erro: timeout, token invalido, email nao confirmado.
  - Definir hierarquia de CTAs: `Tentar novamente`, `Reenviar email`, `Voltar ao login`.
- Rotas: `/activate`, `/auth/callback`, `/login`
- Criterios de aceite:
  1. Wireframe/prototipo com 100% dos estados previstos no PRD.
  2. Copy aprovada para mensagens de erro e recuperacao.
  3. Especificacao entregue para FE com comportamento dos CTAs.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET S1-FE-01
- Tipo: `Frontend`
- Titulo: `Implementar estados unificados no AuthCallback + fallback guiado`
- Descricao:
  - Atualizar `/auth/callback` para refletir estados do design.
  - Garantir fluxos de retry e retorno para `/login` sem quebrar contexto.
  - Incluir CTA de reenvio de email quando aplicavel.
- Rotas: `/auth/callback`, `/login`
- Criterios de aceite:
  1. Fluxo de retry funcional sem redirecionar para home.
  2. CTA de reenvio visivel e acionavel no estado correto.
  3. Navegacao final usando `resolvePostLoginRoute` apos sucesso.
- Dependencias: `S1-DES-01`
- Estimativa: `5 SP`

### TICKET S1-DATA-01
- Tipo: `Data`
- Titulo: `Instrumentar eventos de ativacao/callback`
- Descricao:
  - Instrumentar eventos: `activation_callback_started`, `activation_callback_failed`, `activation_resend_clicked`, `activation_callback_completed`.
  - Definir payload minimo padrao: `user_id`, `timestamp`, `error_type` (quando houver), `source_route`.
- Rotas: `/auth/callback`, `/login`
- Criterios de aceite:
  1. Eventos disparados em 100% dos caminhos do fluxo.
  2. Payload consistente e validado em ambiente de homologacao.
  3. Documento de eventos atualizado.
- Dependencias: `S1-FE-01`
- Estimativa: `2 SP`

### TICKET S1-QA-01
- Tipo: `QA`
- Titulo: `Validar regressao e cenarios de erro do callback`
- Descricao:
  - Cobrir sucesso, timeout, erro de token, email nao confirmado e retry.
- Criterios de aceite:
  1. Suite manual/automatica cobrindo 5 cenarios.
  2. Nenhum bloqueio P0 aberto para go-live.
- Dependencias: `S1-FE-01`
- Estimativa: `2 SP`

## UX-02 - Proximo Passo Recomendado Pos-login

### TICKET S1-DES-02
- Tipo: `Design`
- Titulo: `Desenhar componente de explicacao de roteamento pos-login`
- Descricao:
  - Definir componente nao bloqueante com razao da rota + CTA unico.
  - Variantes: onboarding, edge setup, admin control tower.
- Rotas: `/onboarding`, `/app/dashboard`, `/app/admin`
- Criterios de aceite:
  1. Variantes com copy e CTA aprovados.
  2. Regras de exibicao por sessao documentadas.
- Dependencias: nenhuma
- Estimativa: `2 SP`

### TICKET S1-FE-02
- Tipo: `Frontend`
- Titulo: `Implementar bloco de proximo passo recomendado no primeiro acesso`
- Descricao:
  - Renderizar componente contextual apos login em rota destino.
  - Persistir dismiss por sessao.
- Rotas: `/onboarding`, `/app/dashboard`, `/app/admin`
- Criterios de aceite:
  1. Componente aparece apenas no primeiro acesso da sessao.
  2. CTA navega para proxima etapa sem perda de contexto.
  3. Dismiss nao reaparece na mesma sessao.
- Dependencias: `S1-DES-02`
- Estimativa: `3 SP`

### TICKET S1-DATA-02
- Tipo: `Data`
- Titulo: `Instrumentar eventos do explainer pos-login`
- Descricao:
  - Eventos: `post_login_explainer_shown`, `post_login_explainer_cta_clicked`, `post_login_explainer_dismissed`.
- Criterios de aceite:
  1. Eventos enviados com `target_route` e `reason_code`.
  2. Validados em homologacao.
- Dependencias: `S1-FE-02`
- Estimativa: `1 SP`

## UX-03 - Checklist de Edge Setup por Estado

### TICKET S1-DES-03
- Tipo: `Design`
- Titulo: `Projetar checklist de ativacao edge e first signal`
- Descricao:
  - Definir UX do checklist com estados: `token`, `agent_online`, `heartbeat`, `camera_health`, `first_metrics`.
  - Definir componentes para estado ok, pendente, erro e regressao.
- Rotas: `/app/dashboard?openEdgeSetup=1`, `/app/edge-help`, `/app/cameras`
- Criterios de aceite:
  1. Fluxo visual completo para 5 estados.
  2. CTAs de correção mapeados por estado.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET S1-BE-01
- Tipo: `Backend`
- Titulo: `Expor status agregado de ativacao edge por loja`
- Descricao:
  - Criar/ajustar endpoint para retornar os 5 estados do checklist por `store_id`.
  - Incluir regra de regressao (ex.: heartbeat stale).
- Rotas impactadas: consumo em `/app/dashboard`
- Criterios de aceite:
  1. Endpoint retorna estrutura padronizada dos 5 estados.
  2. SLA de resposta adequado para uso em dashboard.
  3. Logs de falha de integracao presentes.
- Dependencias: nenhuma
- Estimativa: `5 SP`

### TICKET S1-FE-03
- Tipo: `Frontend`
- Titulo: `Implementar checklist edge guiado por estado no dashboard`
- Descricao:
  - Consumir endpoint agregado e renderizar checklist.
  - Aplicar deep links de correção com `store_id`.
- Rotas: `/app/dashboard`, `/app/edge-help`, `/app/cameras`, `/app/operations/stores/:storeId`
- Criterios de aceite:
  1. Checklist mostra 5 estados por loja selecionada.
  2. CTA de cada item abre rota correta com contexto.
  3. Milestone de ativacao concluida aparece quando todos estados OK.
- Dependencias: `S1-DES-03`, `S1-BE-01`
- Estimativa: `5 SP`

### TICKET S1-DATA-03
- Tipo: `Data`
- Titulo: `Instrumentar eventos de checklist edge e first signal`
- Descricao:
  - Eventos: `edge_checklist_viewed`, `edge_checklist_step_clicked`, `edge_first_signal_achieved`.
- Criterios de aceite:
  1. Eventos com `store_id` e `step_name` quando aplicavel.
  2. Validacao em homologacao.
- Dependencias: `S1-FE-03`
- Estimativa: `2 SP`

## UX-07 - Escalada Tecnica com Contexto

### TICKET S1-DES-04
- Tipo: `Design`
- Titulo: `Desenhar fluxo de escalada tecnica com contexto pre-preenchido`
- Descricao:
  - Definir padrao de botao `Escalar incidente tecnico` em alertas e detalhes da loja.
  - Definir payload de contexto visivel ao usuario (store/camera/evento).
- Rotas: `/app/alerts`, `/app/operations/stores/:storeId`, `/app/edge-help`
- Criterios de aceite:
  1. Especificacao de comportamento e copy aprovada.
  2. Estados com e sem `camera_id` definidos.
- Dependencias: nenhuma
- Estimativa: `2 SP`

### TICKET S1-FE-04
- Tipo: `Frontend`
- Titulo: `Implementar CTA de escalada tecnica e navegacao contextual`
- Descricao:
  - Adicionar CTA em alertas e store details.
  - Navegar para `/app/edge-help` com query params contextualizados.
- Rotas: `/app/alerts`, `/app/operations/stores/:storeId`, `/app/edge-help`
- Criterios de aceite:
  1. Escalada abre edge-help com `store_id` sempre preenchido.
  2. Quando existir, incluir `camera_id` e `event_id`.
  3. Nao quebrar navegacao atual de alertas.
- Dependencias: `S1-DES-04`
- Estimativa: `3 SP`

### TICKET S1-BE-02
- Tipo: `Backend`
- Titulo: `Persistir historico de escalada tecnica por incidente`
- Descricao:
  - Registrar acao de escalada vinculada ao evento/incidente para auditoria.
- Criterios de aceite:
  1. Historico consultavel por incidente.
  2. Registro inclui ator, timestamp, contexto tecnico.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET S1-DATA-04
- Tipo: `Data`
- Titulo: `Instrumentar funil de escalada tecnica`
- Descricao:
  - Eventos: `incident_escalate_clicked`, `incident_escalate_opened_edge_help`, `incident_escalate_completed`.
- Criterios de aceite:
  1. Eventos com `store_id` e `incident_type`.
  2. Conversao do funil mensuravel em dashboard analitico.
- Dependencias: `S1-FE-04`, `S1-BE-02`
- Estimativa: `2 SP`

## UX-13 - Upgrade Orientado a Prova

### TICKET S1-DES-05
- Tipo: `Design`
- Titulo: `Definir experiencia de upgrade baseada em prova de impacto`
- Descricao:
  - Desenhar secao `antes vs depois` e `acoes que geraram resultado`.
  - Definir variante para caso sem dados suficientes.
- Rotas: `/app/reports`, `/app/upgrade`
- Criterios de aceite:
  1. Layout com 2 variacoes (com dados e sem dados).
  2. CTA de upgrade contextual com copy aprovada.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET S1-BE-03
- Tipo: `Backend`
- Titulo: `Expor resumo de prova de impacto para fluxo de upgrade`
- Descricao:
  - Endpoint/ajuste para retorno de indicadores comparativos e resumo de acoes efetivas.
- Rotas impactadas: consumo em `/app/upgrade`
- Criterios de aceite:
  1. Retorna ao menos 3 indicadores quando houver dados.
  2. Sinaliza estado `insufficient_data` quando nao houver base.
- Dependencias: nenhuma
- Estimativa: `5 SP`

### TICKET S1-FE-05
- Tipo: `Frontend`
- Titulo: `Implementar tela de upgrade com narrativa de prova`
- Descricao:
  - Renderizar comparativo e lista de acoes com resultado quando dados disponiveis.
  - Renderizar plano de acao quando dados insuficientes.
- Rotas: `/app/upgrade`, apoio `/app/reports`
- Criterios de aceite:
  1. Com dados: exibicao de 3+ indicadores e CTA contextual.
  2. Sem dados: plano de acao claro para gerar prova.
  3. Compatibilidade com guard de assinatura atual.
- Dependencias: `S1-DES-05`, `S1-BE-03`
- Estimativa: `5 SP`

### TICKET S1-DATA-05
- Tipo: `Data`
- Titulo: `Instrumentar eventos de prova no upgrade`
- Descricao:
  - Eventos: `upgrade_proof_viewed`, `upgrade_proof_cta_clicked`, `upgrade_proof_insufficient_data_shown`.
- Criterios de aceite:
  1. Eventos com `proof_mode` (`with_data`|`insufficient_data`).
  2. Origem da prova registrada (`reports`|`upgrade`).
- Dependencias: `S1-FE-05`
- Estimativa: `1 SP`

## Resumo de capacidade estimada
- Design: `13 SP`
- Frontend: `21 SP`
- Backend: `13 SP`
- Data: `8 SP`
- QA: `2 SP`
- Total Sprint 1: `57 SP`

## Sequencia recomendada de execucao
1. Design (`S1-DES-*`) em paralelo na semana 1.
2. Backend habilitador (`S1-BE-01`, `S1-BE-03`, `S1-BE-02`).
3. Frontend por fluxo: callback -> pos-login -> edge checklist -> escalada -> upgrade.
4. Data tracking acoplado ao fechamento de cada fluxo.
5. QA de regressao e checklist de go-live.

## Riscos e mitigacao
- Risco: dependencias de endpoint atrasarem UX de edge/upgrade.
  - Mitigacao: mocks temporarios e feature flag por modulo.
- Risco: instrumentacao inconsistente entre fluxos.
  - Mitigacao: schema unico de eventos antes de iniciar FE.
- Risco: escopo exceder capacidade da sprint.
  - Mitigacao: quebrar `S1-FE-05` em MVP (bloco prova + CTA) e fase 2 (narrativa expandida).
