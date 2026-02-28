# Dicionário de Métricas (v1)

## Visão geral
Este documento descreve as métricas operacionais disponíveis no produto hoje, suas fontes
de dados e a forma de cálculo usada nos relatórios e dashboards.

## Tráfego (traffic_metrics)

### total_visitors (Visitantes)
- **Fonte**: `traffic_metrics.footfall`
- **Cálculo**: soma de `footfall` no período filtrado.
- **Uso**: KPI principal de fluxo de pessoas.

### avg_dwell_seconds (Permanência média)
- **Fonte**: `traffic_metrics.dwell_seconds_avg`
- **Cálculo**: média simples de `dwell_seconds_avg` no período.
- **Observação**: representa permanência média por bucket, não por pessoa.

### engaged (Engajados)
- **Fonte**: `traffic_metrics.engaged`
- **Cálculo**: soma de `engaged` no período.
- **Status**: disponível na base; não exibido nos KPIs atuais.

## Conversão (conversion_metrics)

### avg_queue_seconds (Fila média)
- **Fonte**: `conversion_metrics.queue_avg_seconds`
- **Cálculo**: média simples de `queue_avg_seconds` no período.

### avg_conversion_rate (Conversão média)
- **Fonte**: `conversion_metrics.conversion_rate`
- **Cálculo**: média simples de `conversion_rate` no período.
- **Observação**: depende do método de conversão configurado no edge (ex.: checkout proxy).

### staff_active_est (Equipe ativa estimada)
- **Fonte**: `conversion_metrics.staff_active_est`
- **Cálculo**: média simples de `staff_active_est` no período.
- **Status**: disponível na base; não exibido nos KPIs atuais.

## Trial CEO Dashboard (derivadas)

### queue_now_seconds (Fila agora - segundos)
- **Fonte**: último bucket de `conversion_metrics.queue_avg_seconds`.
- **Cálculo**: usa o valor mais recente disponível (fallback 0).

### queue_now_people (Pessoas na fila agora - estimado)
- **Fonte**: `queue_now_seconds`.
- **Cálculo**: `round(queue_now_seconds / 30)` como proxy simples.
- **Observação**: estimativa MVP, não é contagem real.

### idle_index (Índice de ociosidade - estimado)
- **Fonte**: `conversion_metrics.staff_active_est`.
- **Cálculo**: normalização simples por hora: `1 - (staff_active_est / max_staff_active_est_no_periodo)`.
- **Observação**: proxy MVP sem CV; é exibido como estimativa.

## Relatório de Impacto (derivadas)

### idle_seconds_total (Ociosidade total - estimado)
- **Fonte**: `conversion_metrics.staff_active_est` + `traffic_metrics.footfall`.
- **Cálculo**: `idle_index_proxy * 3600` por bucket (proxy), somado no período.
- **Observação**: estimativa MVP; não representa tempo real de ociosidade.

### queue_wait_seconds_total (Tempo total de fila - estimado)
- **Fonte**: `conversion_metrics.queue_avg_seconds` + `traffic_metrics.footfall`.
- **Cálculo**: `queue_avg_seconds * footfall` por bucket, somado no período.
- **Observação**: aproximação para custo de fila.

### cost_idle (Custo de ociosidade - estimado)
- **Fonte**: `idle_seconds_total` e `stores.avg_hourly_labor_cost`.
- **Cálculo**: `(idle_seconds_total / 3600) * avg_hourly_labor_cost`.

### cost_queue (Custo de filas - estimado)
- **Fonte**: `queue_wait_seconds_total`, `stores.avg_hourly_labor_cost`, taxa de abandono por segmento.
- **Cálculo**: `(queue_wait_seconds_total / 3600) * avg_hourly_labor_cost * abandon_rate`.

### potential_monthly_estimated (Potencial mensal - estimado)
- **Fonte**: `cost_idle` + `cost_queue`.
- **Cálculo**: projeção para 30 dias com base no período solicitado.

## Alertas (detection_events)

### total_alerts (Total de alertas)
- **Fonte**: `detection_events`
- **Cálculo**: contagem de eventos no período filtrado.

### alert_counts_by_type (Alertas por tipo)
- **Fonte**: `detection_events.type`
- **Cálculo**: `COUNT(*)` por `type` no período filtrado.

## Saúde operacional (câmeras/edge)

### cameras_total
- **Fonte**: `cameras`
- **Cálculo**: contagem de câmeras por loja (ativas).

### cameras_online / cameras_offline
- **Fonte**: `cameras.status` ou `camera_health.last_seen_at`
- **Cálculo**: status calculado em tempo real no backend.

### edge_status
- **Fonte**: `stores.last_seen_at` + `stores.last_error`
- **Cálculo**: `online` se `last_seen_at` recente (janela de 15min), senão `offline`.

## Observações
- Todas as métricas respeitam **org → stores** (escopo multi‑loja).
- Respeitar timezone da organização ao calcular buckets.
