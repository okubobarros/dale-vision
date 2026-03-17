from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("copilot", "0003_actionoutcome_valueledgerdaily"),
    ]

    operations = [
        migrations.AddField(
            model_name="actionoutcome",
            name="delivery_error",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="actionoutcome",
            name="delivery_status",
            field=models.CharField(blank=True, db_index=True, max_length=32, null=True),
        ),
        migrations.AddField(
            model_name="actionoutcome",
            name="delivered_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="actionoutcome",
            name="failed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="actionoutcome",
            name="provider_message_id",
            field=models.CharField(blank=True, db_index=True, max_length=128, null=True),
        ),
    ]
