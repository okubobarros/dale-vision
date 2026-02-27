# Checklist Loja — 3 Câmeras + Métricas (MVP)

## Objetivo
Conectar a loja, validar 3 câmeras e iniciar envio de métricas (`vision.metrics.v1`).

## Antes de ir
- [ ] ZIP do Edge Agent com dependências de visão.
- [ ] `.env` pronto (ou usar Edge Setup Wizard).
- [ ] Acesso admin no PC da loja.
- [ ] Credenciais do NVR/câmeras (RTSP, usuário, senha).

## No local — Conexão do Edge
- [ ] Extrair ZIP em qualquer pasta.
- [ ] Editar `.env` com `CLOUD_BASE_URL`, `STORE_ID`, `EDGE_TOKEN`, `AGENT_ID`.
- [ ] Rodar `01_TESTE_RAPIDO.bat` → esperado `status=201`.
- [ ] Rodar `02_INSTALAR_AUTOSTART.bat` (admin).
- [ ] Reiniciar o PC.
- [ ] Rodar `03_VERIFICAR_STATUS.bat` → `LastResult=0`.
- [ ] App → confirmar loja **Online**.

## Câmeras + ROI
- [ ] Cadastrar 3 câmeras (nomear com `balcao`, `salao`, `entrada` se possível).
- [ ] Fazer upload de snapshot e desenhar ROI por câmera.
- [ ] Status “Aguardando validação” é esperado até o edge enviar health/snapshot.

## Métricas (Vision Worker)
- [ ] `agent.log` contém `[VISION] worker started`.
- [ ] `agent.log` **não** contém `yolo failed`.
- [ ] Backend: `event_receipts` recebe `event_name=vision.metrics.v1`.
- [ ] Backend: métricas aparecem em `traffic_metrics`.
- [ ] Backend: métricas aparecem em `conversion_metrics`.

## Resultado esperado
- [ ] Loja online.
- [ ] 3 câmeras conectadas e com ROI válido.
- [ ] Métricas chegando em buckets de 30s.
