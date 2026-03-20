# Sprint 1 PRD - Refino de Experiencia (P0)

Data: `2026-03-20`
Origem: `Journeys_UX_Refinement_Matrix_2026-03-20.md`
Objetivo do sprint: reduzir friccao de ativacao e acelerar tempo ate primeira acao com valor.

Itens do sprint: `UX-01`, `UX-02`, `UX-03`, `UX-07`, `UX-13`.

## Escopo e entregaveis
1. Ativacao/callback unificados com fallback orientado.
2. Bloco de "proximo passo recomendado" no primeiro acesso pos-login.
3. Checklist guiado de edge setup por estado.
4. Escalada tecnica com contexto pre-preenchido.
5. Fluxo de upgrade orientado a prova de impacto.

## Item UX-01 - Ativacao e callback

## Problema
Usuario perde contexto entre confirmacao de email, callback, erro e reenvio.

## Rotas
- `/activate`
- `/auth/callback`
- `/login`

## User story
Como `Owner`, quero concluir ativacao com instrucoes claras para nao abandonar no primeiro acesso.

## Requisitos funcionais
1. Exibir status de progresso no callback: `validando`, `sucesso`, `acao necessaria`.
2. Em erro, mostrar 3 opcoes explicitas: `tentar novamente`, `reenviar email`, `voltar ao login`.
3. Preservar contexto de origem para retorno ao fluxo correto apos sucesso.

## Criterios de aceite
1. Dado erro de callback, quando usuario clicar em `tentar novamente`, entao a validacao reinicia sem recarregar para home.
2. Dado email nao confirmado, quando usuario clicar em `reenviar`, entao recebe confirmacao visual de envio.
3. Dado callback concluido, quando sessao valida, entao usuario navega para rota resolvida por `resolvePostLoginRoute`.

## Tracking
- `activation_callback_started`
- `activation_callback_failed`
- `activation_resend_clicked`
- `activation_callback_completed`

## Item UX-02 - Proximo passo recomendado pos-login

## Problema
Usuario nao entende por que caiu em onboarding, dashboard com edge setup, ou admin.

## Rotas
- `/login`
- `/onboarding`
- `/app/dashboard?openEdgeSetup=1`
- `/app/admin`

## User story
Como `Owner/Admin`, quero entender o proximo passo recomendado para iniciar rapido.

## Requisitos funcionais
1. Exibir banner/box no primeiro carregamento explicando o "por que desta rota".
2. Mostrar CTA unico de continuidade (ex.: `Continuar onboarding`, `Conectar edge`, `Abrir control tower`).
3. Permitir dispensar a mensagem sem bloquear uso.

## Criterios de aceite
1. Dado primeiro acesso pos-login, mensagem aparece apenas uma vez por sessao.
2. Dado clique no CTA, usuario navega para etapa seguinte sem perda de contexto.
3. Dado dispensa, produto continua navegavel sem modal bloqueante.

## Tracking
- `post_login_explainer_shown`
- `post_login_explainer_cta_clicked`
- `post_login_explainer_dismissed`

## Item UX-03 - Checklist de edge setup por estado

## Problema
Setup de edge ainda depende de leitura linear e tentativa/erro.

## Rotas
- `/app/dashboard?openEdgeSetup=1`
- `/app/edge-help`
- `/app/cameras`

## User story
Como `Owner/Admin`, quero ver o estado do setup em checklist para chegar ao first signal com menos erro.

## Requisitos funcionais
1. Exibir checklist com estados: `token`, `agent online`, `heartbeat`, `camera health`, `first metrics`.
2. Cada item deve ter acao recomendada quando pendente/erro.
3. Linkar diretamente para rota de correcao (`edge-help`, `cameras`, `operations`).

## Criterios de aceite
1. Dado item pendente, CTA leva para pagina correta com `store_id` aplicado.
2. Dado todos itens ok, checklist marca milestone de ativacao concluida.
3. Dado regressao (ex.: heartbeat stale), estado volta para atencao automaticamente.

## Tracking
- `edge_checklist_viewed`
- `edge_checklist_step_clicked`
- `edge_first_signal_achieved`

## Item UX-07 - Escalada tecnica com contexto

## Problema
Escalada manual entre telas aumenta MTTR e perda de contexto.

## Rotas
- `/app/operations/stores/:storeId`
- `/app/alerts`
- `/app/edge-help?store_id=...`

## User story
Como `Store Staff/Admin`, quero escalar incidente tecnico com contexto pronto para acelerar resolucao.

## Requisitos funcionais
1. Botao `Escalar incidente tecnico` em alertas e detalhe da loja.
2. Navegacao para `/app/edge-help` carregando `store_id`, `camera_id` (quando houver), `event_id`.
3. Registrar historico da escalada no contexto do alerta/incidente.

## Criterios de aceite
1. Dado alerta tecnico, clique em escalar abre edge-help com contexto preenchido.
2. Dado contexto incompleto, sistema preenche ao menos `store_id` e orienta proximos passos.
3. Dado escalada criada, historico fica visivel para auditoria operacional.

## Tracking
- `incident_escalate_clicked`
- `incident_escalate_opened_edge_help`
- `incident_escalate_completed`

## Item UX-13 - Upgrade orientado a prova

## Problema
Upgrade pode parecer CTA comercial sem ligar claramente ao valor comprovado.

## Rotas
- `/app/reports`
- `/app/upgrade`

## User story
Como `Owner`, quero decidir upgrade com base em provas de impacto por loja.

## Requisitos funcionais
1. Exibir resumo `antes vs depois` com metricas de operacao e estimativa financeira.
2. Apresentar "acoes que geraram resultado" em linguagem executiva.
3. CTA de upgrade contextual (por impacto e risco de manter bloqueio).

## Criterios de aceite
1. Dado usuario com dados suficientes, tela de upgrade exibe ao menos 3 indicadores de impacto.
2. Dado usuario sem dados suficientes, exibir plano de acao para gerar prova (nao apenas CTA comercial).
3. Dado clique em upgrade, evento de tracking inclui origem da prova mostrada.

## Tracking
- `upgrade_proof_viewed`
- `upgrade_proof_cta_clicked`
- `upgrade_proof_insufficient_data_shown`

## Fora do escopo deste sprint
- Matriz de severidade S1-S4 (Sprint 3).
- Template unico de evidencia de calibracao (Sprint 3).
- Playbook de replicacao multi-loja (Sprint 4).

## Definicao de pronto (Sprint 1)
1. Features entregues nas rotas alvo com UX copy revisada.
2. Tracking publicado e validado em ambiente de homologacao.
3. Documentacao de fluxo atualizada nas journeys.
4. Medicao de baseline e comparativo de 2 semanas para ativacao e MTTA.
