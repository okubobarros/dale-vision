# Documentation Status - 2026-03-20

## Objetivo
Manter `dalevision-specs` sincronizado com o estado real do produto/código.

## Cobertura por pasta (checkpoint)
1. `00_index`
- Atualizado: SSOT com referência de atualização transversal.
- Ação contínua: manter este arquivo como checkpoint de revisão.

2. `10_product`
- Atualizado: roadmap com frente de Admin Control Tower + calibração orientada a dados.
- Gap aberto: detalhar dependências comerciais por ICP segmentado.

3. `20_journeys`
- Atualizado: jornada Admin com ciclo de calibração e validação antes/depois.
- Atualizado: jornada SaaS Admin com estado real implementado.

4. `30_system`
- Atualizado: contratos de API com endpoints de funil, qualidade, PDV e calibração.
- Gap aberto: publicar OpenAPI estável de referência para consumo externo.

5. `40_edge_agent`
- Atualizado: `Edge_Vision_MVP.md` refletindo pipeline já integrado ao backend.
- Gap aberto: publicar matriz de tuning por perfil de câmera real em produção.

6. `50_specs`
- Atualizado: índice de specs.
- Novo: `SPEC-010-Calibration-Actions-Workflow.md`.

7. `60_buglog`
- Atualizado: README com regra de vínculo a contrato/jornada e checkpoints de data quality/CV.
- Gap aberto: abrir bugs formais para riscos que ainda estão somente em backlog ops.

8. `70_ops`
- Atualizado: `Daily_Log.md` com checkpoint executivo de 2026-03-20.
- Já atualizado no ciclo atual: planos de MLOps, PM/Admin funil/data quality e análise CV multi-cliente.

## Mudanças do ciclo 2026-03-20
- Correção de funil para emissão robusta de `first_metrics_received`.
- Backfill operacional para lojas já com métricas.
- Novo workflow de calibração:
  - backend: `calibration_actions`, `calibration_evidences`, `calibration_results`;
  - APIs: list/create/patch ação + anexar evidência + registrar resultado;
  - frontend: backlog no Admin SaaS e tela cliente `/app/calibration`.

## Regra de manutenção
- Sempre que houver entrega relevante em backend/frontend/edge:
  1. Atualizar `30_system/API_Contracts.md` e/ou jornada correspondente.
  2. Atualizar `70_ops/Daily_Log.md`.
  3. Atualizar este status consolidado com data.
