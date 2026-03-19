# Runbook - Teste na Loja (Operador)

## Objetivo
Validar Edge Agent + camera_health contínuo + status no app.

## Pré-requisitos
- ZIP do Edge Agent atualizado
- .env com STORE_ID e EDGE_TOKEN válidos
- RTSPs confirmados (subtype=0 e subtype=1)

## Passo a passo (T-0 a T+10 min)
1. Rodar Diagnose.bat
2. Verificar no resumo:
   - edge_auth_ok=sim
   - edge_cameras_count > 0
3. Rodar 02_TESTE_RAPIDO.bat (ou --smoke 60)
4. Confirmar:
   - heartbeat_ok=True
   - camera_health_posted == total_cameras
5. Rodar 03_INSTALAR_AUTOSTART.bat
6. Abrir app.dalevision.com
7. Confirmar:
   - loja online
   - last_comm_at recente
   - cameras online (ou degraded)
8. Validar 1 câmera com subtype=1

## Se falhar
1. edge_auth_ok=nao
   - Conferir STORE_ID e EDGE_TOKEN no .env
2. camera_health_posted=0
   - Conferir se as câmeras estão cadastradas no app
   - Conferir se o RTSP responde no PC da loja
3. store offline no app
   - Reabrir dashboard
   - Conferir last_comm_at no edge-status
4. `401 Token inválido` em `/api/v1/me/status/` ou `/api/v1/stores/`
   - Sessao do usuario no app expirou/invalida; refazer login e validar refresh token.
5. `404` em `/api/v1/sales/progress/`
   - Rota nao existente no backend ativo; registrar mismatch de versao frontend/backend.
6. Snapshot upload com `502`
   - Verificar backend/storage (`upload_failed:400`) e variaveis Supabase no Render.
7. `camera_not_found` no health
   - Ajustar `CAMERAS_JSON` para UUIDs reais das cameras cadastradas no app.

## Saída da loja
1. Fechar tudo e aguardar 2-3 minutos
2. Reabrir app.dalevision.com e confirmar loja online
3. Confirmar task de boot:
   - `DaleVisionEdgeAgentStartup` deve iniciar agente no boot do Windows (nao reinicia o computador).
