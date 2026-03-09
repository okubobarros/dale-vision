from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("edge", "0005_metric_governance_columns"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS public.vision_atomic_events (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              receipt_id text UNIQUE NOT NULL,
              event_type text NOT NULL,
              store_id uuid NOT NULL,
              camera_id text NULL,
              camera_role text NULL,
              zone_id text NULL,
              roi_entity_id text NULL,
              roi_version text NULL,
              metric_type text NULL,
              ownership text NULL,
              direction text NULL,
              count_value integer NOT NULL DEFAULT 1,
              staff_active_est integer NULL,
              duration_seconds integer NULL,
              confidence numeric NULL,
              track_id_hash text NULL,
              ts timestamptz NOT NULL,
              raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
              created_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE INDEX IF NOT EXISTS idx_vision_atomic_events_store_ts
              ON public.vision_atomic_events (store_id, ts DESC);

            CREATE INDEX IF NOT EXISTS idx_vision_atomic_events_camera_ts
              ON public.vision_atomic_events (camera_id, ts DESC);
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS public.vision_atomic_events;
            """,
        ),
    ]
