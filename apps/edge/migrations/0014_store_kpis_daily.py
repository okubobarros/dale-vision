from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("edge", "0013_edgeupdateevent_idempotency_key_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS public.store_kpis_daily (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              org_id uuid NOT NULL,
              store_id uuid NOT NULL,
              business_date date NOT NULL,
              flow_in_total integer NULL,
              flow_out_total integer NULL,
              transactions_total integer NULL,
              conversion_rate numeric NULL,
              avg_ticket numeric NULL,
              queue_wait_peak numeric NULL,
              queue_loss_estimated numeric NULL,
              idle_cost_estimated numeric NULL,
              money_at_risk numeric NULL,
              alerts_total integer NULL,
              useful_alert_rate numeric NULL,
              method_version varchar(64) NOT NULL DEFAULT 'store_kpis_daily_v1_2026-03-19',
              inputs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              UNIQUE(store_id, business_date)
            );

            CREATE INDEX IF NOT EXISTS idx_store_kpis_daily_org_store_date
              ON public.store_kpis_daily (org_id, store_id, business_date DESC);
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS public.store_kpis_daily;
            """,
        ),
    ]
