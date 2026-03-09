from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("edge", "0004_edge_event_minute_stats"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE public.traffic_metrics
              ADD COLUMN IF NOT EXISTS ownership text NULL,
              ADD COLUMN IF NOT EXISTS metric_type text NULL,
              ADD COLUMN IF NOT EXISTS roi_entity_id text NULL;

            ALTER TABLE public.conversion_metrics
              ADD COLUMN IF NOT EXISTS ownership text NULL,
              ADD COLUMN IF NOT EXISTS metric_type text NULL,
              ADD COLUMN IF NOT EXISTS roi_entity_id text NULL;
            """,
            reverse_sql="""
            ALTER TABLE public.traffic_metrics
              DROP COLUMN IF EXISTS ownership,
              DROP COLUMN IF EXISTS metric_type,
              DROP COLUMN IF EXISTS roi_entity_id;

            ALTER TABLE public.conversion_metrics
              DROP COLUMN IF EXISTS ownership,
              DROP COLUMN IF EXISTS metric_type,
              DROP COLUMN IF EXISTS roi_entity_id;
            """,
        ),
    ]
