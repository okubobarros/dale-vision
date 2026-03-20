# HV-QA-01 - Go/No-Go Checklist (Owner Journey + Human Value + ROI)

Data: `2026-03-20`  
Escopo: `dashboard -> operations -> alerts -> reports`

## Objetivo
Validar regressao da jornada do owner com foco em:
1. continuidade do fluxo operacional entre modulos,
2. rastreabilidade de eventos obrigatorios,
3. consistencia de ROI/ledger entre API e UI.

## Suite automatizada recomendada

### Backend (copilot)
Comando:
```bash
python manage.py test apps.copilot.tests_network_outcomes apps.copilot.tests_network_outcomes_ledger apps.copilot.tests_value_ledger_store_view
```

Gate:
1. Endpoint de outcomes e ledger sem regressao.
2. `completion_rate`, `recovery_rate` e `value_net_gap_brl` validados.
3. Ranking de eficiencia com ordenacao e anonimização coberto.

### Frontend (tracking contract)
Comando:
```bash
pnpm --dir frontend test:run src/services/journey.contract.test.ts
```

Gate:
1. Eventos obrigatorios declarados em `journey.ts`.
2. Eventos de loop operacional presentes em `Operations` e `Reports`.
3. Eventos de personalizacao presentes em `Onboarding` e `Settings`.

## Checklist manual transversal (P0/P1)
1. Dashboard:
- briefing diário renderiza com CTA válido.
- card de valor recuperado mostra valores coerentes com ledger da API.

2. Operations:
- delegação de ação cria outcome e permite feedback.
- fechamento (`resolved/partial/not_resolved`) atualiza estado na tela.

3. Alerts:
- navegação mantém contexto de loja (`store_id`) quando aplicável.
- resolução/escalonamento mantém rastreabilidade.

4. Reports:
- seção de ROI usa mesmos totais do endpoint de ledger.
- ranking saudável renderiza fatores explicativos e respeita anonimização.

## Eventos obrigatórios (HV)
1. `operation_action_delegated`
2. `operation_action_feedback_submitted`
3. `operation_action_completed`
4. `owner_goal_defined`
5. `notification_tone_updated`
6. `notification_preferences_saved`

## Critério final de go-live (HV-QA-01)
1. Nenhum bloqueio P0/P1 aberto.
2. Suite automatizada acima 100% verde.
3. Conferência manual de consistência ROI concluída.
