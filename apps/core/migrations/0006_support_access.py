from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_onboarding_progress_updated_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="SupportAccessRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("requester_user_uuid", models.UUIDField()),
                ("requester_email", models.TextField(blank=True, null=True)),
                ("requester_name", models.TextField(blank=True, null=True)),
                ("reason", models.TextField(blank=True, null=True)),
                ("status", models.CharField(choices=[("pending", "pending"), ("granted", "granted"), ("closed", "closed"), ("rejected", "rejected")], default="pending", max_length=20)),
                ("requested_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("handled_at", models.DateTimeField(blank=True, null=True)),
                ("handled_by_user_uuid", models.UUIDField(blank=True, null=True)),
                ("handled_notes", models.TextField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("store", models.ForeignKey(db_column="store_id", on_delete=django.db.models.deletion.DO_NOTHING, related_name="support_requests", to="core.store")),
            ],
            options={
                "db_table": "support_access_requests",
                "managed": True,
            },
        ),
        migrations.CreateModel(
            name="SupportAccessGrant",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("user_uuid", models.UUIDField()),
                ("granted_by_user_uuid", models.UUIDField()),
                ("role", models.CharField(default="manager", max_length=20)),
                ("starts_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("expires_at", models.DateTimeField()),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("request", models.ForeignKey(blank=True, db_column="request_id", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="grants", to="core.supportaccessrequest")),
                ("store", models.ForeignKey(db_column="store_id", on_delete=django.db.models.deletion.DO_NOTHING, related_name="support_grants", to="core.store")),
            ],
            options={
                "db_table": "support_access_grants",
                "managed": True,
            },
        ),
        migrations.AddIndex(
            model_name="supportaccessrequest",
            index=models.Index(fields=["store", "status"], name="support_req_store_status_idx"),
        ),
        migrations.AddIndex(
            model_name="supportaccessrequest",
            index=models.Index(fields=["status", "requested_at"], name="support_req_status_reqat_idx"),
        ),
        migrations.AddIndex(
            model_name="supportaccessgrant",
            index=models.Index(fields=["store", "user_uuid", "active"], name="support_grant_store_user_idx"),
        ),
        migrations.AddIndex(
            model_name="supportaccessgrant",
            index=models.Index(fields=["expires_at"], name="support_grant_expires_idx"),
        ),
    ]
