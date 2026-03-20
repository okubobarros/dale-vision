# Sprint 2 - Tickets de Execucao (Jira-ready)

Data: `2026-03-20`
Base: `Sprint_2_PRD_UX_2026-03-20.md`
Escopo: `UX-04`, `UX-06`, `UX-05`, `UX-08`

## Convencoes
- Story Points (SP): 1, 2, 3, 5, 8
- Prioridade: `P0/P1`
- Status inicial sugerido: `TODO`
- Tipos: `Design`, `Frontend`, `Backend`, `Data`, `QA`

## Epic sugerida
- `EPIC-S2-UX-OPERATIONS-CONSISTENCY`: Refino de operacao com menos ruido, fechamento guiado e contexto persistente.

## UX-04 - Diagnostico de Cameras por Causa

### TICKET S2-DES-01
- Tipo: `Design`
- Titulo: `Definir fluxo de diagnostico de camera orientado por causa`
- Descricao:
  - Projetar a jornada `diagnosticar -> corrigir -> validar` com estados por causa (`credencial`, `conectividade`, `stream`, `heartbeat`).
  - Definir copy de acao recomendada e estado de sucesso.
- Rotas: `/app/cameras`, `/app/edge-help`, `/app/operations/stores/:storeId`
- Criterios de aceite:
  1. Especificacao cobre 100% das causas mapeadas no PRD.
  2. CTA de proxima acao definido por causa.
  3. Handoff com componentes e regras de estado para FE.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET S2-BE-01
- Tipo: `Backend`
- Titulo: `Classificar falhas de camera e expor causa primaria`
- Descricao:
  - Ajustar endpoint/servico de cameras para retornar causa primaria e acao recomendada.
  - Garantir log estruturado para suporte tecnico.
- Rotas impactadas: consumo em `/app/cameras`
- Criterios de aceite:
  1. Cada camera em falha retorna `failure_cause` e `recommended_action`.
  2. Logs tecnicos incluem contexto minimo (`store_id`, `camera_id`, `cause`).
  3. Compatibilidade com clientes atuais sem regressao.
- Dependencias: nenhuma
- Estimativa: `5 SP`

### TICKET S2-FE-01
- Tipo: `Frontend`
- Titulo: `Implementar fluxo guiado de diagnostico/correcao/validacao de camera`
- Descricao:
  - Renderizar causa da falha e CTAs contextuais no modulo de cameras.
  - Permitir validacao do resultado apos acao.
- Rotas: `/app/cameras`, `/app/edge-help`
- Criterios de aceite:
  1. Camera em falha mostra causa primaria de forma destacada.
  2. Usuario consegue executar o fluxo completo sem perder contexto.
  3. Resultado final fica visivel no status da camera.
- Dependencias: `S2-DES-01`, `S2-BE-01`
- Estimativa: `5 SP`

### TICKET S2-DATA-01
- Tipo: `Data`
- Titulo: `Instrumentar funil de diagnostico de camera`
- Descricao:
  - Eventos: `camera_diagnosis_viewed`, `camera_diagnosis_action_clicked`, `camera_diagnosis_resolved`.
- Criterios de aceite:
  1. Eventos com `store_id`, `camera_id`, `failure_cause`.
  2. Funil mensuravel em ambiente de homologacao.
- Dependencias: `S2-FE-01`
- Estimativa: `2 SP`

## UX-06 - Encerramento Guiado de Alertas (Store Staff)

### TICKET S2-DES-02
- Tipo: `Design`
- Titulo: `Projetar modal/fluxo de encerramento de alerta com 3 desfechos`
- Descricao:
  - Definir UX para `resolvido localmente`, `delegado`, `incidente tecnico`.
  - Definir campo de motivo obrigatorio para `delegado` e `incidente tecnico`.
- Rotas: `/app/alerts`, `/app/alerts/history`
- Criterios de aceite:
  1. Fluxo fechavel em ate 2 interacoes.
  2. Variantes de desfecho com copy e validações claras.
- Dependencias: nenhuma
- Estimativa: `2 SP`

### TICKET S2-BE-02
- Tipo: `Backend`
- Titulo: `Persistir desfecho padronizado de alertas e motivo`
- Descricao:
  - Ajustar endpoint de update de alerta para aceitar/validar desfechos padrao.
  - Salvar motivo quando requerido.
- Rotas impactadas: consumo em `/app/alerts`
- Criterios de aceite:
  1. Apenas 3 desfechos permitidos no endpoint.
  2. Motivo obrigatorio para casos de escalada/delegacao.
  3. Historico reflete ator, desfecho e timestamp.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET S2-FE-02
- Tipo: `Frontend`
- Titulo: `Implementar encerramento guiado de alertas para Store Staff`
- Descricao:
  - Exibir fluxo de encerramento com desfechos padrao e validacao de motivo.
  - Sincronizar atualizacao no historico.
- Rotas: `/app/alerts`, `/app/alerts/history`
- Criterios de aceite:
  1. Todo alerta fechado exige desfecho valido.
  2. Campo de motivo aparece/valida quando necessario.
  3. Historico atualiza sem recarregamento completo.
- Dependencias: `S2-DES-02`, `S2-BE-02`
- Estimativa: `5 SP`

### TICKET S2-DATA-02
- Tipo: `Data`
- Titulo: `Instrumentar eventos de encerramento de alertas`
- Descricao:
  - Eventos: `alert_resolution_started`, `alert_resolution_completed`, `alert_resolution_escalated`.
- Criterios de aceite:
  1. Eventos com `resolution_type`, `store_id`, `alert_id`.
  2. Conversao por tipo de desfecho analisavel.
- Dependencias: `S2-FE-02`
- Estimativa: `2 SP`

## UX-05 - Qualidade de Alerta + Sugestao de Regra

### TICKET S2-DES-03
- Tipo: `Design`
- Titulo: `Desenhar indicador de qualidade de regra e sugestao de ajuste`
- Descricao:
  - Definir visualizacao de score (baixo/medio/alto) e recomendacao acionavel.
  - Definir confirmacao de aplicacao de sugestao.
- Rotas: `/app/alerts/rules`, apoio `/app/alerts/history`
- Criterios de aceite:
  1. Componente de qualidade e sugestao aprovado.
  2. Regras de exibicao da sugestao documentadas.
- Dependencias: nenhuma
- Estimativa: `3 SP`

### TICKET S2-BE-03
- Tipo: `Backend`
- Titulo: `Calcular score de qualidade de alerta por regra`
- Descricao:
  - Expor score de qualidade e recomendacao de ajuste baseada em historico.
  - Registrar auditoria quando ajuste recomendado for aplicado.
- Rotas impactadas: consumo em `/app/alerts/rules`
- Criterios de aceite:
  1. Endpoint retorna score e recomendacao por regra.
  2. Threshold de ruido configuravel.
  3. Trilhas de alteracao persistidas.
- Dependencias: nenhuma
- Estimativa: `5 SP`

### TICKET S2-FE-03
- Tipo: `Frontend`
- Titulo: `Implementar qualidade de alerta e aplicacao de sugestao de regra`
- Descricao:
  - Exibir score por regra e CTA para aplicar sugestao.
  - Confirmar aplicacao e refletir estado atualizado.
- Rotas: `/app/alerts/rules`, `/app/alerts/history`
- Criterios de aceite:
  1. Score visivel em 100% das regras listadas.
  2. CTA de sugestao aparece apenas quando aplicavel.
  3. Aplicacao de ajuste atualiza UI e historico.
- Dependencias: `S2-DES-03`, `S2-BE-03`
- Estimativa: `5 SP`

### TICKET S2-DATA-03
- Tipo: `Data`
- Titulo: `Instrumentar eventos de qualidade de regra`
- Descricao:
  - Eventos: `alert_rule_quality_viewed`, `alert_rule_suggestion_shown`, `alert_rule_suggestion_applied`.
- Criterios de aceite:
  1. Eventos com `rule_id`, `quality_level`, `suggestion_type`.
  2. Medicao de adocao da sugestao disponivel.
- Dependencias: `S2-FE-03`
- Estimativa: `2 SP`

## UX-08 - Persistencia de Contexto por store_id

### TICKET S2-DES-04
- Tipo: `Design`
- Titulo: `Definir padrao de breadcrumb e contexto de loja cross-modulo`
- Descricao:
  - Definir breadcrumb operacional e regra de exibicao de loja atual.
  - Definir estado de fallback sem `store_id`.
- Rotas: `/app/operations/stores/:storeId`, `/app/cameras`, `/app/alerts`
- Criterios de aceite:
  1. Padrão visual e comportamental aprovado.
  2. Estados com e sem contexto definidos.
- Dependencias: nenhuma
- Estimativa: `2 SP`

### TICKET S2-FE-04
- Tipo: `Frontend`
- Titulo: `Persistir store_id em deep links entre operacoes, cameras e alertas`
- Descricao:
  - Garantir propagacao de `store_id` na navegacao principal entre modulos.
  - Implementar breadcrumb operacional e fallback amigavel.
- Rotas: `/app/operations/stores/:storeId`, `/app/cameras?store_id=...`, `/app/alerts?store_id=...`
- Criterios de aceite:
  1. Links principais preservam contexto em 100% dos casos previstos.
  2. Breadcrumb mostra loja atual e modulo.
  3. Sem `store_id`, produto orienta selecao de loja sem erro.
- Dependencias: `S2-DES-04`
- Estimativa: `3 SP`

### TICKET S2-DATA-04
- Tipo: `Data`
- Titulo: `Instrumentar eventos de persistencia de contexto de loja`
- Descricao:
  - Eventos: `store_context_link_clicked`, `store_context_preserved`, `store_context_missing_fallback`.
- Criterios de aceite:
  1. Eventos com `from_route`, `to_route`, `store_id_present`.
  2. Taxa de perda de contexto mensuravel.
- Dependencias: `S2-FE-04`
- Estimativa: `1 SP`

### TICKET S2-QA-01
- Tipo: `QA`
- Titulo: `Validar regressao do fluxo cross-modulo e encerramento de alertas`
- Descricao:
  - Cobrir navegacao com `store_id`, encerramento guiado e regras com sugestao.
- Criterios de aceite:
  1. Suite cobre cenarios criticos dos 4 itens do sprint.
  2. Nenhum bloqueio P0/P1 aberto no go-live.
- Dependencias: `S2-FE-01`, `S2-FE-02`, `S2-FE-03`, `S2-FE-04`
- Estimativa: `3 SP`

## Resumo de capacidade estimada
- Design: `10 SP`
- Frontend: `18 SP`
- Backend: `13 SP`
- Data: `7 SP`
- QA: `3 SP`
- Total Sprint 2: `51 SP`

## Sequencia recomendada de execucao
1. Design (`S2-DES-*`) em paralelo.
2. Backend habilitador (`S2-BE-01`, `S2-BE-02`, `S2-BE-03`).
3. Frontend por ordem de dependencia: cameras -> alertas -> regras -> contexto cross-modulo.
4. Tracking acoplado ao fechamento de cada fluxo.
5. QA integrada + regressao final.

## Riscos e mitigacao
- Risco: score de qualidade gerar falso sinal no inicio.
  - Mitigacao: fase inicial com thresholds conservadores e calibracao semanal.
- Risco: perda de contexto em links secundarios.
  - Mitigacao: checklist de rotas criticas e testes automatizados de navegacao.
- Risco: aumento de friccao no fechamento de alerta.
  - Mitigacao: limitar fluxo a 2 interacoes e validar com Store Staff antes de go-live.
