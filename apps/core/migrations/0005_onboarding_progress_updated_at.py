from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0004_merge_0003_organization_trial_ends_at_0003_storemanager"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE public.onboarding_progress
            ADD COLUMN IF NOT EXISTS updated_at timestamptz;
            UPDATE public.onboarding_progress
            SET updated_at = COALESCE(updated_at, created_at, now());
            """,
            reverse_sql="""
            ALTER TABLE public.onboarding_progress
            DROP COLUMN IF EXISTS updated_at;
            """,
        )
    ]
