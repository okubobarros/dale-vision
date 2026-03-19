# Resumo Executivo de Campo — 2026-03-18

## Status Geral
- **Resultado**: operacao de monitoramento estabilizada em ambiente real de loja.
- **Loja**: Davvero Villa Lobos (`ab20f272-c844-495b-bbeb-3d00f1945e07`).
- **Cameras**: `3/3` online com latencia baixa e snapshots persistidos em Supabase.
- **Edge**: heartbeat recorrente (`201`) e camera health recorrente (`201`).

## O Que Funcionou
- Fluxo ROI via app (snapshot -> editar/publicar -> consumo no edge).
- Persistencia de snapshots em bucket `camera-snapshots`.
- Pipeline de eventos de visao:
  - ingestao em `event_receipts`,
  - normalizacao em `vision_atomic_events`,
  - projecoes em `traffic_metrics` e `conversion_metrics`.
- Task de boot validada para continuidade sem login humano:
  - `DaleVisionEdgeAgentStartup` (`ONSTART`, conta `SYSTEM`).

## Principais Incidentes do Dia
- **Auth app (401)**:
  - `GET /api/v1/me/status/` -> `401 Token inválido`.
  - `GET /api/v1/stores/` -> `401 Token inválido`.
  - Impacto: dashboard sem atualizar cards e contadores.
- **Endpoint ausente (404)**:
  - `GET /api/v1/sales/progress/` -> `404 Not Found` (HTML de rota inexistente).
  - Impacto: widget de progresso/comercial sem dados.
- **Snapshot upload**:
  - `GET /snapshot/` inicial com `404` (sem snapshot ainda) e `POST /snapshot/upload/` retornando `502` quando storage falhou (`upload_failed:400` interno).
- **Config de camera**:
  - `.env` com IDs de camera incorretos causou `camera_not_found` e ROI 404.
- **Auto-update**:
  - `update.ps1` com `UPD999` por `404` remoto (manifest/URL de update).

## Causa-Raiz Consolidada
- **Mismatch de autenticacao e versao** entre frontend e backend:
  - JWT expirado/invalido no cliente -> `401` em endpoints protegidos.
  - chamada para rota nao existente no backend atual (`/sales/progress`) -> `404`.
- **Configuracao operacional incompleta**:
  - IDs de camera divergentes do cadastro backend.
  - autoupdate ainda sem endpoint válido para manifesto do canal.

## Decisões Executivas
- Manter operacao do edge em modo estavel:
  - `CAMERA_SOURCE_MODE=local_only`
  - `CAMERA_SYNC_ENABLED=0`
  - `VISION_LOCAL_CAMERAS_ONLY=1`
- Auto-update fica **temporariamente fora do critério de go-live** ate remover `404`.
- Padrao de resiliencia em loja:
  - `ONSTART + SYSTEM` para boot,
  - `ONLOGON` como redundancia.

## Plano de Ação Imediato (D+1)
1. Corrigir contrato de auth no app (renovar sessao antes de chamar `/me/status` e `/stores`).
2. Alinhar rota de progresso (frontend x backend): implementar endpoint ou remover chamada.
3. Fechar correção de update manifesto (`update.ps1`) e validar `update.log` sem `UPD999`.
4. Publicar checklist final de implantação em loja com evidência pós-reboot sem login.

## Critério de GO para máquina da loja
- `3/3` cameras online por >= 30 min.
- Heartbeat e camera health sem lacunas > 60s.
- Snapshot upload funcionando.
- Dashboard carregando sem `401`/`404` críticos.
- Boot sem login inicia agente automaticamente (task startup em `SYSTEM`).

## Atualização de Execução — 2026-03-19
- ROI Editor agora opera com acao unica de ativacao:
  - `Publicar e iniciar` (remove necessidade de clicar `Iniciar monitoramento`).
- Objetivo do ajuste:
  - eliminar ambiguidade de UX em campo e reduzir erro operacional de "publiquei mas nao iniciou".
- Proxima frente em execucao:
  - Edge Setup Wizard com default `backend_managed` e `.env` de producao com `STARTUP_TASK_ENABLED=1` nesse perfil.
  - Modo `stabilization/local_only` mantido apenas como contingencia guiada (ativacao manual explicita no wizard).
  - migrar caminho padrao de cadastro/sync de cameras para backend-managed e reduzir dependencia de `CAMERAS_JSON` manual.

## Atualização Operacional — 2026-03-19 (madrugada)
- **Autostart de boot (sem login):**
  - no pacote testado, `startupTaskEnabled=False` e `STARTUP_TASK=DISABLED`;
  - portanto, **neste setup atual não está garantido** iniciar no boot sem login.
  - requisito para loja: task `DaleVisionEdgeAgentStartup` (`ONSTART`, `SYSTEM`) ativa.
- **Auto-update: status atual = NO-GO**
  - `update.ps1` com:
    - `UPD006` (policy check `401 Unauthorized`);
    - `UPD009` (fallback sem release GitHub válido).
  - validação externa:
    - `GET https://api.github.com/repos/daleship/dalevision-edge-agent/releases/latest` => `404 Not Found`.
- **Ações para liberar amanhã cedo:**
  1. corrigir autenticação/contrato do endpoint `update-policy` para eliminar `401`;
  2. disponibilizar release/pacote válido para canal `stable` (ou remover fallback GitHub e operar só via policy);
  3. rerodar checklist `70_ops/S4_AutoUpdate_Validation_Checklist_Notebook_Store.md` com evidência sem `UPD006/UPD009`.
