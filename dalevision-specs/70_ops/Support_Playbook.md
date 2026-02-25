# Support Playbook

## Objetivo
Padronizar suporte e reduzir tempo de resolução.

## Fluxo de atendimento
1. Triagem
2. Coleta de dados
3. Diagnóstico
4. Resolução
5. Follow-up

## Dados mínimos
- Store ID
- Org ID
- Logs do edge-agent
- Erro no backend

## Coleta rápida (Edge Agent)
- `Diagnose.bat` (gera ZIP de diagnóstico)
- `logs\agent.log`
- `logs\update.log`

## Checagem rápida de Storage (ROI Snapshot)
- `GET /api/v1/system/storage-status/` (somente staff)
- Verificar `configured`, `supabase_url_present`, `service_role_present`, `bucket`
- Bucket esperado: `camera-snapshots`

## Escalonamento
- Quando envolver infra, billing ou segurança
