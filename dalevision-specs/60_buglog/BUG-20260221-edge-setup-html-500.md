# BUG-20260221-edge-setup-html-500

## Resumo
`GET /api/v1/stores/{store_id}/edge-setup/` e `POST /edge-token/rotate/` retornavam 500 com HTML, quebrando o wizard.

## Passos para reproduzir
1. Abrir Edge Setup Wizard.
2. Selecionar loja.
3. Backend responde 500 (HTML) ao buscar credenciais ou rotacionar token.

## Resultado esperado
Resposta JSON consistente:
- `edge-setup`: `{ supported, edge_token, cloud_base_url, agent_id_default, agent_id_suggested }`
- `edge-token/rotate`: `{ supported, edge_token, cloud_base_url, agent_id_suggested }`

## Resultado atual
500 Internal Server Error com HTML.

## Evidências e logs
- Logs do frontend com `status: 500` e corpo HTML.
- Erro no wizard: "EDGE_TOKEN ausente".

## Hipótese de causa
Exceção não tratada no DRF + fallback HTML do servidor.

## SPEC relacionada
- SPEC-001 Edge Setup Wizard

## Impacto
- Severidade: Alta
- Usuários afetados: Todos que tentam instalar Edge

## Status
- Resolvido
