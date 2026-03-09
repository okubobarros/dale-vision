# Matriz de Ownership de Métricas

## Objetivo
Definir qual câmera é dona de cada métrica operacional para evitar duplicação entre visões sobrepostas.

## Princípio
Uma métrica física deve ter **uma câmera dona**. Câmeras adicionais podem existir como apoio, mas não entram no agregado principal.

## Matriz v1

| Métrica | Câmera recomendada | ROI | Shape | Payload mínimo |
|---|---|---|---|---|
| Entradas | `entrada` | `linha_entrada_principal` | `line` | `traffic.entries`, `traffic.zone_id`, `traffic.roi_entity_id`, `traffic.metric_type=entry_exit` |
| Saídas | `entrada` | `linha_entrada_principal` | `line` | `traffic.exits`, `traffic.zone_id`, `traffic.roi_entity_id`, `traffic.metric_type=entry_exit` |
| Fluxo líquido | `entrada` | `linha_entrada_principal` | `line` | derivado de `entries - exits` |
| Fila média | `balcao` | `area_atendimento_fila` | `poly` | `conversion.queue_avg_seconds`, `conversion.zone_id`, `conversion.roi_entity_id`, `conversion.metric_type=queue` |
| Checkout proxy | `balcao` | `ponto_pagamento` | `poly` | `conversion.checkout_events`, `conversion.conversion_method=checkout_proxy`, `conversion.metric_type=checkout_proxy` |
| Equipe ativa | `balcao` | `zona_funcionario_caixa` | `poly` | `conversion.staff_active_est`, `conversion.metric_type=checkout_proxy` |
| Ocupação salão | `salao` | `area_consumo` | `poly` | `traffic.footfall|occupancy`, `traffic.metric_type=occupancy` |

## Regras operacionais
- `ownership=primary`: câmera dona da métrica e fonte oficial do dashboard.
- `ownership=secondary`: câmera de apoio, usada para diagnóstico e calibração, não para soma oficial.
- Não somar métricas da mesma categoria entre duas câmeras com FOV sobreposto sem dedupe multi-câmera explícito.

## Padrão de naming
- Entrada: `linha_entrada_principal`
- Balcão: `area_atendimento_fila`, `ponto_pagamento`, `zona_funcionario_caixa`
- Salão: `area_consumo`, `mesa_01`, `mesa_02`, `espera_salao`

## Responsabilidade do admin
- escolher a câmera dona por métrica
- desenhar o ROI semanticamente correto
- validar amostra manual antes de publicar
- revisar ROI após mudança física, lente, altura ou layout
