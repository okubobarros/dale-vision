# Lições Aprendidas — Edge Agent (pilotos iniciais)

## Autostart e instalação
- **Instalação correta** é na pasta extraída do ZIP (mesmo local do `.env`).
- Autostart padrão roda **ONLOGON do usuário**, não em `ProgramData`.
- Validar sempre o `Task To Run`:
  - `schtasks /Query /TN DaleVisionEdgeAgent /V /FO LIST`
- Se tentar apagar a pasta com o agente rodando, o Windows bloqueia (“Pasta em uso”).
- `04_REMOVER_AUTOSTART.bat` remove a task, mas não mata processos ativos.

## Logs confiáveis
- Fonte principal: `logs\agent.log` dentro da pasta extraída.
- `run_agent.log` fica em `logs\` da pasta extraída.
- `03_VERIFICAR_STATUS.bat` deve sempre apontar logs da pasta extraída.
- Evitar usar `C:\ProgramData\DaleVision\logs` no fluxo atual (isso era do pacote antigo).

## Câmeras
- Câmera “Aguardando validação” é esperado após cadastro.
- Status muda quando o Edge envia health + heartbeat e consegue acessar RTSP/snapshot.
- DELETE de câmera falhou (HTTP 500) por dependências no backend; corrigido com deleção em cascata (snapshots, ROI, health).

## Edge token
- Endpoint de lista de câmeras precisa aceitar `X-EDGE-TOKEN`.
- Se retornar 403, o worker de visão não processa e só o heartbeat funciona.
- Em rota de câmera por store, `X-EDGE-TOKEN` explícito inválido deve falhar com erro de edge (401/403) e não pode fazer fallback para JWT de usuário autenticado no navegador.

## Snapshot / ROI
- Snapshot 404 antes de upload é comportamento esperado.
- Upload de snapshot + ROI habilita a calibração.
- ROI inválido ou ausente → câmera ignorada pelo worker de visão.

## Vision Worker
- Precisa de dependências (`ultralytics`, `torch`, `opencv`, `numpy`) no EXE.
- Sem dependências, loga `yolo failed` e não gera métricas.
- Snapshot é suficiente para MVP; RTSP contínuo fica para etapa seguinte.
- Se `cameras list failed 403`, revisar `STORE_ID` e `EDGE_TOKEN` no `.env` e gerar novo token no wizard.

## RTSP e flapping
- Flapping pode ser causado por **duas instancias do agente** e **dois `.env` distintos**.
- NVRs limitam conexões RTSP simultaneas; evitar reconnect agressivo em paralelo.
- Intelbras exige URI ONVIF completa (`unicast=true&proto=Onvif`) e canais corretos.

## Licoes de Integracao (2026-03-03)
- **Store Health no dashboard** usa `GET /api/v1/stores/{store_id}/edge-status/` e depende de `CameraHealthLog` recente para nao cair em `health_stale`.
- `camera_health` via `/api/edge/events/` pode retornar `400 camera_not_found` quando `CAMERAS_JSON[].id` nao bate com a camera cadastrada no backend (id UUID, external_id ou nome).
- Em loja, usar `CAMERAS_JSON` com IDs reais das cameras do app (nao usar `cam-1`, `cam-2` genéricos).
- Em PowerShell, variavel temporaria exige `$env:CAMERAS_JSON='[...]'`; sintaxe `CAMERAS_JSON=[...]` gera parser error.
- Falso negativo de RTSP pode ocorrer com DESCRIBE sem handshake Digest; fallback para conectividade simples evita `RTSP401` indevido em alguns NVRs.
- `--smoke 60` virou gate operacional: sucesso so com `heartbeat_ok=True` e `camera_health_posted == total_cameras`.
- Fonte de log confiavel para suporte remoto continua sendo `logs\agent.log` da pasta extraída.
- Sempre rotacionar `EDGE_TOKEN` quando houver exposicao em canais de suporte/chat.

## Licoes de Campo (2026-03-18)
- **Autostart robusto de loja**: `ONLOGON` isolado nao atende operacao sem usuario logado; usar `ONSTART` com `SYSTEM` e manter `ONLOGON` como redundancia.
- **Path absoluto sempre**: executar scripts/updates a partir da pasta do agente ou com caminho absoluto; `System32` causa falso erro de arquivo inexistente.
- **Quoting no schtasks**: nao usar `&&` dentro de `/TR`; chamar direto `run_agent.cmd` ou wrapper validado.
- **Modelo de visao**: `VISION_MODEL_PATH` deve ser valor puro (`yolov8n.pt`), sem markdown/link.
- **Snapshot**:
  - `GET /snapshot/` com `404` antes de upload pode ser esperado.
  - Erro critico e `POST /snapshot/upload/` falhar (`5xx` no app, `upload_failed:400` no backend/storage).
- **Identidade de camera**: `CAMERAS_JSON[].id` precisa casar com UUID real da camera no backend; divergencia gera `camera_not_found` no health e `ROI 404`.
- **Validacao de metricas em producao**: confirmar sequencia `event_receipts` (ingestao) -> `vision_atomic_events` (normalizacao) -> `traffic_metrics` e `conversion_metrics` (projecao).
- **Auto-update**: `DaleVisionEdgeAgentUpdate` criada nao garante funcionalidade; evidenciar `update.log` e retorno sem `UPD999/404` antes de considerar pronto.
- **Tokens distintos, erros distintos**:
  - `401 Token inválido` em `/api/v1/me/status/` e `/api/v1/stores/` indica problema de sessao JWT do usuario no app.
  - `403` com `X-EDGE-TOKEN` em endpoint de cameras indica problema de permissao/rota para token de edge.
  - Acao: diagnosticar JWT e EDGE_TOKEN separadamente, sem misturar causas.
- **Dashboard sem atualizar**:
  - Se `/me/status` ou `/stores` falham com `401`, os cards agregados podem zerar ou ficar stale.
  - Se `/api/v1/sales/progress/` retorna `404`, ha mismatch de versao frontend/backend (chamada para rota nao deployada/nao existente).
