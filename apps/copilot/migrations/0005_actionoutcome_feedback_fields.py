from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("copilot", "0004_actionoutcome_delivery_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="actionoutcome",
            name="outcome_comment",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="actionoutcome",
            name="outcome_status",
            field=models.CharField(
                blank=True,
                choices=[("resolved", "resolved"), ("partial", "partial"), ("not_resolved", "not_resolved")],
                db_index=True,
                max_length=24,
                null=True,
            ),
        ),
    ]

