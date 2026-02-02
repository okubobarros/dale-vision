@echo off
setlocal

cd /d %~dp0

REM Ativa venv se existir (edge-agent\.venv), senão usa o python do sistema/venv atual
if exist ".venv\Scripts\python.exe" (
  set PY=.venv\Scripts\python.exe
) else if exist "..\venv\Scripts\python.exe" (
  set PY=..\venv\Scripts\python.exe
) else (
  set PY=python
)

echo [DALE Vision] Starting Edge Setup on http://localhost:7860 ...
start "" http://localhost:7860

%PY% -m src.agent setup

endlocal
