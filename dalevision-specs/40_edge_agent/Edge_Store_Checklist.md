# Checklist Loja — 3 Câmeras + Métricas (MVP)

## Objetivo
Conectar a loja, validar 3 câmeras e iniciar envio de métricas (`vision.metrics.v1`).

## Antes de ir
- ZIP do Edge Agent com dependências de visão.
- `.env` pronto (ou usar Edge Setup Wizard).
- Acesso admin no PC da loja.
- Credenciais do NVR/câmeras (RTSP, usuário, senha).

## No local — Conexão do Edge
1. Extrair ZIP em qualquer pasta.
2. Editar `.env` com `CLOUD_BASE_URL`, `STORE_ID`, `EDGE_TOKEN`, `AGENT_ID`.
3. Rodar `01_TESTE_RAPIDO.bat` → esperado `status=201`.
4. Rodar `02_INSTALAR_AUTOSTART.bat` (admin).
5. Reiniciar o PC.
6. Rodar `03_VERIFICAR_STATUS.bat` → `LastResult=0`.
7. App → confirmar loja **Online**.

## Câmeras + ROI
8. Cadastrar 3 câmeras (nomear com `balcao`, `salao`, `entrada` se possível).
9. Fazer upload de snapshot e desenhar ROI por câmera.
10. Status “Aguardando validação” é esperado até o edge enviar health/snapshot.

## Métricas (Vision Worker)
11. Confirmar no `agent.log`:
   - `[VISION] worker started`
   - não aparecer `yolo failed`.
12. Validar `event_receipts` (backend) com `event_name=vision.metrics.v1`.
13. Validar métricas em:
   - `traffic_metrics`
   - `conversion_metrics`

## Resultado esperado
- Loja online.
- 3 câmeras conectadas e com ROI válido.
- Métricas chegando em buckets de 30s.
