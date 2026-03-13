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

