# ADR-0001 - Source of Truth

## Contexto
O produto usa Backend (Django), Supabase (dados auxiliares) e Agent (estado local no Edge).
Há risco de divergência entre regras de negócio, dados e validações.

## Decisão
- **Backend** é a fonte única para regras de negócio, limites, permissões e contratos de API.
- **Supabase** é fonte para dados auxiliares e históricos (não determina regras).
- **Agent** é fonte para estado operacional local (Health, Snapshots e conectividade), reportado ao Backend.

## Consequências
- Qualquer regra crítica deve estar no Backend e documentada na SSOT.
- Supabase não altera regras de negócio sem mudança no Backend.
- Edge só valida conectividade; persistência e autorização continuam no Backend.

## Alternativas
- Edge como fonte de regras: rejeitado por risco de inconsistência e auditoria.
- Supabase como fonte primária: rejeitado por falta de governança central de regras.
