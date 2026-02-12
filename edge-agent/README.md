# Edge Agent Movido

Esta pasta foi descontinuada no monorepo `dale-vision`.

Fonte oficial do Edge Agent:
- Repositorio local: `C:\workspace\dalevision-edge-agent`
- Repositorio GitHub: `dalevision-edge-agent` (publico)

Regra de desenvolvimento:
- Nao fazer novas implementacoes aqui.
- Toda alteracao de agent deve ser feita no repositorio oficial.
- Este diretorio existe apenas como ponteiro/documentacao para evitar drift entre codigos.

Fluxo recomendado:
1. Implementar e testar no repo `dalevision-edge-agent`.
2. Versionar e publicar release do agent a partir do repo oficial.
3. No `dale-vision`, manter apenas integracoes (backend/frontend) e referencias de documentacao.
