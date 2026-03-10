# Edge Autostart - Clean Reset Runbook (Windows)

## Objetivo
Executar limpeza total do agente no Windows e reinstalar de forma previsível, evitando tasks/processos "fantasma" antes de novo teste (local e loja).

## Quando usar
- `04_REMOVER_AUTOSTART` abre e fecha sem feedback útil.
- `03_VERIFICAR_STATUS` mostra task ativa/desatualizada sem controle claro.
- Edge fica alternando online/offline sem mudança no `.env`.
- Necessidade de "zerar ambiente" antes de novo ciclo de validação.

## Observação importante
- Execute em **PowerShell como Administrador**.
- Este procedimento remove tasks, processos e pastas de runtime/log.
- Não remove o ZIP original baixado, a menos que você remova manualmente.

## Checklist rápido (comandos)
Use estes comandos na ordem, em PowerShell Admin:

```powershell
# 1) Parar processos do agente e launcher (ignora erro se não existir)
Get-Process | Where-Object { $_.ProcessName -match 'dalevision-edge-agent|powershell|cmd' } | `
  Where-Object { $_.Path -like '*dalevision*' -or $_.Path -like '*\\DV\\*' } | `
  Stop-Process -Force -ErrorAction SilentlyContinue

# 2) Remover tasks conhecidas
schtasks /Delete /TN "DaleVisionEdgeAgent" /F
schtasks /Delete /TN "DaleVisionEdgeAgentStartup" /F
schtasks /Delete /TN "DaleVisionEdgeAgentUpdate" /F

# 3) Validar que tasks saíram (deve retornar "não pode encontrar")
schtasks /Query /TN "DaleVisionEdgeAgent"
schtasks /Query /TN "DaleVisionEdgeAgentStartup"
schtasks /Query /TN "DaleVisionEdgeAgentUpdate"

# 4) Remover atalho Startup legado (se existir)
$startup = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
Remove-Item (Join-Path $startup "DaleVisionEdgeAgent.lnk") -Force -ErrorAction SilentlyContinue

# 5) Remover runtime/log/cache do ProgramData
Remove-Item "C:\ProgramData\DaleVision" -Recurse -Force -ErrorAction SilentlyContinue

# 6) (Opcional) Remover junction curta C:\DV se usada em testes
cmd /c rmdir C:\DV
```

## Reinstalação limpa (padrão recomendado)
1. Extrair ZIP novo em pasta limpa (ex.: `C:\Users\<user>\Downloads\dalevision-edge-agent-windows`).
2. Ajustar `.env` com perfil do teste:
   - estabilização: `VISION_ENABLED=0`, `CAMERA_SYNC_ENABLED=0`, `CAMERAS_JSON=[]`, `STARTUP_TASK_ENABLED=0`
   - log absoluto: `DALE_LOG_DIR=C:\ProgramData\DaleVision\logs`
3. Rodar:
   - `02_TESTE_RAPIDO.bat`
   - `03_INSTALAR_AUTOSTART.bat`
   - `04_VERIFICAR_STATUS.bat`

## Validação pós-instalação (obrigatório)
```powershell
schtasks /Query /TN "DaleVisionEdgeAgent" /V /FO LIST
Get-Content "C:\ProgramData\DaleVision\logs\agent.log" -Tail 80
Get-Content "<PASTA_DO_EDGE>\logs\run_agent.log" -Tail 80
```

Critérios de OK:
- Task `DaleVisionEdgeAgent` criada e habilitada.
- `agent.log` com heartbeat `status=201` contínuo.
- Dashboard mostrando "Último sinal: agora" de forma estável.

## Diagnóstico do caso "janela do 04 pisca e fecha"
Isso normalmente significa que o script elevou permissão e finalizou sem manter shell interativo. O status real fica nos logs e no `03_VERIFICAR_STATUS`.

Verifique sempre:
- `service_install.log` e `run_agent.log`
- `LastResult` da task
- existência de `C:\ProgramData\DaleVision\logs\agent.log`

## Códigos e sinais comuns
- `3221225786` (`-1073741510`): processo encerrado por fechamento/interrupção da janela/sessão.
- `267009`/`267011` em task scheduler: estado de execução não confiável sozinho; confirme por log de heartbeat.

## Fluxo para teste na loja (resumo)
1. Aplicar checklist de limpeza total.
2. Instalar com `.env` de estabilização.
3. Validar heartbeat estável por 10-15 min.
4. Só depois avançar para perfil backend gerenciado/câmeras.

