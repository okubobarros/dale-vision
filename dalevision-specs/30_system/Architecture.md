# Architecture

## Visão geral
- Frontend: React + Vite
- Backend: Django + DRF
- Edge-agent: serviço local em loja
- Supabase: auth e dados auxiliares
- n8n: automações de eventos

## Fluxos críticos
- Edge setup: `/api/v1/stores/{store_id}/edge-setup/`
- Eventos do Edge: `/api/edge/events/`
- Cadastro de câmeras: `/api/v1/stores/{store_id}/cameras/`
- Alertas ingest: `/api/alerts/alert-rules/ingest/`

## Observabilidade
- Logs estruturados no backend
- Erros de integração (n8n, edge) sempre registrados
