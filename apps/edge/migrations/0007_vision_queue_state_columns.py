from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("edge", "0006_vision_atomic_events"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE public.vision_atomic_events
            ADD COLUMN IF NOT EXISTS staff_active_est integer NULL;
            """,
            reverse_sql="""
            ALTER TABLE public.vision_atomic_events
            DROP COLUMN IF EXISTS staff_active_est;
            """,
        ),
    ]
