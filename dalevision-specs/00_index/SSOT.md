# SSOT

Este repositório `dalevision-specs` é a Fonte Única da Verdade (SSOT) do produto Dale Vision.
Toda decisão de produto, contrato de API e regra crítica deve estar aqui antes de ir para produção.

## Regras
- Se houver conflito entre código e docs, a SSOT prevalece e o código deve ser alinhado.
- Cada mudança relevante deve registrar data e autor no documento correspondente.
- PRs devem referenciar SPEC/BUG relacionados (ex.: SPEC-002, BUG-20250221-xxx).
- Ao final do dia, atualizar o `70_ops/Daily_Log.md` com decisões e progresso.

## Donos
- Product Lead + Tech Lead.
- Revisores: Backend, Frontend, Edge.

## Estrutura
- `00_index`: índice e glossário.
- `10_product`: visão de produto, roadmap e pricing.
- `20_journeys`: jornadas e pós-assinatura.
- `30_system`: arquitetura, dados, contratos, segurança.
- `40_edge_agent`: runbooks e diagnósticos.
- `50_specs`: especificações funcionais (SPEC-###).
- `60_buglog`: processo de bugs.
- `70_ops`: suporte e release.
