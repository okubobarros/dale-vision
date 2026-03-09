from django.db import migrations, models
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("edge", "0008_alter_edgeeventminutestats_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="StoreCalibrationRun",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("store_id", models.UUIDField(db_index=True)),
                ("camera_id", models.UUIDField(db_index=True)),
                ("metric_type", models.CharField(db_index=True, max_length=64)),
                ("roi_version", models.CharField(blank=True, max_length=32, null=True)),
                ("manual_sample_size", models.IntegerField(blank=True, null=True)),
                ("manual_reference_value", models.FloatField(blank=True, null=True)),
                ("system_value", models.FloatField(blank=True, null=True)),
                ("error_pct", models.FloatField(blank=True, null=True)),
                ("approved_by", models.UUIDField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, null=True)),
                ("status", models.CharField(default="approved", max_length=32)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                "db_table": "store_calibration_runs",
                "indexes": [
                    models.Index(fields=["store_id", "camera_id", "metric_type", "-approved_at"], name="store_calib_store_i_ef7f5f_idx"),
                ],
            },
        ),
    ]
