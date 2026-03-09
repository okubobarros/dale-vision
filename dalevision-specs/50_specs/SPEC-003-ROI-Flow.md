# SPEC-003 ROI Flow

## Objetivo
Permitir configuração de ROI por câmera com suporte a:
- zonas (`rect` e `poly`) para fila, checkout proxy e ocupação
- linhas (`line`) para fluxo de entrada/saída
- ownership explícito por métrica para evitar duplicação entre câmeras

## Não-objetivos
- Treinamento avançado de modelos

## Fluxo
1. Selecionar câmera
2. (Opcional) Carregar snapshot para base de desenho
3. Definir ROI (zona ou linha)
4. Atribuir métrica principal e ownership da câmera
5. Salvar ROI (`PUT /api/v1/cameras/{camera_id}/roi/`)
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
- ROI v2:
  - `schema_version: "roi.v2"`
  - `zones: [{ id, roi_entity_id, name, type, metric_type, ownership, zone_id, points[] }]`
  - `lines: [{ id, roi_entity_id, name, type, metric_type, ownership, zone_id, points[2] }]`
  - `ownership_matrix: [{ camera_id, roi_entity_id, metric_type, shape_type, ownership }]`
- `POST /api/v1/cameras/{camera_id}/snapshot/upload/` (multipart `file`)
- `GET /api/v1/cameras/{camera_id}/snapshot/` -> `{ snapshot_url, expires_in }` (signed URL curta)

## Snapshot (para ROI)
- Storage: bucket privado `camera-snapshots`
- Path: `stores/{store_id}/cameras/{camera_id}/snapshots/{ts}.jpg` (ou `.png`)
- Backend gera signed URL (10 min); frontend nunca recebe URL pública permanente.
- Se storage não estiver configurado, retornar `503 STORAGE_NOT_CONFIGURED`.

## Erros
- 400 `config_json inválido`
- 400 `status inválido`
- 403 sem permissão
- 404 `SNAPSHOT_NOT_FOUND`
- 503 `STORAGE_NOT_CONFIGURED`

## DOR
- Modelo de dados definido
- API confirmada

## DOD
- ROI persistida e publicada
- Linha virtual disponível no editor admin
- Worker do edge consumindo `lines` para fluxo entrada/saída
- Ownership explícito documentado por câmera/métrica

## Testes
- Criar draft
- Publicar com zona
- Upload de snapshot com permissão
- Viewer não consegue publicar ROI
