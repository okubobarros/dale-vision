from django.db import migrations, models
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("edge", "0010_rename_store_calib_store_i_ef7f5f_idx_store_calib_store_i_e2dfd7_idx"),
    ]

    operations = [
        migrations.CreateModel(
            name="EdgeUpdateEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("store_id", models.UUIDField(db_index=True)),
                ("agent_id", models.CharField(blank=True, max_length=64, null=True)),
                ("from_version", models.CharField(blank=True, max_length=64, null=True)),
                ("to_version", models.CharField(blank=True, max_length=64, null=True)),
                ("channel", models.CharField(blank=True, max_length=16, null=True)),
                ("status", models.CharField(db_index=True, max_length=32)),
                ("phase", models.CharField(blank=True, max_length=64, null=True)),
                ("event", models.CharField(db_index=True, max_length=64)),
                ("attempt", models.IntegerField(default=1)),
                ("elapsed_ms", models.IntegerField(blank=True, null=True)),
                ("reason_code", models.CharField(blank=True, max_length=64, null=True)),
                ("reason_detail", models.TextField(blank=True, null=True)),
                ("meta", models.JSONField(blank=True, default=dict)),
                ("timestamp", models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                "db_table": "edge_update_events",
            },
        ),
        migrations.CreateModel(
            name="EdgeUpdatePolicy",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("store_id", models.UUIDField(db_index=True, unique=True)),
                ("channel", models.CharField(choices=[("stable", "stable"), ("canary", "canary")], default="stable", max_length=16)),
                ("target_version", models.CharField(max_length=64)),
                ("current_min_supported", models.CharField(blank=True, max_length=64, null=True)),
                ("rollout_start_local", models.CharField(default="02:00", max_length=5)),
                ("rollout_end_local", models.CharField(default="05:00", max_length=5)),
                ("rollout_timezone", models.CharField(default="America/Sao_Paulo", max_length=64)),
                ("package_url", models.TextField()),
                ("package_sha256", models.CharField(max_length=128)),
                ("package_size_bytes", models.BigIntegerField(blank=True, null=True)),
                ("health_max_boot_seconds", models.IntegerField(default=120)),
                ("health_require_heartbeat_seconds", models.IntegerField(default=180)),
                ("health_require_camera_health_count", models.IntegerField(default=3)),
                ("rollback_enabled", models.BooleanField(default=True)),
                ("rollback_max_failed_attempts", models.IntegerField(default=1)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                "db_table": "edge_update_policies",
            },
        ),
        migrations.AddIndex(
            model_name="edgeupdateevent",
            index=models.Index(fields=["store_id", "-timestamp"], name="edge_update__store_i_6b90ee_idx"),
        ),
        migrations.AddIndex(
            model_name="edgeupdateevent",
            index=models.Index(fields=["store_id", "agent_id", "-timestamp"], name="edge_update__store_i_c3fb1c_idx"),
        ),
        migrations.AddIndex(
            model_name="edgeupdatepolicy",
            index=models.Index(fields=["store_id", "active", "-updated_at"], name="edge_update__store_i_004a0d_idx"),
        ),
    ]
