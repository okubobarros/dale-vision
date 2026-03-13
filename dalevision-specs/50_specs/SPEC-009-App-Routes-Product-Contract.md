# SPEC-009 App Routes Product Contract

## Objetivo
Definir um contrato único de produto por rota para reduzir complexidade, eliminar redundância e manter foco em valor para o ICP multilojista.

## Princípio de produto
O app deve responder 4 perguntas do gestor:
1. Como minha rede está agora?
2. Onde devo agir primeiro?
3. Qual ação reduz risco ou aumenta resultado?
4. Qual evidência sustenta essa recomendação?

## Escopo de navegação principal
- `/app/dashboard`
- `/app/operations`
- `/app/operations/stores`
- `/app/operations/stores/:storeId`
- `/app/alerts` (tabs: feed, regras, histórico)
- `/app/reports`
- `/app/settings`

Rotas legadas/técnicas permanecem fora da navegação principal e com redirecionamento/contexto:
- `/app/cameras`, `/app/setup`, `/app/edge-help`, `/app/analytics`, `/app/report`

## Contrato por rota

### 1) `/app/dashboard`
Função:
- visão executiva resumida da rede e da loja selecionada.

Pergunta ICP:
- "Como está a operação e qual é meu maior risco/oportunidade agora?"

O que deve aparecer:
- resumo executivo da rede;
- recomendação principal do Copiloto;
- progresso de implantação/operação;
- status de confiança de métricas (`official | proxy | estimated`).

O que não deve dominar:
- detalhe técnico de câmera/edge.

Dados (leitura):
- `stores`, `organizations`, `subscriptions`
- `detection_events`
- `traffic_metrics`, `conversion_metrics`
- `camera_health_logs` (somente resumo)
- `copilot_dashboard_context_snapshots`, `copilot_operational_insights`

Dados (escrita):
- nenhum write operacional obrigatório.
- opcional: evento de analytics/jornada (view e CTA).

### 2) `/app/operations`
Função:
- central de execução da rede com foco em ação.

Pergunta ICP:
- "Onde agir agora, com qual prioridade e impacto?"

O que deve aparecer:
- ações prioritárias;
- eventos operacionais abertos;
- lojas prioritárias;
- bloco contextual do Copiloto.

Dados (leitura):
- `detection_events`, `alert_rules`, `notification_logs`
- `stores`, `cameras`, `camera_health_logs`
- `copilot_operational_insights`

Dados (escrita):
- resolver/ignorar evento (`detection_events.status`);
- registrar interação de ação priorizada (audit/journey).

### 3) `/app/operations/stores`
Função:
- lista operacional de lojas para priorização.

Pergunta ICP:
- "Qual loja está melhor/pior e por quê?"

Dados (leitura):
- `stores`, `detection_events`, `camera_health_logs`
- agregados de `traffic_metrics` e `conversion_metrics`

Dados (escrita):
- nenhum write obrigatório.

### 4) `/app/operations/stores/:storeId`
Função:
- cockpit da loja.

Pergunta ICP:
- "O que fazer nesta loja para melhorar operação hoje?"

Abas:
- `Overview` (principal)
- `Cameras` (secundária, sem UUID como protagonista)
- `Infrastructure` (secundária)

Dados (leitura):
- `stores`, `cameras`, `camera_health_logs`, `camera_roi_configs`
- `detection_events`, `traffic_metrics`, `conversion_metrics`
- `copilot_operational_insights`

Dados (escrita):
- ajustes de câmera/ROI (permissão adequada)
- atualização de status de evento local

### 5) `/app/alerts`
Função:
- módulo único de governança de alertas.

Tabs internas:
- `Feed`: eventos atuais
- `Rules`: regras e metas
- `History`: histórico de notificações e resolução

Pergunta ICP:
- "Quais eventos importam e como evitar repetição?"

Dados (leitura):
- `detection_events`, `alert_rules`, `notification_logs`

Dados (escrita):
- criar/editar regra (`alert_rules`)
- alterar status de evento (`detection_events`)

### 6) `/app/reports`
Função:
- relatórios executivos.

Regra de negócio:
- relatório de diagnóstico `72h` é **somente para trial ativo**.
- contas com plano ativo enxergam relatórios contínuos/operacionais (sem narrativa de trial expirado).

Dados (leitura):
- `copilot_reports_72h` (trial only)
- agregados operacionais (`traffic_metrics`, `conversion_metrics`, `detection_events`)

Dados (escrita):
- nenhum write obrigatório.

### 7) `/app/settings`
Função:
- governança de conta, acessos, integrações e parâmetros da organização.

Dados (leitura/escrita):
- `organizations`, `org_members`, `subscriptions`
- configurações de integração e perfil de operação.

## Contrato do Copiloto (estratégico, não decorativo)

## Papel no produto
- Copiloto é camada transversal de orientação.
- Não precisa ser full-screen para ser estratégico.
- Deve existir de forma contextual em `dashboard`, `operations` e `store view`.
- Tela dedicada pode existir depois, mas não é requisito para valor.

## Requisitos funcionais mínimos
- histórico persistido por usuário/org/loja:
  - `copilot_conversations`
  - `copilot_messages`
- contexto persistido:
  - `context_json` e `metadata_json` por mensagem
- evidência e rastreabilidade:
  - citações (`citations_json`) e link com insight/evento

## Perguntas que o Copiloto deve responder
- "Onde agir agora?"
- "Qual loja tem maior risco de perda?"
- "Qual ação recomendada e qual impacto esperado?"
- "O que mudou desde ontem?"

## Regras de resposta
- sem inventar conclusão sem evidência;
- indicar confiança e fonte;
- quando faltar base, responder "em consolidação" com próximo passo.

## Alerts Rules: padrão do app + custom por loja

## Princípio
- app entrega baseline padrão por segmento/perfil.
- cada loja pode customizar meta/threshold/canal/cooldown.

## Modelo recomendado (`alert_rules.threshold`)
- `target_value`: meta da loja
- `warn_value`: zona de atenção
- `critical_value`: zona crítica
- `window_minutes`: janela de avaliação
- `min_samples`: mínimo de amostras
- `direction`: `above_is_bad` ou `below_is_bad`

## Modo de configuração
- Manual:
  - usuário edita regra na aba `Rules`.
- Assistido por Copiloto:
  - Copiloto sugere baseline e ajuste por loja
  - usuário confirma/aprova antes de aplicar

## Política de dados por domínio (coleta, retenção, exclusão)

### Coletamos e armazenamos
- Operação:
  - `stores`, `cameras`, `camera_health_logs`, `camera_roi_configs`
- Eventos e alertas:
  - `detection_events`, `alert_rules`, `notification_logs`
- Métricas:
  - `traffic_metrics`, `conversion_metrics`, `vision_atomic_events`
- Copiloto:
  - `copilot_conversations`, `copilot_messages`, `copilot_operational_insights`, `copilot_reports_72h`, `copilot_dashboard_context_snapshots`
- Auditoria:
  - `audit_logs`

### Retenção sugerida
- `camera_health_logs`: 90 dias quente + agregado histórico.
- `detection_events`: 180 dias quente + arquivamento.
- `notification_logs`: 180 dias.
- `copilot_messages`: 365 dias (ou política contratual do cliente).
- `copilot_dashboard_context_snapshots`: 30-90 dias (snapshot operacional).
- `vision_atomic_events`: conforme custo e estratégia analítica (mínimo 90 dias recomendado).

### Exclusão/anonimização
- por solicitação do cliente ou política contratual:
  - anonimizar `copilot_messages.content` quando necessário;
  - remover conversas inativas fora da janela de retenção;
  - arquivar métricas agregadas e excluir bruto após prazo acordado.

## Revisão de tabelas vazias/baixa utilização (governança)

## Objetivo
- reduzir dívida de modelo e evitar superfície morta.

## Processo
1. classificar tabela em:
- ativa em produção
- ativa parcial
- inativa/candidata a sunset
2. mapear endpoint/serviço que lê/escreve cada tabela.
3. definir ação:
- manter
- consolidar
- descontinuar (com migração e backup).

## Candidatas a revisão imediata
- `camera_health` (ver sobreposição com `camera_health_logs`)
- tabelas com writes inexistentes no último ciclo de 30 dias
- tabelas sem endpoint consumindo em UI principal.

## Critérios de aceite (DoD)
- rota principal sem redundância funcional;
- linguagem orientada a decisão e ação;
- diagnóstico 72h restrito ao trial ativo;
- alert rules com baseline + custom por loja;
- Copiloto com histórico persistido e contexto auditável;
- matriz de dados por rota definida (leitura/escrita/retenção/exclusão).
