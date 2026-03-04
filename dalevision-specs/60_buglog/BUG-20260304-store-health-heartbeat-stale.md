# BUG-20260304-store-health-heartbeat-stale

## Resumo
Dashboard/Stores mostrava loja offline (heartbeat expirado) mesmo com camera_health online recente.

## Passos para reproduzir
1. Enviar `edge_heartbeat` e `camera_health` recentes pelo edge.
2. Manter `stores.last_seen_at` antigo no backend.
3. Abrir Dashboard ou /app/stores.

## Resultado esperado
Store status online quando há camera_health recente dentro da janela.

## Resultado atual
Store offline com reason `edge_heartbeat_only` ou `health_stale` mesmo com câmeras online.

## Evidências e logs
- Edge status mostrava `last_seen_at` antigo.
- /app/cameras mostrava câmeras online (camera_health recente).

## Hipótese de causa
Store Health dependia apenas de `stores.last_seen_at` e/ou `stores.last_error`, ignorando camera_health recente.

## SPEC relacionada
- SPEC-007 (Event Pipeline)
- SPEC-002 (Camera Onboarding)

## Impacto
- Severidade: Alta
- Usuários afetados: lojas com edge ativo e camera_health recente.

## Status
- Resolvido

## Correção aplicada
- last_comm_at definido como o máximo entre store.last_seen_at, camera.last_seen_at e camera_health.checked_at.
- Store Health não permanece offline se há camera_health recente.
