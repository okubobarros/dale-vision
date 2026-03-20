# Matriz Unificada de Refino de Experiencia (Journeys)

Data: `2026-03-20`
Escopo: consolidacao de gaps de UX e produto das jornadas `Owner`, `Admin`, `Store Staff`, `SaaS Admin` e `Post-Subscription`.
Objetivo: transformar as jornadas em backlog executavel de melhoria de experiencia por etapa/rota.

## Criterio de priorizacao
- Impacto: efeito em ativacao, confianca operacional, retencao e expansao.
- Esforco: complexidade de implementacao (UX, frontend, backend, dados).
- Prioridade:
  - `P0`: critico para ativacao/valor imediato.
  - `P1`: relevante para escala e consistencia.
  - `P2`: melhoria incremental/otimizacao.

## Matriz de gaps (cross-journey)

| ID | Jornada(s) | Etapa | Rota(s) | Gap atual observado | Oportunidade de melhoria | Impacto | Esforco | Prioridade |
|---|---|---|---|---|---|---|---|---|
| UX-01 | Owner | Cadastro/ativacao | `/activate`, `/auth/callback`, `/login` | Fluxo de confirmacao de email ainda gera incerteza (erro/timeout/reenvio espalhados) | Unificar estado de ativacao com progress indicator e fallback guidado (reenviar, trocar email, voltar ao login com contexto) | Alto | Medio | P0 |
| UX-02 | Owner | Pos-login routing | `/login` -> `/onboarding` ou `/app/dashboard?openEdgeSetup=1` | Usuario nem sempre entende por que caiu em determinada rota | Exibir "proximo passo recomendado" na primeira tela apos login com motivo (sem loja, sem edge, pronto para operar) | Alto | Baixo | P0 |
| UX-03 | Owner/Admin | Edge setup | `/app/dashboard?openEdgeSetup=1`, `/app/edge-help` | Alta carga cognitiva no setup e recuperacao de erro | Checklist guiado por estado (token ok, heartbeat ok, camera ok, first signal ok) + CTA de diagnostico contextual | Alto | Medio | P0 |
| UX-04 | Owner/Admin | Cameras e saude | `/app/cameras` | Falha tecnica (RTSP/credencial) sem trilha clara de proxima acao | Padronizar "detectar -> diagnosticar -> corrigir -> validar" com mensagens orientadas por causa | Alto | Medio | P0 |
| UX-05 | Owner/Admin/Staff | Acao sobre alertas | `/app/alerts`, `/app/alerts/rules`, `/app/alerts/history` | Risco de fadiga por ruido e acao manual repetitiva | Introduzir "qualidade do alerta" por regra + sugestao automatica de ajuste (threshold/cooldown) | Alto | Medio | P1 |
| UX-06 | Store Staff | Confirmacao de resultado | `/app/alerts` | Staff pode nao saber qual desfecho registrar e quando escalar | Fluxo de encerramento com 3 opcoes claras: resolvido localmente, delegar, incidente tecnico | Medio | Baixo | P0 |
| UX-07 | Store Staff/Admin | Escalada tecnica | `/app/operations/stores/:storeId`, `/app/edge-help` | Escalada ainda depende de navegacao manual entre telas | Botao "escalar incidente" com contexto pre-preenchido (store/camera/evento) | Alto | Baixo | P0 |
| UX-08 | Admin | Diagnostico por loja | `/app/operations/stores/:storeId`, `/app/cameras`, `/app/alerts?store_id=` | Contexto se perde ao trocar modulos | Deep links persistindo `store_id` e breadcrumb operacional entre operacoes/cameras/alertas | Medio | Baixo | P1 |
| UX-09 | Admin/SaaS Admin | Calibracao e evidencias | `/app/calibration`, `/app/admin` | Validacao antes/depois pode ficar inconsistente entre times | Template unico de evidencia com campos obrigatorios (baseline, after, delta, aprovado/reprovado) | Alto | Medio | P1 |
| UX-10 | SaaS Admin | Triagem de incidentes | `/app/admin` | Falta explicitar severidade/urgencia padronizada fim-a-fim | Matriz de severidade unica (S1-S4) com SLA e proxima acao recomendada | Alto | Medio | P1 |
| UX-11 | SaaS Admin | Reconciliacao funil/dados | `/app/admin` | Gap tecnico compreensivel ao time interno, opaco para operacao | Exibir diagnostico em linguagem operacional + impacto no negocio (risco de decisao) | Alto | Medio | P1 |
| UX-12 | Owner/Post-subscription | Confirmacao de valor pago | `/app/reports`, `/app/analytics` | Relatorio pode nao conectar claramente acao executada ao ganho financeiro | Secao "Acoes que geraram resultado" (alerta -> acao -> melhoria -> estimativa R$) | Alto | Medio | P0 |
| UX-13 | Owner | Trial -> pago | `/app/report` (redirect), `/app/reports`, `/app/upgrade` | Momento de upgrade pode parecer comercial, nao orientado a prova | Upgrade com narrativa de impacto por loja e comparativo pre vs pos onboarding | Alto | Baixo | P0 |
| UX-14 | Owner/Admin | Expansao multi-loja | `/app/operations/stores`, `/app/dashboard` | Replicacao de boas praticas entre lojas ainda manual | "Playbook replicar para outra loja" (regras, checklist edge/cameras, metas) | Medio | Alto | P2 |
| UX-15 | Cross-journey | Permissoes por papel | `/app/*` | Falta tornar visivel o que cada papel pode ou nao pode fazer em cada etapa | Mensagens de permissao orientadas por acao (o que fazer agora / para quem escalar) | Alto | Medio | P1 |

## Backlog recomendado por sprint

## Sprint 1 (P0 - ativacao e acao rapida)
1. UX-01 Unificacao de ativacao/callback.
2. UX-02 Explicacao de roteamento pos-login.
3. UX-03 Checklist guiado do edge setup.
4. UX-07 Escalada tecnica com contexto pre-preenchido.
5. UX-13 Upgrade orientado a prova de impacto.

## Sprint 2 (P0/P1 - operacao com menos ruido)
1. UX-04 Fluxo padrao de diagnostico de cameras.
2. UX-06 Encerramento guiado de alerta para staff.
3. UX-05 Qualidade de alerta + sugestao de ajuste de regra.
4. UX-08 Persistencia de contexto entre modulos por `store_id`.

## Sprint 3 (P1 - escala e governanca)
1. UX-09 Template unico de evidencia de calibracao.
2. UX-10 Severidade unica S1-S4 com SLA.
3. UX-11 Traducao de gaps de funil para impacto operacional.
4. UX-15 UX de permissao por papel orientada a proxima acao.

## Sprint 4 (P2 - expansao)
1. UX-14 Playbook de replicacao multi-loja.

## KPIs para validar melhoria de experiencia
- Ativacao:
  - tempo ate primeira loja ativa
  - tempo ate first signal
  - taxa de conclusao do onboarding
- Operacao:
  - MTTA/MTTR de alertas criticos
  - `%` de alertas com desfecho registrado
  - taxa de alertas ruidosos por regra
- Valor e negocio:
  - conversao trial -> pago
  - uso de relatorios semanais/mensais
  - `%` de alertas que viram acao + melhoria mensuravel
- Escala:
  - `%` lojas com heartbeat no SLA
  - `%` lojas com cobertura minima confiavel

## Dependencias para execucao
- Definir dono por trilha: Produto, Design, Frontend, Backend, Dados/CV, CS.
- Garantir instrumentacao de eventos de jornada para medicao de antes/depois.
- Revisar politicas de RBAC para mensagens de permissao por papel.
- Alinhar textos e evidencias com a tese de valor oficial dos documentos de produto.

## Decisoes recomendadas (imediatas)
1. Congelar nomenclatura unica de etapas da jornada em todas as telas e docs.
2. Tratar edge setup + first signal como unico milestone de ativacao.
3. Adotar "alerta bom" como metrica de produto (nao apenas volume de alerta).
4. Tornar prova de impacto o centro do fluxo de upgrade e de renovacao.
