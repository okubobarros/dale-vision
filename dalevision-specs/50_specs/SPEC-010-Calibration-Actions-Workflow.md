# SPEC-010 - Calibration Actions Workflow

## Objetivo
Criar um fluxo operacional padrão para ajustes de câmera/ROI guiados por dados, com autonomia para cliente e governança para admin interno.

## Problema
- Ajustes de campo eram executados sem trilha completa de evidência e validação.
- Dificuldade de provar ganho real (`antes` vs `depois`) e priorizar backlog.

## Escopo
1. Backlog de ações de calibração por loja/câmera.
2. Registro de evidências antes/depois.
3. Registro de resultado de validação (baseline/after/passou).
4. Visão no Admin SaaS e visão no app do cliente.

## Contratos de API
- `GET|POST /api/v1/calibration/actions/`
- `PATCH /api/v1/calibration/actions/{action_id}/`
- `POST /api/v1/calibration/actions/{action_id}/evidence/`
- `POST /api/v1/calibration/actions/{action_id}/result/`

## Modelo de dados
- `calibration_actions`
- `calibration_evidences`
- `calibration_results`

## Status de ação
- `open`
- `in_progress`
- `waiting_validation`
- `validated`
- `rejected`
- `closed`

## Regras de permissão
- Admin interno (`staff/superuser`): visão multi-tenant.
- Cliente (`owner/admin/manager`): apenas ações da própria organização/loja.
- Viewer: sem permissão de edição.

## UX mínima (MVP)
1. Lista de ações com filtros por loja/status.
2. Botões rápidos de transição de status.
3. Formulário inline para anexar evidência.
4. Formulário inline para registrar resultado.

## Métricas de sucesso
- % ações com evidência completa (`before` + `after`).
- % ações validadas dentro do SLA.
- Delta médio de qualidade por tipo de issue.

## Fora de escopo (neste ciclo)
- Upload binário de mídia com pipeline dedicado (usar URL assinada/armazenada externamente).
- Motor automático completo de criação de ações por regra.

## Referências
- `20_journeys/Journey_Admin.md`
- `20_journeys/Journey_SaaS_Admin_Control_Tower.md`
- `70_ops/Analise_CV_MLOps_Produto_MultiCliente_2026-03-20.md`

## Atualização
- Data: `2026-03-20`
- Estado: Implementado em backend e frontend (MVP operacional).
