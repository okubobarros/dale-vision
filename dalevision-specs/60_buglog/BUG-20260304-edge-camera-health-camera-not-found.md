# BUG-20260304-edge-camera-health-camera-not-found

## Resumo
`camera_health` era enviado pelo edge com `camera_id` local (`cam-1`), e o backend rejeitava com `400 camera_not_found`, mantendo dashboard em `health_stale`.

## Passos para reproduzir
1. Configurar edge com `CAMERAS_JSON` contendo IDs genéricos (`cam-1`, `cam-2`).
2. Rodar `python -m dalevision_edge_agent.main --smoke 60`.
3. Observar heartbeat `201` e `camera_health_posted=0/N`.
4. Verificar log backend/edge com resposta `{"reason":"camera_not_found"}`.

## Resultado esperado
`camera_health` aceito (201/200) e `CameraHealthLog` atualizado para cada câmera da store.

## Resultado atual
Heartbeat funciona, mas `camera_health` é rejeitado para câmeras não resolvidas no backend; Store Health permanece degradado (`health_stale`).

## Evidências e logs
- Edge log:
  - `health POST rejected ... status=400 detail={"detail":"camera not found","stored":false,"reason":"camera_not_found"}`
- Dashboard:
  - câmeras offline com `health_stale` e timestamps antigos.

## Hipótese de causa
Contrato de identificação de câmera no ingest exige câmera existente na store (UUID/external_id/nome), mas o agente estava enviando IDs locais não cadastrados.

## SPEC relacionada
- SPEC-007 (Event Pipeline)
- SPEC-002 (Camera Onboarding)
- SPEC-001 (Edge Setup Wizard)

## Impacto
- Severidade: Alta
- Usuários afetados: lojas com modo local (`CAMERAS_JSON`) sem IDs mapeados ao backend.

## Status
- Resolvido

## Mitigação aplicada
- Operação passou a exigir `CAMERAS_JSON` com IDs reais do dashboard.
- `--smoke 60` adotado como gate de aceite; sucesso somente com `camera_health_posted == total_cameras`.

## Correção aplicada
- Operação passou a exigir IDs reais (UUID/external_id/nome existente).
- Edge-status agora ignora erro legado quando camera_health recente está online.
