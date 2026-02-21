# Definition of Ready / Definition of Done

Checklist global para SPECs e BUGs. Usar como gate em PRs e revisões.

## DoR (SPEC)
- Objetivo claro e mensurável.
- Escopo e não-objetivos definidos.
- Fluxo principal e estados documentados.
- Payloads e erros listados (ver `30_system/API_Contracts.md`; se faltar, marcar `TBD`).
- Impacto no Edge/Backend/Frontend identificado.
- Dependências e riscos mapeados.
- Critérios de aceitação e testes mínimos definidos.
- Termos aderentes ao `00_index/Glossary.md`.

## DoD (SPEC)
- Implementação alinhada com a SPEC.
- Testes cobrindo fluxos críticos e erros definidos.
- Telemetria/logs críticos adicionados.
- Docs atualizados (SPEC + contratos/API se aplicável).
- Registro no `70_ops/Daily_Log.md` no fim do dia.
- PR referencia a SPEC.

## DoR (BUG)
- Resumo e impacto claros.
- Passos de reprodução consistentes.
- Resultado esperado vs atual.
- Evidências/logs anexados quando possível.
- Hipótese inicial registrada.
- SPEC relacionada identificada (ou `TBD` com justificativa).
- Termos aderentes ao `00_index/Glossary.md`.

## DoD (BUG)
- Causa raiz registrada.
- Correção validada com teste automatizado quando aplicável.
- Nenhuma regressão conhecida.
- Docs/SSOT atualizados se houver mudança de regra.
- Registro no `70_ops/Daily_Log.md` no fim do dia.
- PR referencia o BUG.
