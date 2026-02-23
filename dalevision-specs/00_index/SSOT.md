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

## Specs
- Índice: `../50_specs/README.md`
- `SPEC-001-Edge-Setup-Wizard`: `../50_specs/SPEC-001-Edge-Setup-Wizard.md`
- `SPEC-002-Camera-Onboarding`: `../50_specs/SPEC-002-Camera-Onboarding.md`
- `SPEC-003-ROI-Flow`: `../50_specs/SPEC-003-ROI-Flow.md`
- `SPEC-004-Trial-Paywall`: `../50_specs/SPEC-004-Trial-Paywall.md`
- `SPEC-005-Store-Reports`: `../50_specs/SPEC-005-Store-Reports.md`
- `SPEC-006-Alerts`: `../50_specs/SPEC-006-Alerts.md`
- `SPEC-007-Event-Pipeline`: `../50_specs/SPEC-007-Event-Pipeline.md`
- `SPEC-008-Auth-Password-Recovery`: `../50_specs/SPEC-008-Auth-Password-Recovery.md`
