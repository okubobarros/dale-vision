# SPEC-006 Alerts

## Objetivo
Gerenciar alertas de eventos e notificações.

## Não-objetivos
- Regras avançadas de ML

## Fluxo
1. Evento detectado
2. Regra aplica cooldown
3. Notification logs criados
4. Usuário resolve/ignora

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
