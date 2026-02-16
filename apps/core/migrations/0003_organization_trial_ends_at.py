from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_alertrule_auditlog_billingcustomer_camera_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="trial_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
