# Fluxo de Dados (Demo Mock)

## Objetivo
Permitir demo com dados sintéticos para a conta **visiondale2026@gmail.com** (Loja **Dale Vision**), alimentando as telas:
- `app/analytics`
- `app/alerts`

## Fluxo de Dados (pipeline)
1. **Edge / Mock** gera eventos e métricas.
2. **Banco (Supabase/Postgres)** recebe:
   - `traffic_metrics` (fluxo, permanência)
   - `conversion_metrics` (fila média, staff ativo, taxa de conversão)
   - `detection_events` (alertas)
3. **Backend** expõe:
   - `GET /api/v1/stores/:id/metrics/summary`
   - `GET /alerts/events`
4. **Frontend** consome:
   - `app/analytics` → métricas + séries + distribuição por zona
   - `app/alerts` → lista de eventos

## Tabelas envolvidas
- `stores` → loja demo
- `org_members` → vínculo do usuário com a org
- `store_zones` → zonas para distribuição
- `cameras` → base para eventos
- `traffic_metrics` → visitantes + permanência
- `conversion_metrics` → fila e conversão
- `detection_events` → alertas
- `alert_rules` → regras simuladas

## Seed de Demo
Comando:
```bash
python manage.py seed_demo_data \
  --email visiondale2026@gmail.com \
  --store-name "Dale Vision" \
  --days 7 \
  --clear
```

## O que o seed gera
- Usuário demo + vínculo na org da store.
- 3 zonas padrão (Entrada, Balcão, Salão).
- 3 câmeras padrão.
- Métricas de **7 dias**, por hora.
- Alertas abertos (fila alta, ocupação alta, câmera offline).

## Notas
- O seed é idempotente (com `--clear` limpa dados antigos).
- Serve apenas para demo/controlado.
