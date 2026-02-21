# Daily Log

## Objetivo
Registrar decisões e eventos do dia.

## Template
- Data:
- Highlights:
- Bloqueios:
- Decisões:
- Próximos passos:

## 2026-02-21
- Data: 2026-02-21
- Highlights:
  - RBAC aplicado no backend (stores/cameras/edge/ROI) e UI ajustada por role.
  - Edge setup endpoints padronizados para JSON (sem HTML 500).
  - Camera create sem validação de rede no POST; status inicial `unknown/pending_validation`.
  - Snapshot upload + signed URL (Supabase Storage) integrado ao ROI Editor.
  - Testes backend (59) e frontend (21) passaram.
- Bloqueios:
  - Nenhum bloqueio ativo.
- Decisões:
  - Viewer somente leitura (sem ROI/teste/edição).
  - Snapshot sempre via signed URL curta; bucket privado `snapshots`.
  - Staff assist pode publicar ROI com metadados de assistência.
- Próximos passos:
  - Validar bucket `snapshots` no Supabase e permissões.
  - Checar UX de “Aguardando validação” nas câmeras.
