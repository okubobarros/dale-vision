from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0006_support_access"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserSalesGoal",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("month", models.CharField(max_length=7)),
                ("target_revenue", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("currency", models.CharField(default="BRL", max_length=3)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "user",
                    models.ForeignKey(
                        db_column="user_id",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sales_goals",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "user_sales_goals",
                "managed": True,
            },
        ),
        migrations.AddConstraint(
            model_name="usersalesgoal",
            constraint=models.UniqueConstraint(fields=("user", "month"), name="uniq_user_sales_goal_month"),
        ),
        migrations.AddIndex(
            model_name="usersalesgoal",
            index=models.Index(fields=["user", "month"], name="user_sales_goal_user_month_idx"),
        ),
    ]
