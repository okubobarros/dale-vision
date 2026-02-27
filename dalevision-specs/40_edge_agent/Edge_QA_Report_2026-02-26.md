# Edge QA Report - 2026-02-26

## Contexto
QA final do autostart do edge-agent e conexao remota no app antes da visita a loja.

## Ambiente
- Loja: "Loja Teste" (Tetes, SP)
- Data: 2026-02-26
- Bundle: Windows ZIP com autostart via Task Scheduler

## Resultados
### Autostart
- Instalacao: OK (copia para `C:\ProgramData\DaleVision\EdgeAgent\dalevision-edge-agent-windows`).
- Task Scheduler: OK.
- Reinicio: OK.
- `03_VERIFICAR_STATUS.bat`: OK.
- `LastResult`: **0** (aprovado).

### App / Remoto
- Edge status no app: **online**.
- `edge-status` retornando heartbeat recente.
- CRUD de cameras: **OK** (delete confirmado e persistente).

### Logs
- `run_agent.log`: execucao sem prompt interativo.
- `agent.log`: heartbeat 201.

## Observacoes
- O fluxo de remocao de camera falhava com 500 antes do deploy.
- Ajustes no backend resolveram DELETE e permissoes do endpoint `/stores/{id}/cameras`.

## Status final
**APROVADO para loja.**
