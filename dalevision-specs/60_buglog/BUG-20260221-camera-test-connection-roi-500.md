# BUG-20260221-camera-test-connection-roi-500

## Resumo
`POST /api/v1/cameras/{camera_id}/test-connection/` e `GET /api/v1/cameras/{camera_id}/roi/` retornavam 500 (HTML) para usuário sem permissão.

## Passos para reproduzir
1. Logar com usuário sem papel de admin/manager.
2. Clicar em “Testar conexão” ou abrir ROI.

## Resultado esperado
403 JSON com `PERMISSION_DENIED`.

## Resultado atual
500 Internal Server Error com HTML.

## Evidências e logs
- Frontend reporta `status 500` com HTML.

## Hipótese de causa
Exceção não tratada em endpoints de câmera ao validar permissão.

## SPEC relacionada
- SPEC-002 Camera Onboarding
- SPEC-003 ROI Flow

## Impacto
- Severidade: Alta
- Usuários afetados: Viewers e usuários sem permissão

## Status
- Resolvido
