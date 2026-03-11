# Journey - SaaS Admin Control Tower

## Objetivo
Dar ao admin visão completa da operação SaaS: usuários, organizações, lojas, edge, câmeras, qualidade de dados e cobrança.

## Escopo do papel
- Perfil: `SaaS Admin` (interno Dale Vision, não apenas owner de uma org).
- Responsável por saúde da plataforma, governança e escala.

## Estado atual (já existe)
### Visão operacional por loja
- Dashboard por loja (`/app/dashboard`).
- Lista de lojas e status (`/app/stores`).
- Status edge por loja (heartbeat, reason, câmeras).
- Gestão de câmeras por loja (`/app/cameras`).
- ROI e auditoria operacional de visão (`/app/analytics`).
- Alertas, regras e logs de notificação (`/app/alerts`, `/app/alert-rules`, `/app/notification-logs`).

### Edge onboarding
- Wizard de setup de edge e geração de `.env`.
- Perfis: estabilização e backend-gerenciado.

### Billing/trial (parcial)
- Upgrade/trial guard no frontend (`/app/upgrade` + `SubscriptionGuard`).
- Regras de trial/câmeras/lojas no backend.

## Estado atual (gaps para SaaS admin)
1. Não existe tela única de "control tower" multi-org.
2. Não existe gestão de usuários global (listar, role, status, último login).
3. Não existe visão consolidada de assinaturas/planos por organização.
4. Não existe timeline unificada de incidentes da plataforma.
5. Não existe score global de qualidade de dados por loja.

## Jornada recomendada do SaaS Admin
### Abertura do dia (10 min)
1. Ver saúde da rede: lojas online/offline, edge stale, câmeras stale.
2. Ver incidentes novos desde última sessão.
3. Ver lojas com risco de dados (drift/calibração pendente).

### Rotina operacional (contínua)
1. Priorizar incidentes críticos (loja sem heartbeat, API timeout, falha de sync).
2. Acompanhar recuperação e MTTR.
3. Validar ações de suporte em trilha auditável.

### Fechamento do dia (10 min)
1. Conferir backlog de incidentes abertos.
2. Revisar saúde de trial/assinatura (bloqueios indevidos).
3. Registrar decisão GO/NO-GO para rollout.

## Painel ideal (MVP SaaS Admin)
### Bloco A - Plataforma
- API availability (p95 timeout/error rate)
- Latência de endpoints críticos (`/stores`, `/edge-status`, `/dashboard`)
- Jobs pendentes/falhos

### Bloco B - Rede de lojas
- total lojas, online, degradadas, offline
- lojas sem heartbeat > X min
- lojas com camera_health stale

### Bloco C - Edge fleet
- agentes ativos
- boot-to-first-heartbeat p95
- falhas de autostart/remoção

### Bloco D - Dados e confiança
- cobertura operacional por loja
- métricas com status `official|proxy|estimated`
- lojas em `recalibrar`

### Bloco E - Receita e risco
- orgs trialing, active, past_due, blocked
- trials expirando em 7 dias
- orgs bloqueadas por billing

### Bloco F - Usuários e segurança
- novos usuários 24h
- usuários sem membership
- tentativas de acesso negado / anomalias

## Mapa de implementação (sem depender da loja física)
### Fase 1 (imediata)
1. Criar página `/app/admin` (feature flag para staff/superuser).
2. Entregar cards agregados com dados já existentes (stores + edge-status + notification logs + trial status).
3. Entregar tabela de incidentes operacionais.

### Fase 2
1. Endpoint backend agregado `GET /api/v1/admin/control-tower/summary`.
2. Endpoint `GET /api/v1/admin/control-tower/incidents`.
3. Endpoint `GET /api/v1/admin/control-tower/orgs-billing`.

### Fase 3
1. Gestão de usuários e memberships (listar/filtrar/reconciliar).
2. Ações administrativas seguras (bloquear/desbloquear org, reprocessar status, reenfileirar jobs).
3. Auditoria completa de ações de admin.

## KPIs de sucesso do SaaS Admin
- MTTR incidentes críticos <= 30 min.
- % lojas com heartbeat recente >= 98%.
- % lojas com cobertura mínima para comparativo >= 90%.
- % bloqueios indevidos por trial/billing = 0.

## Definição de pronto (MVP Control Tower)
- Admin interno consegue responder, em uma tela:
1. Quem está offline agora?
2. Qual o motivo raiz mais frequente hoje?
3. Quais lojas não estão aptas para decisão executiva?
4. Quais contas estão em risco comercial (trial/past_due)?
