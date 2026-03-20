# Human Value + Money Flow - Tickets de Execucao (Jira-ready)

Data: `2026-03-20`  
Base: `PRD_Human_Value_MoneyFlow_Journey_2026-03-20.md`  
Escopo: narrativa de valor humano, ledger financeiro, ciclo fechado de execução e prova de ROI.

## Convencoes
- Story Points (SP): 1, 2, 3, 5, 8
- Prioridade: `P0/P1/P2`
- Status inicial sugerido: `TODO`
- Tipos: `Design`, `Frontend`, `Backend`, `Data`, `QA`

## Epic sugerida
- `EPIC-HV-MF-001`: Human Value + Money Flow para transformar DaleVision em sistema de controle + paz de espírito com prova financeira contínua.

## Bloco A - Dashboard (check-in em 30s)

### TICKET HV-DES-01
- Tipo: `Design`
- Prioridade: `P0`
- Titulo: `Definir UX de briefing diário com CTA e momento de orgulho`
- Descricao:
  - Projetar card de narrativa diária do Copiloto com estados (`calmo`, `atencao`, `critico`).
  - Projetar card de conquista ("Momento de orgulho") quando meta for batida.
- Rotas: `/app/dashboard`
- Criterios de aceite:
  1. Estados de mensagem definidos por contexto operacional.
  2. CTA primário de ação direta definido para cada estado.
  3. Handoff com variantes, copy e regras de exibição.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET HV-FE-01
- Tipo: `Frontend`
- Prioridade: `P0`
- Titulo: `Implementar briefing diário do Copiloto no dashboard`
- Descricao:
  - Renderizar bloco de narrativa diária com prioridade e CTA acionável.
  - Implementar card de conquista quando metas forem atingidas.
- Rotas: `/app/dashboard`
- Criterios de aceite:
  1. Briefing aparece em até 1 viewport sem scroll.
  2. CTA do briefing abre rota operacional contextual.
  3. Card de orgulho aparece apenas em condição válida.
- Dependencias: `HV-DES-01`, `HV-BE-01`
- Estimativa: `5 SP`

### TICKET HV-BE-01
- Tipo: `Backend`
- Prioridade: `P0`
- Titulo: `Expor payload de briefing diário e estado emocional operacional`
- Descricao:
  - Criar endpoint para resumo narrativo diário com prioridade de ação.
  - Retornar estado (`calmo`, `atencao`, `critico`) e recomendação principal.
- Rotas impactadas: consumo em `/app/dashboard`
- Criterios de aceite:
  1. Endpoint retorna payload completo por usuário/loja.
  2. Regras de prioridade são determinísticas e auditáveis.
  3. Fallback seguro quando não houver dados.
- Dependencias: nenhuma
- Estimativa: `5 SP`

### TICKET HV-DATA-01
- Tipo: `Data`
- Prioridade: `P0`
- Titulo: `Instrumentar funil de briefing diário`
- Descricao:
  - Eventos: `copilot_daily_briefing_viewed`, `copilot_daily_briefing_cta_clicked`, `moment_of_pride_viewed`.
- Criterios de aceite:
  1. Eventos carregam `store_id`, `briefing_state`, `cta_target`.
  2. Dashboard de conversão do briefing disponível.
- Dependencias: `HV-FE-01`
- Estimativa: `2 SP`

## Bloco B - Operations (ação humana e feedback)

### TICKET HV-DES-02
- Tipo: `Design`
- Prioridade: `P0`
- Titulo: `Definir UX de delegação humanizada e feedback de conclusão`
- Descricao:
  - Definir templates de mensagens com tom humano para WhatsApp.
  - Definir modal/etapa de feedback pós-conclusão (`resolveu/parcial/nao resolveu`).
- Rotas: `/app/operations`
- Criterios de aceite:
  1. Templates com variação por cenário operacional.
  2. Fluxo de feedback com baixa fricção.
  3. Handoff com estados e regras de validação.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET HV-FE-02
- Tipo: `Frontend`
- Prioridade: `P0`
- Titulo: `Implementar delegação humanizada e captura de feedback`
- Descricao:
  - Adicionar opções de tom e template na delegação.
  - Exibir captura de resultado no fechamento da ação.
- Rotas: `/app/operations`
- Criterios de aceite:
  1. Delegação envia mensagem contextual com tom humano.
  2. Fechamento da ação exige status de resultado.
  3. Histórico mostra resultado e comentário.
- Dependencias: `HV-DES-02`, `HV-BE-02`
- Estimativa: `5 SP`

### TICKET HV-BE-02
- Tipo: `Backend`
- Prioridade: `P0`
- Titulo: `Persistir resultado operacional e comentário pós-ação`
- Descricao:
  - Evoluir entidade de ação para armazenar outcome e feedback.
  - Expor no histórico de execução por loja.
- Rotas impactadas: `/app/operations`, `/app/reports`
- Criterios de aceite:
  1. Campos `outcome_status` e `outcome_comment` persistidos.
  2. API retorna resultado no timeline.
  3. Auditoria disponível por usuário/data.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET HV-DATA-02
- Tipo: `Data`
- Prioridade: `P0`
- Titulo: `Instrumentar delegação e fechamento de ação`
- Descricao:
  - Eventos: `operation_action_delegated`, `operation_action_completed`, `operation_action_feedback_submitted`.
- Criterios de aceite:
  1. Eventos incluem `store_id`, `action_id`, `outcome_status`.
  2. Conversão delegada -> concluída analisável.
- Dependencias: `HV-FE-02`
- Estimativa: `2 SP`

## Bloco C - Ledger e Money Flow (prova financeira)

### TICKET HV-BE-03
- Tipo: `Backend`
- Prioridade: `P0`
- Titulo: `Criar modelo e API do value ledger`
- Descricao:
  - Implementar entidade `value_ledger_entry` conforme PRD.
  - Expor agregados por loja/período e itens detalhados.
- Rotas impactadas: `/app/dashboard`, `/app/reports`
- Criterios de aceite:
  1. Ledger suporta `estimated`, `validated`, `official`.
  2. API retorna total recuperado, oportunidade e capture rate.
  3. Trilhas de atualização auditáveis.
- Dependencias: nenhuma
- Estimativa: `8 SP`

### TICKET HV-FE-03
- Tipo: `Frontend`
- Prioridade: `P0`
- Titulo: `Implementar cards e timeline de valor recuperado`
- Descricao:
  - Adicionar seção de `Valor Recuperado` no dashboard.
  - Adicionar visão analítica de ROI e oportunidade no reports.
- Rotas: `/app/dashboard`, `/app/reports`
- Criterios de aceite:
  1. Card principal mostra valor recuperado no período.
  2. Timeline lista ações com impacto financeiro.
  3. UI diferencia valor `estimado` vs `oficial` com badge.
- Dependencias: `HV-BE-03`
- Estimativa: `5 SP`

### TICKET HV-DATA-03
- Tipo: `Data`
- Prioridade: `P0`
- Titulo: `Modelar métricas de ROI e capture rate`
- Descricao:
  - Definir cálculo oficial para `ROI_periodo`, `Capture_Rate`, `Taxa_Fechamento_Alerta`.
  - Validar consistência com origem dos dados.
- Criterios de aceite:
  1. Dicionário de métricas publicado.
  2. Queries/transformações validadas com dados de homolog.
  3. Dashboard analítico de ROI pronto para produto.
- Dependencias: `HV-BE-03`
- Estimativa: `3 SP`

### TICKET HV-FE-04
- Tipo: `Frontend`
- Prioridade: `P1`
- Titulo: `Exibir comparação de evolução (MoM/YoY) no reports`
- Descricao:
  - Implementar cards de evolução comparando período atual e anterior.
  - Exibir frase narrativa orientada a valor.
- Rotas: `/app/reports`
- Criterios de aceite:
  1. Comparação MoM disponível quando houver dados.
  2. Comparação YoY habilitada quando base suportar.
  3. Mensagem narrativa refletindo o deltas de forma clara.
- Dependencias: `HV-BE-03`, `HV-DATA-03`
- Estimativa: `3 SP`

## Bloco D - Onboarding e Personalização humana

### TICKET HV-DES-03
- Tipo: `Design`
- Prioridade: `P1`
- Titulo: `Definir captura de objetivo pessoal e tom de notificação`
- Descricao:
  - Projetar etapa de onboarding para meta + motivação.
  - Projetar preferências de tom (`formal`, `amigável`) nas configurações.
- Rotas: `/onboarding`, `/app/settings`
- Criterios de aceite:
  1. Fluxo de coleta não aumenta abandono do onboarding.
  2. Preferências claramente compreensíveis.
  3. Handoff com copy e microinterações.
- Dependencias: nenhuma
- Estimativa: `2 SP`

### TICKET HV-BE-04
- Tipo: `Backend`
- Prioridade: `P1`
- Titulo: `Persistir objetivo do dono e preferências de tom`
- Descricao:
  - Salvar campos de motivação/meta e preferências de notificação no perfil.
  - Expor para consumo em briefing e notificações.
- Rotas impactadas: `/onboarding`, `/app/settings`, `/app/dashboard`
- Criterios de aceite:
  1. API de perfil aceita/retorna os novos campos.
  2. Compatível com usuários sem configuração prévia.
  3. Logs de atualização com auditoria.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET HV-FE-05
- Tipo: `Frontend`
- Prioridade: `P1`
- Titulo: `Implementar preferências humanas em onboarding e settings`
- Descricao:
  - Capturar motivação no onboarding.
  - Permitir edição de tom das notificações em settings.
- Rotas: `/onboarding`, `/app/settings`
- Criterios de aceite:
  1. Usuário salva/edita preferências sem erro.
  2. Dashboard reflete personalização de copy.
  3. Preferências persistem entre sessões.
- Dependencias: `HV-DES-03`, `HV-BE-04`
- Estimativa: `3 SP`

### TICKET HV-DATA-04
- Tipo: `Data`
- Prioridade: `P1`
- Titulo: `Instrumentar personalização e impacto em engajamento`
- Descricao:
  - Eventos: `owner_goal_defined`, `notification_tone_updated`, `notification_preferences_saved`.
- Criterios de aceite:
  1. Eventos com `tone`, `goal_type`, `profile_id`.
  2. Relatório de impacto em engajamento e retenção.
- Dependencias: `HV-FE-05`
- Estimativa: `2 SP`

## Bloco E - Ranking saudável e prova social

### TICKET HV-DES-04
- Tipo: `Design`
- Prioridade: `P2`
- Titulo: `Definir UX de ranking saudável entre lojas`
- Descricao:
  - Criar padrão de ranking com opção anonimizada e explicação de fairness.
  - Definir copy para evitar efeito de punição.
- Rotas: `/app/dashboard`, `/app/reports`
- Criterios de aceite:
  1. Regras de comparação transparentes.
  2. Opção de anonimização disponível.
  3. Componentes prontos para FE.
- Dependencias: nenhuma
- Estimativa: `2 SP`

### TICKET HV-BE-05
- Tipo: `Backend`
- Prioridade: `P2`
- Titulo: `Expor ranking por eficiência e benchmark de boas práticas`
- Descricao:
  - Disponibilizar endpoint com ranking e fatores explicativos.
  - Incluir flag de anonimização por conta.
- Rotas impactadas: `/app/dashboard`, `/app/reports`
- Criterios de aceite:
  1. Ranking ordenado por score e período.
  2. Fatores de contribuição por loja retornados.
  3. Anonimização aplicada quando configurada.
- Dependencias: nenhuma
- Estimativa: `5 SP`

### TICKET HV-FE-06
- Tipo: `Frontend`
- Prioridade: `P2`
- Titulo: `Implementar ranking saudável com insight acionável`
- Descricao:
  - Exibir posição da loja e sugestão de melhoria com link de ação.
  - Exibir benchmark com opção anonimizada.
- Rotas: `/app/dashboard`, `/app/reports`
- Criterios de aceite:
  1. Ranking renderiza com contexto e explicabilidade.
  2. CTA leva para ação operacional relevante.
  3. Estado anonimizado respeitado na UI.
- Dependencias: `HV-DES-04`, `HV-BE-05`
- Estimativa: `3 SP`

## QA transversal

### TICKET HV-QA-01
- Tipo: `QA`
- Prioridade: `P0`
- Titulo: `Validar regressão de jornada owner com tese de valor humano + ROI`
- Descricao:
  - Cobrir fluxo fim-a-fim: dashboard -> operations -> alerts -> reports.
  - Validar rastreabilidade de eventos e integridade do ledger.
- Criterios de aceite:
  1. Nenhum bloqueio P0/P1 em go-live.
  2. Eventos obrigatórios disparando com payload correto.
  3. Valores de ROI consistentes entre telas e API.
- Dependencias: blocos A, B, C
- Estimativa: `5 SP`

## Resumo de capacidade estimada
- Design: `10 SP`
- Frontend: `27 SP`
- Backend: `24 SP`
- Data: `11 SP`
- QA: `5 SP`
- Total: `77 SP`

## Sequência recomendada de execução
1. Bloco C (`Ledger`) e Bloco A (`Briefing`) como fundação de valor.
2. Bloco B (`Execução + feedback`) para fechar ciclo operacional.
3. Bloco D (`Personalização`) para aumentar conexão emocional.
4. Bloco E (`Ranking saudável`) como expansão de engajamento.
5. QA transversal e go/no-go por critérios de confiança.

## Planejamento sugerido por sprint (capacidade de referência)
Capacidade usada como referência do time (base Sprint 2): ~`50 SP` por sprint.

## Sprint 3 (foco P0 - valor comprovável)
Objetivo: colocar no ar a prova financeira e o ciclo de ação com narrativa diária.

Tickets recomendados:
1. `HV-BE-03` (8 SP)
2. `HV-DATA-03` (3 SP)
3. `HV-FE-03` (5 SP)
4. `HV-DES-01` (3 SP)
5. `HV-BE-01` (5 SP)
6. `HV-FE-01` (5 SP)
7. `HV-DATA-01` (2 SP)
8. `HV-DES-02` (3 SP)
9. `HV-BE-02` (3 SP)
10. `HV-FE-02` (5 SP)
11. `HV-DATA-02` (2 SP)
12. `HV-QA-01` (5 SP)

Total estimado Sprint 3: `49 SP`

Go-live gate Sprint 3:
1. Ledger disponível em dashboard/reports com badge de confiança.
2. Briefing diário com CTA funcionando por contexto.
3. Delegação e fechamento de ação com feedback registrados.
4. Eventos P0 válidos em homolog com payload correto.

## Sprint 4 (foco P1/P2 - profundidade e expansão)
Objetivo: elevar conexão emocional e diferenciação de produto.

Tickets recomendados:
1. `HV-FE-04` (3 SP)
2. `HV-DES-03` (2 SP)
3. `HV-BE-04` (3 SP)
4. `HV-FE-05` (3 SP)
5. `HV-DATA-04` (2 SP)
6. `HV-DES-04` (2 SP)
7. `HV-BE-05` (5 SP)
8. `HV-FE-06` (3 SP)

Total estimado Sprint 4: `23 SP`

Capacidade residual Sprint 4:
1. Hardening de QA/observabilidade.
2. Testes A/B de copy/tom.
3. Preparação de rollout controlado por perfil de cliente.

## Recorte MVP (se houver restrição de capacidade)
Se a capacidade real cair para ~`30 SP`, executar primeiro:
1. `HV-BE-03`
2. `HV-FE-03`
3. `HV-BE-01`
4. `HV-FE-01`
5. `HV-BE-02`
6. `HV-FE-02`

Resultado mínimo garantido:
1. Prova de valor financeiro no produto.
2. Narrativa diária com próxima ação recomendada.
3. Loop operacional fechado com feedback de resultado.

## Riscos e mitigação
- Risco: valor financeiro percebido como "caixa preta".
  - Mitigação: badges de confiança + fórmula explicada + trilha de origem.
- Risco: mensagens emocionais soarem artificiais.
  - Mitigação: A/B test de copy por persona e opt-out.
- Risco: aumento de complexidade no dashboard.
  - Mitigação: limite de 1 CTA principal por card e progressive disclosure.
