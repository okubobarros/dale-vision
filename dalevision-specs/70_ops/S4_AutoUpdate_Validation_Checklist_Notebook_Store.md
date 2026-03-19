# S4 - Auto-Update Validation Checklist (Notebook + Loja)

Data de referencia: 2026-03-19  
Escopo: validar update remoto do Edge Agent sem quebrar monitoramento.

## 1) Validacao agora no notebook (pre-loja)

### 1.1 Pre-check
- Confirmar pasta de instalacao do agente (exemplo):
  - `C:\Users\Alexandre\Downloads\dalevision-edge-agent-windows`
- Confirmar `.env`:
  - `AUTO_UPDATE_ENABLED=1`
  - `UPDATE_CHANNEL=stable`
  - `UPDATE_GITHUB_REPO=daleship/dalevision-edge-agent`
- Confirmar que o agente atual esta operacional (heartbeat/status no app).

### 1.2 Task Scheduler (update)
```powershell
cd "C:\Users\Alexandre\Downloads\dalevision-edge-agent-windows"

schtasks /Query /TN "DaleVisionEdgeAgentUpdate" /V /FO LIST
```
Esperado:
- tarefa existe
- `Estado de tarefa agendada: Habilitado`
- proxima execucao definida

### 1.3 Rodar update manual (fonte da verdade)
```powershell
New-Item -ItemType Directory -Force ".\logs" | Out-Null
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\update.ps1" -InstallDir "C:\Users\Alexandre\Downloads\dalevision-edge-agent-windows" *>&1 | Tee-Object ".\logs\update_manual.log"
Get-Content ".\logs\update_manual.log" -Tail 200
```
Esperado (OK):
- sem `UPD999`
- sem `404` remoto
- fluxo de update completo ou mensagem de `already up to date`

Falha critica (NO-GO):
- `UPD999`
- `404` no manifesto/pacote
- excecao sem rollback claro

### 1.4 Rodar update pela task
```powershell
schtasks /Run /TN "DaleVisionEdgeAgentUpdate"
Start-Sleep -Seconds 10
schtasks /Query /TN "DaleVisionEdgeAgentUpdate" /V /FO LIST
```
Esperado:
- ultimo resultado sem erro critico
- comportamento consistente com teste manual

### 1.5 Garantir agente segue vivo apos update
```powershell
Get-Content "C:\ProgramData\DaleVision\logs\agent.log" -Tail 200 | Select-String "Loaded env OK|Heartbeat ->|CAMERA_HEALTH|ERROR"
```
Esperado:
- `Loaded env OK`
- heartbeats `status=201`
- camera health continuando

## 2) Checklist para validar em loja (campo)

### 2.1 Antes de executar update
- Loja com `3/3` cameras online por pelo menos 10 min.
- Edge status no app = online.
- Snapshot/ROI operando normalmente.

### 2.2 Executar update controlado
1. Rodar task `DaleVisionEdgeAgentUpdate`.
2. Acompanhar logs por 10-15 min.
3. Confirmar retorno do agente no app (status online + camera health recente).

### 2.3 Evidencias obrigatorias (GO)
- `update_manual.log` ou `update.log` sem `UPD999/404`.
- `agent.log` com heartbeat apos update.
- app `/app/cameras` mostrando edge online e cameras online/degraded.
- sem regressao de ROI/snapshot.

### 2.4 Criterio de NO-GO em loja
- update falha com `UPD999`/`404`.
- agente nao volta apos update.
- cameras ficam offline de forma persistente.

## 3) Comandos de rollback operacional rapido (campo)
```powershell
schtasks /End /TN "DaleVisionEdgeAgentUpdate" 2>$null
schtasks /End /TN "DaleVisionEdgeAgent" 2>$null
taskkill /IM dalevision-edge-agent.exe /F 2>$null
schtasks /Run /TN "DaleVisionEdgeAgent"
```
Se nao recuperar:
- manter `AUTO_UPDATE_ENABLED=0` temporariamente
- registrar incidente no `Daily_Log.md` com horario, erro e evidencia.

## 4) Registro pos-validacao
- Atualizar:
  - `70_ops/Daily_Log.md`
  - `70_ops/Resumo_Executivo_Campo_2026-03-18.md`
  - `70_ops/S4_AutoUpdate_Execution_Plan.md` (bloco campo: GO/NO-GO)

