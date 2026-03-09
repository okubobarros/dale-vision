# ROI v2 Schema

## Objetivo
Padronizar o contrato entre editor admin, edge-agent e backend para métricas operacionais confiáveis e auditáveis.

## Estrutura

```json
{
  "schema_version": "roi.v2",
  "roi_version": 12,
  "status": "published",
  "image": { "width": 1920, "height": 1080 },
  "zones": [
    {
      "id": "roi-queue-1",
      "roi_entity_id": "roi-queue-1",
      "name": "area_atendimento_fila",
      "type": "poly",
      "metric_type": "queue",
      "ownership": "primary",
      "zone_id": "uuid-opcional",
      "points": [{ "x": 0.11, "y": 0.28 }]
    }
  ],
  "lines": [
    {
      "id": "roi-entry-line-1",
      "roi_entity_id": "roi-entry-line-1",
      "name": "linha_entrada_principal",
      "type": "line",
      "metric_type": "entry_exit",
      "ownership": "primary",
      "zone_id": "uuid-opcional",
      "points": [{ "x": 0.48, "y": 0.08 }, { "x": 0.49, "y": 0.94 }]
    }
  ],
  "ownership_matrix": [
    {
      "camera_id": "camera-uuid",
      "roi_entity_id": "roi-entry-line-1",
      "metric_type": "entry_exit",
      "shape_type": "line",
      "ownership": "primary"
    }
  ]
}
```

## Regras
- `line` é obrigatório para entrada/saída.
- `poly` é o formato padrão para fila, checkout proxy e ocupação.
- `rect` é permitido apenas quando a área física é simples e a perspectiva não distorce muito.
- `metric_type` é obrigatório e define a semântica operacional.
- `ownership` é obrigatório para permitir agregação segura.

## Payload de métricas esperado
- `traffic.zone_id`
- `traffic.roi_entity_id`
- `traffic.metric_type`
- `conversion.zone_id`
- `conversion.roi_entity_id`
- `conversion.metric_type`
- `conversion.conversion_method="checkout_proxy"` enquanto não houver POS

## Compatibilidade
- ROI antigos (`zones` apenas) continuam legíveis.
- Worker deve inferir defaults quando `metric_type`/`ownership` estiverem ausentes.
