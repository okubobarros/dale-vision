# Checklist - Teste na Loja (OK/FAIL)

## Identificação
- Data:
- Loja:
- Store ID:
- Operador:
- Versão do Edge Agent:

## T-0 Diagnóstico
- Diagnose.bat rodou (OK/FAIL)
- edge_auth_ok=sim (OK/FAIL)
- edge_cameras_count > 0 (OK/FAIL)
- NET002 (VLAN) nao apareceu (OK/FAIL)

## T+2 Smoke
- 02_TESTE_RAPIDO.bat (OK/FAIL)
- heartbeat_ok=True (OK/FAIL)
- camera_health_posted == total_cameras (OK/FAIL)

## T+5 Autostart
- 03_INSTALAR_AUTOSTART.bat (OK/FAIL)
- Task criada e ativa (OK/FAIL)

## T+8 App
- Store online no dashboard (OK/FAIL)
- last_comm_at recente (OK/FAIL)
- Cameras online/degraded (OK/FAIL)

## T+10 Substream
- 1 camera com subtype=1 OK (OK/FAIL)

## Saida
- Reabrir app apos 2-3 min (OK/FAIL)
- Store continua online (OK/FAIL)

## Observacoes
- 
