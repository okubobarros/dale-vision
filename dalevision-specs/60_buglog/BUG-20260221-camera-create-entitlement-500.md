# BUG-20260221-camera-create-entitlement-500

## Resumo
`POST /api/v1/stores/{store_id}/cameras/` retornava 500 por falha de entitlement (coluna `trial_ends_at` ausente).

## Passos para reproduzir
1. Criar câmera via app fora da LAN da loja.
2. Requisição para `/stores/{store_id}/cameras/`.

## Resultado esperado
201/202 com câmera criada e `status=unknown` (sem validação de rede no POST).

## Resultado atual
500 Internal Server Error.

## Evidências e logs
- `ProgrammingError: column organizations.trial_ends_at does not exist`
- Log: `[STORE] cameras create entitlement error ...`

## Hipótese de causa
Schema do banco de testes/produção sem coluna `trial_ends_at` usada no entitlement.

## SPEC relacionada
- SPEC-002 Camera Onboarding

## Impacto
- Severidade: Alta
- Usuários afetados: Admins/Managers tentando cadastrar câmera

## Status
- Resolvido
