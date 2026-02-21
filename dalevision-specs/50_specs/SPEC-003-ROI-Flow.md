# SPEC-003 ROI Flow

## Objetivo
Permitir configuração de ROI por câmera.

## Não-objetivos
- Treinamento avançado de modelos

## Fluxo
1. Selecionar câmera
2. (Opcional) Carregar snapshot para base de desenho
3. Definir ROI
3. Salvar ROI (`PUT /api/v1/cameras/{camera_id}/roi/`)
4. Edge consome ROI publicado (`GET /api/v1/cameras/{camera_id}/roi/latest/`)

## Estados
- draft
- published

## Payloads
- `PUT /api/v1/cameras/{camera_id}/roi/` -> `{ config_json: { status: draft|published, zones: [...] } }`
  - Quando publicado por staff, adicionar:
    - `created_by_staff: true`
    - `created_by_user_id`
    - `created_at`
    - `note: "ROI publicado pela equipe DaleVision"`
- `POST /api/v1/cameras/{camera_id}/snapshot/upload/` (multipart `file`)
- `GET /api/v1/cameras/{camera_id}/snapshot/` -> `{ url, expires_in }` (signed URL curta)

## Snapshot (para ROI)
- Storage: bucket privado `snapshots`
- Path: `org/{org_id}/stores/{store_id}/cameras/{camera_id}/{yyyy}/{mm}/{dd}/{ts}.jpg`
- Backend gera signed URL (5–15 min); frontend nunca recebe URL pública permanente.

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
- Upload de snapshot com permissão
- Viewer não consegue publicar ROI
