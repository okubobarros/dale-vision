# Buglog

## Como registrar um bug
1. Crie um arquivo em `60_buglog/` com o padrão `BUG-YYYYMMDD-<slug>.md`.
2. Preencha o template abaixo.
3. Vincule a SPEC relacionada.
4. Se o bug impactar contrato/jornada, atualizar também:
   - `30_system/API_Contracts.md`
   - `20_journeys/*` aplicável
   - `70_ops/Daily_Log.md`

## Template

# BUG-YYYYMMDD-<slug>

## Resumo
Descreva o problema em uma frase.

## Passos para reproduzir
1. Passo 1
2. Passo 2

## Resultado esperado
Descrever o comportamento correto.

## Resultado atual
Descrever o comportamento observado.

## Evidências e logs
- Logs relevantes
- Screenshots (se aplicável)

## Hipótese de causa
Explique sua hipótese inicial.

## SPEC relacionada
- SPEC-### (link ou referência)

## Impacto
- Severidade
- Usuários afetados

## Status
- Aberto
- Em progresso
- Resolvido

## Atualização
- Data: `2026-03-20`
- Motivo: reforçar sincronização entre buglog e documentos de contrato/jornada/ops.
