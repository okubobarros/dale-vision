from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("edge", "0003_edgetoken_token_plaintext"),
    ]

    operations = [
        migrations.CreateModel(
            name="EdgeEventMinuteStats",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("store_id", models.UUIDField(db_index=True)),
                ("event_name", models.CharField(db_index=True, max_length=64)),
                ("minute_bucket", models.DateTimeField(db_index=True)),
                ("count", models.IntegerField(default=0)),
                ("last_event_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                "db_table": "edge_event_minute_stats",
                "unique_together": {("store_id", "event_name", "minute_bucket")},
            },
        ),
    ]
