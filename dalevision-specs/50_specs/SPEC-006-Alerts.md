# SPEC-006 Alerts

## Objetivo
Gerenciar alertas de eventos e notificações.

## Regra de produto (atualizada 2026-03-13)
- Alertas devem funcionar como módulo único (`Feed`, `Regras`, `Histórico`) em `/app/alerts`.
- O app oferece baseline padrão de regras por tipo de operação.
- Cada loja pode customizar metas e thresholds por contexto local (segmento, equipe, capacidade, faturamento).
- Customização pode ser:
  - manual (edição na aba Regras);
  - assistida pelo Copiloto (sugestão + confirmação explícita do usuário).

## Não-objetivos
- Regras avançadas de ML

## Fluxo
1. Evento detectado
2. Regra aplica cooldown
3. Notification logs criados
4. Usuário resolve/ignora
5. Regra é revisada e ajustada por loja quando necessário

## Estados
- open
- resolved
- ignored

## Payloads
- `POST /api/alerts/alert-rules/ingest/` com `store_id`, `event_type`, `severity`
- `GET /api/alerts/events/` (filtro por `store_id`)
- `GET /api/alerts/notification-logs/`

## Erros
- 400 falta `store_id`, `event_type`, `severity`
- 400 `event_type` inválido para enum
- 403 sem permissão de store

## DOR
- Taxonomia de alertas definida
- Endpoints confirmados

## DOD
- Alertas listados e acionáveis

## Testes
- Ingest com payload válido
- Cooldown suprime duplicados
