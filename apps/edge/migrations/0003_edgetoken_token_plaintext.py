from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("edge", "0002_edgetoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="edgetoken",
            name="token_plaintext",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
