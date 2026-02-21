# SPEC-003 ROI Flow

## Objetivo
Permitir configuração de ROI por câmera.

## Não-objetivos
- Treinamento avançado de modelos

## Fluxo
1. Selecionar câmera
2. Definir ROI
3. Salvar ROI (`PUT /api/v1/cameras/{camera_id}/roi/`)
4. Edge consome ROI publicado (`GET /api/v1/cameras/{camera_id}/roi/latest/`)

## Estados
- draft
- published

## Payloads
- `PUT /api/v1/cameras/{camera_id}/roi/` -> `{ config_json: { status: draft|published, zones: [...] } }`

## Erros
- 400 `config_json inválido`
- 400 `status inválido`
- 403 sem permissão

## DOR
- Modelo de dados definido
- API confirmada

## DOD
- ROI persistida e publicada

## Testes
- Criar draft
- Publicar com zona
