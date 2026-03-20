# PRD - Valor Humano + Money Flow na Jornada do Dono Multi-Loja

Data: `2026-03-20`  
Status: `Draft para execução`  
Alinhamento: `Journey_Owner.md`, `Journey_SaaS_Admin_Control_Tower.md`, `Journey_StoreStaff.md`, `Sprint_2_PRD_UX_2026-03-20.md`

Backlog Jira-ready: `PRD_Human_Value_MoneyFlow_Tickets_Execution_2026-03-20.md`

## Objetivo do documento
Traduzir a tese "ROI + paz de espírito" em backlog executável por rota, com service design, user stories, critérios de aceite, tracking e métricas de negócio.

## Tese de valor
O DaleVision não entrega apenas monitoramento e recuperação de receita.  
Entrega também:
1. Previsibilidade operacional.
2. Redução de ansiedade do dono.
3. Sensação de controle em 30 segundos.
4. Orgulho e progresso visível da rede.

## ICP e Jobs-to-be-Done
Perfil foco: dono/admin de rede multi-loja com operação distribuída.

### Jobs funcionais
1. Detectar risco operacional cedo.
2. Delegar ação rápida sem trocar de contexto.
3. Confirmar desfecho e aprender com histórico.
4. Provar retorno financeiro com evidência.

### Jobs emocionais
1. Dormir tranquilo sem medo de surpresa.
2. Confiar que a rede está sob controle mesmo à distância.
3. Sentir orgulho da padronização e evolução da operação.

## Princípios de produto
1. Antecipar antes de reagir: recomendação com contexto.
2. Fechar ciclo: alerta -> ação -> desfecho -> valor capturado.
3. Um clique para executar: sem navegação desnecessária.
4. Clareza de confiança: sempre rotular `estimado`, `proxy`, `oficial`.
5. Human-first copy: linguagem de suporte, não de punição.

## Service Design da Jornada (Frontstage + Backstage)

### Etapa 1 - Check-in emocional e operacional (30 segundos)
- Rota: `/app/dashboard`
- Opções do usuário:
1. Ver resumo da rede.
2. Abrir alerta crítico.
3. Delegar ação imediata.
4. Ajustar meta mensal.
- Frontstage (o que o usuário vê):
1. Narrativa diária do Copiloto.
2. Cards de risco financeiro agora.
3. Card "Momento de orgulho" quando meta batida.
- Backstage (o que o sistema faz):
1. Agrega sinais de alertas, operações e ledger.
2. Calcula risco e prioridade por loja.
3. Gera mensagem contextual por persona.
- Valor gerado:
1. Reduz ansiedade de início de dia.
2. Dá sensação de controle e direção.

### Etapa 2 - Execução e coordenação da rede
- Rota: `/app/operations`
- Opções do usuário:
1. Abrir loja com pior performance.
2. Delegar ação no WhatsApp.
3. Marcar ação como concluída.
4. Escalar incidente técnico.
- Frontstage:
1. Lista de prioridades com CTA direto.
2. Mensagens de delegação com tom humano.
3. Feedback de conclusão com aprendizado rápido.
- Backstage:
1. Gera payload de ação com contexto da loja.
2. Dispara automação (n8n/integrações).
3. Atualiza status operacional e trilha.
- Valor gerado:
1. Menos retrabalho do dono.
2. Mais velocidade de execução do time.

### Etapa 3 - Fechamento guiado de alertas
- Rotas: `/app/alerts`, `/app/alerts/history`
- Opções do usuário:
1. Encerrar como `resolvido_localmente`.
2. Encerrar como `delegado` com motivo.
3. Encerrar como `incidente_tecnico` com motivo.
4. Revisar histórico por loja.
- Frontstage:
1. Fluxo guiado de desfecho em até 2 interações.
2. Histórico de logs e ator do desfecho.
3. Contexto de loja preservado entre módulos.
- Backstage:
1. Persistência do desfecho padronizado.
2. Tracking de eventos de resolução.
3. Sincronização de histórico sem reload total.
- Valor gerado:
1. Rastreabilidade real do turno.
2. Aprendizado de quais ações funcionam.

### Etapa 4 - Diagnóstico de câmera por causa
- Rotas: `/app/cameras`, `/app/edge-help`
- Opções do usuário:
1. Diagnosticar por causa (`credencial`, `conectividade`, `stream`, `heartbeat`).
2. Corrigir agora (editar câmera/seguir playbook).
3. Validar correção.
- Frontstage:
1. Causa provável destacada por câmera.
2. Próxima ação recomendada contextual.
3. CTA de validação no mesmo fluxo.
- Backstage:
1. Heurística/classificação de causa.
2. Runbook contextual por `reason_code`.
3. Tracking de visualização, ação e resolução.
- Valor gerado:
1. Menos tentativa e erro técnico.
2. Menor tempo de indisponibilidade.

### Etapa 5 - Prova de valor e evolução contínua
- Rotas: `/app/reports`, `/app/alerts/rules`
- Opções do usuário:
1. Ver valor recuperado no período.
2. Comparar evolução vs período anterior.
3. Aplicar sugestão de ajuste de regra.
4. Revisar oportunidades ainda não capturadas.
- Frontstage:
1. Narrativa de resultado financeiro.
2. Score de qualidade por regra.
3. Sugestões acionáveis com confirmação.
- Backstage:
1. Consolida ledger de valor estimado/realizado.
2. Mede ruído/falha por regra.
3. Registra trilha de alteração.
- Valor gerado:
1. Justifica renovação e expansão.
2. Reforça confiança no produto.

## Requisitos por rota (executáveis)

## `/app/dashboard`
### User stories
1. Como dono, quero abrir o app e entender em 30 segundos se minha rede está sob controle.
2. Como dono, quero ver uma narrativa clara do dia com próximo passo recomendado.
3. Como dono, quero enxergar metas e progresso com contexto de valor.

### Critérios de aceite
1. Resumo da rede carrega com status de lojas, alertas críticos e ações pendentes.
2. Copiloto mostra mensagem contextual (calmo, atenção, crítico) com CTA acionável.
3. Exibe card de conquista quando meta do período for atingida.

### Eventos
1. `copilot_daily_briefing_viewed`
2. `copilot_daily_briefing_cta_clicked`
3. `moment_of_pride_viewed`

## `/app/operations`
### User stories
1. Como dono/admin, quero delegar ação para gerente sem sair do app.
2. Como gestor, quero confirmar se a ação resolveu o problema e capturar feedback.

### Critérios de aceite
1. Toda ação prioritária oferece CTA de delegação com contexto.
2. Mensagem enviada inclui tom humano + objetivo operacional.
3. Fluxo de conclusão captura resultado (`resolveu`, `parcial`, `não resolveu`) e comentário curto.

### Eventos
1. `operation_action_delegated`
2. `operation_action_completed`
3. `operation_action_feedback_submitted`

## `/app/alerts` e `/app/alerts/history`
### User stories
1. Como store staff, quero encerrar alertas com desfechos claros para manter rastreabilidade.
2. Como admin, quero histórico confiável para auditar execução.

### Critérios de aceite
1. Encerramento com 3 desfechos padronizados.
2. Motivo obrigatório para `delegado` e `incidente_tecnico`.
3. Histórico reflete desfecho, ator e timestamp.

### Eventos (já alinhados ao produto)
1. `alert_resolution_started`
2. `alert_resolution_completed`
3. `alert_resolution_escalated`

## `/app/cameras` e `/app/edge-help`
### User stories
1. Como admin, quero diagnosticar falha da câmera por causa para corrigir sem retrabalho.
2. Como admin, quero validar correção na mesma jornada.

### Critérios de aceite
1. Câmera em falha exibe causa provável + recomendação.
2. Fluxo `diagnosticar -> corrigir -> validar` ocorre sem perda de contexto.
3. Runbook em Edge Help abre pré-contextualizado.

### Eventos (já alinhados ao produto)
1. `camera_diagnosis_viewed`
2. `camera_diagnosis_action_clicked`
3. `camera_diagnosis_resolved`

## `/app/alerts/rules`
### User stories
1. Como admin, quero avaliar qualidade de cada regra para reduzir ruído.
2. Como admin, quero aplicar ajuste recomendado com um clique.

### Critérios de aceite
1. Cada regra exibe score e nível (`alto`, `medio`, `baixo`).
2. Sugestão aparece quando limiares de ruído/falha são excedidos.
3. Aplicação de sugestão registra trilha.

### Eventos (já alinhados ao produto)
1. `alert_rule_quality_viewed`
2. `alert_rule_suggestion_shown`
3. `alert_rule_suggestion_applied`

## `/app/reports`
### User stories
1. Como dono, quero ver o ROI do período com linguagem clara.
2. Como dono, quero comparar com meu próprio histórico para medir evolução.

### Critérios de aceite
1. Relatório inclui valor recuperado, custo do plano e ROI.
2. Mostra comparação MoM e, quando possível, YoY.
3. Exibe oportunidades não capturadas (`dinheiro deixado na mesa`).

### Eventos
1. `money_flow_report_viewed`
2. `money_flow_roi_viewed`
3. `money_flow_opportunity_clicked`

## `/onboarding` e `/app/settings`
### User stories
1. Como dono, quero configurar meta e objetivo pessoal para manter motivação.
2. Como usuário, quero escolher tom de comunicação das notificações.

### Critérios de aceite
1. Onboarding captura objetivo de negócio (`meta`, `motivação`, `prioridade operacional`).
2. Configurações permitem tom `formal` ou `amigável`.
3. Notificações respeitam preferência.

### Eventos
1. `owner_goal_defined`
2. `notification_tone_updated`
3. `notification_preferences_saved`

## Money Flow e Ledger (contrato de valor)

## Objetivo
Materializar valor financeiro por ação, com trilha auditável e comunicação simples ao dono.

## Entidade recomendada: `value_ledger_entry`
Campos mínimos:
1. `entry_id`
2. `store_id`
3. `source_type` (`queue`, `staff_idle`, `stockout`, `conversion`, `other`)
4. `source_event_id`
5. `action_id`
6. `value_estimated_brl`
7. `value_realized_brl` (quando houver confirmação/integração)
8. `confidence_score`
9. `value_status` (`estimated`, `validated`, `official`)
10. `created_at`, `updated_at`

## Regras
1. Toda recomendação financeira deve ter `confidence_score`.
2. UI deve diferenciar claramente `estimado` vs `oficial`.
3. Sem ação executada, valor permanece como oportunidade.

## KPIs de sucesso (produto + negócio)

## North Star
`Valor Recuperado Mensal Validado por Loja Ativa`

## KPI tree
1. `% alertas com desfecho registrado`
2. `tempo médio até primeira ação (MTTA)`
3. `tempo médio até desfecho (MTTR)`
4. `taxa de resolução no primeiro ciclo`
5. `valor recuperado estimado (BRL)`
6. `valor recuperado validado (BRL)`
7. `ROI do cliente = valor recuperado / custo do plano`
8. `conversão trial -> pago`
9. `retenção de contas multi-loja`

## Fórmulas principais
1. `ROI_periodo = (Valor_Recuperado_Validado - Custo_Plano) / Custo_Plano`
2. `Taxa_Fechamento_Alerta = Alertas_com_Desfecho / Alertas_Totais`
3. `Taxa_Acao_Concluida = Acoes_Concluidas / Acoes_Delegadas`
4. `Capture_Rate = Valor_Recuperado_Validado / Valor_Oportunidade_Total`

## Priorização recomendada (próxima onda)
1. `P0` Ledger visível em dashboard/reports com badges de confiança.
2. `P0` Narrativa diária do Copiloto com CTA de 1 clique.
3. `P0` Feedback pós-conclusão em operations/alerts.
4. `P1` Ranking saudável entre lojas com opção anonimizada.
5. `P1` Preferência de tom de notificação e motivação no onboarding.
6. `P2` Camada de celebração compartilhável (selos e marcos da rede).

## Riscos e guardrails
1. Risco de gamificação excessiva em cenário crítico.
2. Risco de fadiga por alertas proativos.
3. Risco de promessa financeira sem lastro.
4. Risco de comparação injusta entre lojas.

Mitigações:
1. Proatividade com limite de frequência por usuário/loja.
2. Transparência de confiança em todo valor financeiro.
3. Comparativos sempre com contexto operacional.
4. A/B test de tom de copy para equilíbrio entre urgência e calma.

## Definição de pronto (DoD) desta tese
1. Cada rota crítica possui narrativa de valor humano + ação direta.
2. Fluxos críticos fecham ciclo `detecção -> ação -> desfecho -> valor`.
3. Ledger disponível para leitura por período e por loja.
4. Eventos de tracking habilitados e auditáveis.
5. Relatório de ROI simples e compreensível para o dono.
