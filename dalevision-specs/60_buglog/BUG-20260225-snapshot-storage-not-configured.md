# BUG-20260225-snapshot-storage-not-configured

## Resumo
Snapshot de ROI retornava 500 por ausência de configuração de Storage no backend.

## Passos para reproduzir
1. Acessar ROI de uma câmera.
2. Clicar em “Upload snapshot” ou carregar snapshot atual.

## Resultado esperado
503 com código `STORAGE_NOT_CONFIGURED` e mensagem amigável.

## Resultado atual
500 Internal Server Error com mensagem `SUPABASE_MISSING_CONFIG`.

## Evidências e logs
- Backend logava ausência de config do Supabase Storage.

## Hipótese de causa
Storage de snapshots não configurado em env vars.

## SPEC relacionada
- SPEC-003 ROI Flow

## Impacto
- Severidade: Alta
- Usuários afetados: Owner/Admin/Manager e Staff

## Status
- Resolvido
