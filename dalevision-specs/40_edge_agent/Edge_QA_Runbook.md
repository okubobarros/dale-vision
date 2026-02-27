# Edge QA Runbook

## Objetivo
Validar release do edge-agent (Windows) antes de liberar para producao.

## Ambiente
- Preferencia por loja de teste/homologacao.
- Evitar usar credenciais de producao.

## Pre-requisitos
- ZIP oficial do release.
- Credenciais da store de teste:
  - `CLOUD_BASE_URL`
  - `STORE_ID`
  - `EDGE_TOKEN`
  - `AGENT_ID`
- Acesso local de administrador na maquina.
 - Variaveis de visao (padrão do ZIP):
   - `VISION_ENABLED=1`
   - `VISION_BUCKET_SECONDS=30`
   - `VISION_POLL_SECONDS=5`
   - `VISION_SNAPSHOT_TIMEOUT_SECONDS=10`

## Passo a passo
1. Baixar o ZIP e extrair em qualquer pasta.
2. Editar `.env` e preencher `CLOUD_BASE_URL`, `STORE_ID`, `EDGE_TOKEN`, `AGENT_ID`.
   - Se usar nomes de camera fora do padrão, definir `VISION_ROLE_MAP` (ex.: `{"balcao":"caixa","salao":"salon","entrada":"entrada"}`).
3. Executar `01_TESTE_RAPIDO.bat` e confirmar `status=201`.
4. Executar `02_INSTALAR_AUTOSTART.bat` (admin).
   - Esperado: copia para `C:\ProgramData\DaleVision\EdgeAgent\dalevision-edge-agent-windows`.
   - Esperado: tarefa `DaleVisionEdgeAgent` criada.
5. Reiniciar o PC.
6. Executar `03_VERIFICAR_STATUS.bat`.
   - Esperado: task instalada e ativa.
   - Esperado: ultimo heartbeat recente no log.
   - Observacao: `03_VERIFICAR_STATUS.bat` aponta para `C:\ProgramData\DaleVision\EdgeAgent\...` quando existir.
7. Validar heartbeat no cloud:
   - `GET /api/v1/stores/{store_id}/edge-status/` deve mostrar `online` ou `degraded`.
8. Validar logs:
   - `logs\agent.log` (heartbeat e sync de cameras)
   - `logs\run_agent.log` (execucao via task)
   - `logs\service_install.log` e `logs\service_install.ps1.log` (instalacao)
   - Vision worker:
     - deve conter `[VISION] worker started`
     - nao deve conter `yolo failed`
     - se `cameras list failed 403`, validar permissao do endpoint `/api/v1/stores/{id}/cameras/` com `X-EDGE-TOKEN`.
9. Remocao:
   - Executar `04_REMOVER_AUTOSTART.bat` (admin).
   - Confirmar que a task nao existe:
     - `schtasks /Query /TN "DaleVisionEdgeAgent"` deve falhar com "not found".
10. Limpeza:
   - Apagar `C:\ProgramData\DaleVision\EdgeAgent\dalevision-edge-agent-windows`.

## Critérios de aprovacao
- `01_TESTE_RAPIDO.bat` retorna `status=201`.
- Task instalada, reinicio ok, e agente executando via autostart.
- Heartbeat aparece no cloud.
- Logs sem erros criticos.

## Observacoes
- Se mover a pasta depois de instalar, remover e reinstalar o autostart.
- A validacao completa exige credenciais de loja de teste.
