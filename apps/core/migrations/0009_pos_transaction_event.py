from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0008_sales_goal_days_mode_and_pdv_interest"),
    ]

    operations = [
        migrations.CreateModel(
            name="PosTransactionEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("source_system", models.CharField(max_length=64)),
                ("transaction_id", models.CharField(max_length=128)),
                ("occurred_at", models.DateTimeField()),
                ("gross_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("net_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("currency", models.CharField(default="BRL", max_length=3)),
                ("payment_method", models.CharField(blank=True, max_length=32, null=True)),
                ("raw_payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "org",
                    models.ForeignKey(
                        db_column="org_id",
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="pos_transaction_events",
                        to="core.organization",
                    ),
                ),
                (
                    "store",
                    models.ForeignKey(
                        db_column="store_id",
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="pos_transaction_events",
                        to="core.store",
                    ),
                ),
            ],
            options={
                "db_table": "pos_transaction_events",
                "managed": True,
            },
        ),
        migrations.AddConstraint(
            model_name="postransactionevent",
            constraint=models.UniqueConstraint(
                fields=("store", "source_system", "transaction_id"),
                name="uniq_pos_transaction_store_source_tx",
            ),
        ),
        migrations.AddIndex(
            model_name="postransactionevent",
            index=models.Index(fields=["org", "occurred_at"], name="pos_tx_org_occ_idx"),
        ),
        migrations.AddIndex(
            model_name="postransactionevent",
            index=models.Index(fields=["store", "occurred_at"], name="pos_tx_store_occ_idx"),
        ),
        migrations.AddIndex(
            model_name="postransactionevent",
            index=models.Index(fields=["source_system", "occurred_at"], name="pos_tx_source_occ_idx"),
        ),
    ]
