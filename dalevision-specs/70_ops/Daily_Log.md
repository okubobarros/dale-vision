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
  - Snapshot sempre via signed URL curta; bucket privado `camera-snapshots`.
  - Staff assist pode publicar ROI com metadados de assistência.
- Próximos passos:
  - Validar bucket `camera-snapshots` no Supabase e permissões.
  - Checar UX de “Aguardando validação” nas câmeras.

## 2026-02-23
- Data: 2026-02-23
- Highlights:
  - Flow de auth callback com timeout reduzido e fallback para onboarding.
  - Forgot password (reset via Supabase) documentado.
  - Onboarding: cargos incluem `owner` e gravação de funcionários corrigida.
  - Superuser/staff sem expiração de trial.
  - API health: `/api/health/auth/` e `/api/health/schema/`.
  - Cameras: listagem all-stores no frontend e remoção de QR/avançado.
  - Build otimizado com code-splitting e manualChunks no Vite.
- Bloqueios:
  - Nenhum.
- Decisões:
  - `setup-state` pode retornar `X-Schema-Warnings` quando schema estiver desatualizado.
- Próximos passos:
  - Rodar SQL `20260223_add_employee_role_owner.sql` no Supabase.

## 2026-02-25
- Data: 2026-02-25
- Highlights:
  - Snapshot ROI agora retorna 503 `STORAGE_NOT_CONFIGURED` quando env vars faltam.
  - Endpoint staff-only `/api/v1/system/storage-status/` para diagnóstico de Storage.
  - UI do ROI Editor mostra mensagens claras para 404/503 e progresso no upload.
- Bloqueios:
  - Nenhum.
- Decisões:
  - Bucket padrão de snapshots: `camera-snapshots`.
  - Signed URL curta (10 min) para snapshots.
- Próximos passos:
  - Validar env vars no Render e bucket no Supabase.

## 2026-02-26
- Data: 2026-02-26
- Highlights:
  - Edge bundle Windows agora instala em `C:\ProgramData\DaleVision\EdgeAgent\dalevision-edge-agent-windows`.
  - Task do agente usa `run_agent.cmd` e gera `logs\run_agent.log`.
  - Release inclui `BUILD_INFO.txt` com hashes e commit.
  - `verify-service.ps1` mostra `BUILD_INFO.txt` e ultimo heartbeat.
  - QA final do autostart aprovado (LastResult=0) e fluxo de cameras validado no app.
  - Backup diario de metrics no Google Drive definido (CSV + TTL) com setup no Render via Secret Files.
  - Cron alternativo via GitHub Actions definido para Render Free.
  - Vision worker integrado no edge-agent e checklist atualizado (ROI + dependencias).
  - Checklist de loja (3 câmeras + métricas) adicionado.
- Bloqueios:
  - Nenhum.
- Decisões:
  - Padronizar logs de instalacao em `logs\service_install.log` e `logs\service_install.ps1.log`.
- Próximos passos:
  - Nenhum imediato.
