from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0007_user_sales_goal"),
    ]

    operations = [
        migrations.AddField(
            model_name="usersalesgoal",
            name="days_mode",
            field=models.CharField(default="calendar", max_length=16),
        ),
        migrations.CreateModel(
            name="PdvIntegrationInterest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("pdv_system", models.CharField(max_length=64)),
                ("contact_email", models.EmailField(max_length=254)),
                ("contact_phone", models.CharField(blank=True, max_length=32, null=True)),
                ("status", models.CharField(default="requested", max_length=20)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "store",
                    models.ForeignKey(
                        db_column="store_id",
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="pdv_integration_interests",
                        to="core.store",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        db_column="user_id",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pdv_integration_interests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "pdv_integration_interests",
                "managed": True,
            },
        ),
        migrations.AddIndex(
            model_name="pdvintegrationinterest",
            index=models.Index(fields=["store", "created_at"], name="pdv_interest_store_created_idx"),
        ),
        migrations.AddIndex(
            model_name="pdvintegrationinterest",
            index=models.Index(fields=["user", "status"], name="pdv_interest_user_status_idx"),
        ),
    ]
