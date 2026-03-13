# Supabase Table Usage Audit (2026-03-13)

## Contexto
- Objetivo: mapear tabelas usadas vs pouco/sem uso no código atual.
- Método aplicado:
  - Inventário de tabelas via Django models (`python manage.py shell`).
  - Varredura de referências textuais em `apps/`, `backend/`, `frontend/` e `edge-agent/`.
- Observação: a skill `supabase-automation` requer MCP/Rube ativo para varredura online no projeto Supabase. Neste ambiente, o fallback foi auditoria estática do repositório.

## Fonte de verdade para planos
- A fonte correta para plano da organização deve ser:
  - `subscriptions.plan_code` (trial/start/pro/growth/enterprise)
  - `subscriptions.status` (trialing/active/past_due/canceled/incomplete/blocked)
- `stores.plan` deve ser tratado como legado/compatibilidade de leitura, não como fonte principal de billing.

## Tabelas claramente usadas (alto uso no código)
- `stores`
- `cameras`
- `camera_health`
- `traffic_metrics`
- `conversion_metrics`
- `organizations`
- `subscriptions`
- `auth_user`
- `onboarding_progress`
- `journey_events`
- `event_receipts`
- `vision_atomic_events`
- `employees`

## Tabelas usadas (uso funcional, menor volume de referência)
- `alert_rules`
- `detection_events`
- `notification_logs`
- `event_media`
- `camera_health_logs`
- `camera_roi_configs`
- `camera_snapshots`
- `copilot_conversations`
- `copilot_messages`
- `copilot_operational_insights`
- `copilot_reports_72h`
- `copilot_dashboard_context_snapshots`
- `org_members`
- `store_zones`
- `store_calibration_runs`
- `support_access_requests`
- `support_access_grants`
- `time_clock_entries`
- `billing_customers`
- `audit_logs`

## Tabelas com baixa/nenhuma referência no código (candidatas a revisão)
- `performance_rankings` (sem referência direta detectada)
- `sales_metrics` (sem referência direta detectada)
- `auth_group`
- `auth_group_permissions`
- `auth_permission`
- `auth_user_groups`
- `auth_user_user_permissions`
- `django_admin_log`
- `django_content_type`
- `django_migrations`
- `django_session`
- `edge_edgeeventreceipt`
- `edge_edgetoken`

## Cruzamento com schema informado (contexto Supabase)
### Divergências relevantes
- `store_managers` aparece no código Django como tabela ativa, mas não apareceu no schema anexado.
- `event_receipts` aparece no schema anexado e no código (domínio de eventos/jornada), porém não está no inventário padrão de models Django carregados nesta instância.
- Tabelas padrão Django (`auth_*`, `django_*`) existem no schema e são estruturais para auth/admin, mas não representam valor de produto do ICP.

### Tabelas do schema com pouca ou nenhuma conexão funcional de produto
- `performance_rankings` (sem leitura/escrita de runtime no app atual)
- `sales_metrics` (sem pipeline ativo consumindo para decisões no dashboard)
- `auth_group`, `auth_group_permissions`, `auth_permission`, `auth_user_groups`, `auth_user_user_permissions` (infra de permissões Django)
- `django_admin_log`, `django_content_type`, `django_migrations`, `django_session` (infra framework)
- `edge_edgeeventreceipt` (legado de recebimento; fluxo atual usa `event_receipts` + `vision_atomic_events`)

## Tabela -> Jornada (quando entra)
### 1) Aquisição / onboarding inicial
- `demo_leads`: captura de leads/demo.
- `journey_events`: eventos de jornada comercial/onboarding.
- `organizations`: criação da empresa/rede.
- `auth_user`, `user_id_map`, `org_members`: identidade e vínculo do usuário à org.
- `onboarding_progress`: progresso de ativação.

### 2) Trial (72h) e ativação da loja
- `stores`: estado da loja, trial e dados operacionais básicos.
- `subscriptions`: estado comercial (trialing/active) e plano.
- `edge_edgetoken` e/ou `event_receipts`: autenticação e recebimento de eventos edge.
- `cameras`, `camera_health`, `camera_health_logs`, `camera_snapshots`, `camera_roi_configs`: conexão e saúde de câmeras.
- `store_zones`: contexto operacional por zona.

### 3) Operação diária (dashboard/operations/alerts)
- `vision_atomic_events`: eventos atômicos de CV (base operacional).
- `traffic_metrics`, `conversion_metrics`: projeções de métricas para telas e análises.
- `detection_events`: eventos operacionais acionáveis.
- `alert_rules`: regras configuráveis por loja/zona.
- `notification_logs`: trilha de envios (dashboard/email/whatsapp).
- `event_media`: evidências vinculadas ao evento.

### 4) Copiloto e inteligência operacional
- `copilot_dashboard_context_snapshots`: snapshot de contexto da tela/rede.
- `copilot_operational_insights`: insights estruturados.
- `copilot_reports_72h`: relatório do trial.
- `copilot_conversations`, `copilot_messages`: histórico de conversa e contexto.

### 5) Suporte e governança
- `support_access_requests`, `support_access_grants`: acesso assistido temporário.
- `audit_logs`: trilha de ações sensíveis/paywall/bloqueios.
- `billing_customers`: vínculo com Stripe (pronto para billing futuro).
- `store_calibration_runs`: calibração validada (admin/suporte/ops).

## Sem conexão (ou conexão fraca) por momento da jornada
- Não entram na jornada do ICP hoje: `performance_rankings`, `sales_metrics`.
- Entram só como infraestrutura técnica (não UX de produto): `auth_*`, `django_*`.
- Consolidação definida: `event_receipts` é o recibo canônico; `edge_edgeeventreceipt` virou legado de compatibilidade.
- Script de finalização criado: `python manage.py finalize_event_receipts_canonical [--deactivate-legacy-table]`.

## Ação recomendada
1. Classificar as tabelas em:
- `core_prod` (essenciais)
- `support_prod` (suporte)
- `legacy_or_unused` (revisar/remover)
2. Criar política de ownership por domínio:
- Billing/planos: `subscriptions`, `billing_customers`
- Operação: `stores`, `cameras`, métricas e eventos
- Copiloto: tabelas `copilot_*`
3. Planejar limpeza controlada:
- Primeiro congelar escrita em tabelas candidatas.
- Depois validar 30 dias sem leitura/escrita real.
- Só então arquivar/remover.

## Execução de desativação (receipts legados)
1. Rodar backfill + dedupe:
- `python manage.py finalize_event_receipts_canonical`
2. Rodar desativação segura da tabela legada:
- `python manage.py finalize_event_receipts_canonical --deactivate-legacy-table`
3. Resultado esperado:
- tabela física renomeada para `edge_edgeeventreceipt_legacy_YYYYMMDD_HHMMSS`
- view `edge_edgeeventreceipt` criada em cima de `event_receipts` (compatibilidade de leitura)
