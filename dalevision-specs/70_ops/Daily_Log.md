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
  - Demo mock (analytics + alerts) com seed e endpoint de métricas implementados.
- Bloqueios:
  - Nenhum.
- Decisões:
  - Padronizar logs de instalacao em `logs\service_install.log` e `logs\service_install.ps1.log`.
- Próximos passos:
  - Nenhum imediato.

## 2026-03-03
- Data: 2026-03-03
- Highlights:
  - Axios no frontend passou a usar timeouts por categoria: 10s default/critical, 3s best-effort e long apenas para alerts/export.
  - `/api/v1/me/status/` agora tem retry com backoff e fallback seguro (sem derrubar auth) em caso de timeout.
  - Onboarding `next-step` só é chamado após stores carregarem e com `store_id`; `store_id_invalid` (400) é tratado como noop.
  - Logs de timing por request adicionados apenas em dev.
- Bloqueios:
  - Nenhum.
- Decisões:
  - Endpoints best-effort devem falhar rápido (≈3s) para não travar login/boot do app.
- Próximos passos:
  - Monitorar estabilidade do login e tempo de hidratação no app.

## 2026-03-09
- Data: 2026-03-09
- Highlights:
  - Landing `/` corrigida: hero passou a usar `frontend/public/hero_coffee.png`; a produção estava sem imagem porque o JSX referenciava um asset inexistente (`/hero-store-floor.png`) e nenhum arquivo correspondente havia sido versionado/publicado.
  - Hero da landing mantida com overlay operacional (`DADOS REAIS`, `CAM 04 — STORE FLOOR`, `AI ANALYSIS ACTIVE`) e microcopy revisada para diagnóstico comercial.
  - Frontend voltou a compilar com `pnpm -C frontend build` após correção de tipagem em `src/services/api.ts` (`refreshSessionPromise` não pode ser `Promise<Promise<...>>`).
  - Frontend ficou limpo em `pnpm -C frontend lint` após ajuste de sincronização de query params em `Alerts.tsx` e simplificação de memoização/constantes em `Analytics.tsx`.
  - Dashboard/app: requests críticos deixaram de multiplicar timeout por retry duplicado; polling do `edge-status` passa a pausar em erro e refresh de sessão 401 passa a ser compartilhado.
  - Analytics backend: ingestão de `vision.metrics.v1` documentada com granularidade por câmera/bucket e cálculo de conversão a partir de `checkout_events / footfall`; migração SQL adicionada em `supabase/sql/20260309_add_camera_granularity_to_metrics.sql`.
  - Edge-agent: autostart endurecido para operação de loja com task `ONSTART` + fallback `ONLOGON`; payload de visão ampliado com `camera_role` e `checkout_events`.
- Bloqueios:
  - Validar deploy da landing para confirmar `hero_coffee.png` servido em produção e sem cache antigo.
  - Aplicar migração SQL de granularidade por câmera no banco antes de depender dos novos analytics em produção.
- Decisões:
  - Assets visuais de landing só entram em produção quando estiverem versionados em `frontend/public` ou importados diretamente no bundle.
  - Correções cross-repo (frontend/backend/edge-agent) devem sempre gerar registro operacional único em `dalevision-specs`.
- Próximos passos:
  - Publicar deploy do frontend com `hero_coffee.png` e validar carregamento via Network.
  - Aplicar migração SQL, redeploy do backend e rebuild do `dalevision-edge-agent`.
  - Validar em loja: heartbeat, `camera_health`, `vision.metrics.v1` e reflexo no `/app/analytics`.

## 2026-03-04
- Data: 2026-03-04
- Highlights:
  - Frontend (auth OK, token salvo e redigido): requisi??es Axios com auth header para /v1/stores/, /v1/stores/{id}/cameras/, /v1/onboarding/next-step/ e /v1/stores/{id}/edge-status/ deram timeout (10s/3s) e os dados n?o carregaram.
  - Store Health passou a usar camera_health recente e last_comm_at (max store/camera/health).
  - /api/edge/events/ agora atualiza store.last_seen_at para qualquer evento aceito e limpa last_error.
  - Camera health online limpa camera.last_error e camera_health.error; store não fica preso em erro legado.
  - Edge-status expõe last_comm_at e evita offline quando há camera_health recente.
  - test_connection ganhou hard timeout (<=8s) com payload padronizado e logging de elapsed_ms.
  - Frontend passou a mostrar status real do Edge e removeu dependência do test_connection server-side.
  - Migration adicionada: onboarding_progress.updated_at (corrige crash no Render).
  - Edge Agent em modo local (`CAMERAS_JSON`) estabilizado para operar sem dependência de `/api/v1/stores/.../cameras/` e sem endpoints `/api/edge/cameras` inexistentes.
  - `camera_health` passou a publicar em `/api/edge/events/` com `event_name=camera_health` e logs por ciclo/camera.
  - Comando `--smoke` validado em Windows com resumo de sucesso/falha.
  - Fallback de autostart reforçado: quando script de instalacao nao existe, cria task `ONLOGON` com `cd /d` na pasta do agente para garantir leitura do `.env`.
  - Investigacao de loja identificou causa de `posted 0/N`: backend retornando `400 camera_not_found` por `camera_id` divergente do cadastro real.
  - Teste RTSP real confirmou canal funcional via `ffplay`; ajuste no checker para reduzir falso `RTSP401` por Digest challenge.
  - Correção de recorrência no endpoint `GET /api/v1/stores/{store_id}/cameras/`: quando houver `X-EDGE-TOKEN`, a validação do token do Edge agora tem precedência sobre auth de usuário para evitar `403` indevido no sync do agent.
  - Edge Setup Wizard passou a concluir a verificação de ativação quando houver heartbeat recente com `store_status_reason=camera_health_stale`, evitando bloqueio da etapa por ausência temporária de health das câmeras.
- Bloqueios:
  - Timeouts recorrentes p?s-login nas chamadas Axios (10s/3s), impedindo carregar lojas/c?meras/dashboard.
  - `camera_health` depende de IDs de camera corretos no `CAMERAS_JSON` (UUID/external_id/nome existentes no backend).
- Decisões:
  - Operacao de loja passa a exigir `CAMERAS_JSON` com IDs reais do dashboard.
  - `--smoke 60` vira critério obrigatório de aceite antes de empacotar/deploy.
- Próximos passos:
  - Atualizar `.env` de release com `CAMERAS_JSON` real por loja.
  - Rodar smoke + conferir `edge-status` no dashboard após cada instalação.

## 2026-03-05
- Data: 2026-03-05
- Highlights:
  - Contrato de `edge-status` ampliado com campos explícitos de operação: `connectivity_status`, `connectivity_age_seconds`, `pipeline_status`, `health_fresh_seconds`.
  - Frontend (Dashboard, Stores e Cameras) passou a usar conectividade como fonte única para badge Online/Offline do Edge, reduzindo divergência entre telas.
  - Página de câmeras passou a priorizar status operacional por câmera vindo de `edge-status.cameras` (tempo real), mantendo dados históricos como fallback.
  - Endpoint `GET /api/v1/stores/{store_id}/cameras/` consolidado para priorizar `X-EDGE-TOKEN` quando presente, evitando `403` indevido em sync do agent.
  - Testes de regressão adicionados/atualizados para cobrir `camera_health_stale` com conectividade online e novo contrato de status.
- Bloqueios:
  - Nenhum novo bloqueio técnico identificado no backend; pendente validação em produção após deploy.
- Decisões:
  - Diferenciar no produto duas dimensões: conectividade do agente (heartbeat) e saúde do pipeline de câmeras (camera health).
  - Evitar inferência local no frontend quando o backend já fornece status operacional explícito.
- Próximos passos:
  - Deploy conjunto backend/frontend.
  - Validar em loja real: heartbeat recente + `pipeline_status=stale` deve manter Edge conectado e mostrar mensagem de saúde desatualizada.

## 2026-03-06
- Data: 2026-03-06
- Highlights:
  - Flapping RTSP em loja foi causado por concorrência: duas instancias do agente + dois `.env` distintos.
  - Task `DaleVisionEdgeAgent` encontrada com `Task To Run` em `C:\ProgramData\DaleVision\EdgeAgent\...` e `Run As User=SISTEMA`.
  - RTSP Intelbras exige URI ONVIF completa (`unicast=true&proto=Onvif`) e canais corretos (1,2,3).
  - Ajustado pacote Windows para autostart por usuario (ONLOGON) e uso da pasta extraida.
  - `run_agent.cmd` ganhou guard de dupla instancia com normalizacao de path.
  - README do release atualizado para o novo fluxo (sem ProgramData).
  - ZIP passou a incluir `yolov8n.pt` e `.env` sugere `VISION_MODEL_PATH=yolov8n.pt`.
  - Edge Setup Wizard agora usa download `latest` com cache-busting automático.
  - Wizard orienta primeiro setup sem `CAMERAS_JSON` e lista `yolov8n.pt` no checklist.
  - ROI Editor ganhou mensagem de erro mais clara quando não há snapshot (RTSP/edge/câmera).
  - Auditoria de bundle concluída: sem regressão real, métricas comparadas em condições idênticas.
  - Performance inicial medida (dist): ~520 KB JS (≈162 KB gzip) com 7 requests no first load.
  - Navegação para `/app/analytics`: +~379 KB JS (≈112 KB gzip) com 2 requests; charts isolados fora do initial load.
- Bloqueios:
  - Nenhum bloqueio ativo no frontend; pendente validar em loja.
- Decisões:
  - Fluxo oficial: baixar ZIP, editar `.env` na pasta extraida, instalar autostart ONLOGON.
  - Validar sempre `schtasks /Query /TN DaleVisionEdgeAgent /V /FO LIST` (Task To Run).
- Próximos passos:
  - Validar em loja: snapshot + ROI + métricas fluindo para analytics.
  - Conferir logs do Edge em `logs/agent.log` após instalação.
  - Executar checklist de loja atualizado antes de visita presencial.
