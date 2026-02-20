from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("cameras", "0001_camera_roi_health"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="cameraroiconfig",
            options={"managed": False, "db_table": "camera_roi_configs"},
        ),
        migrations.AlterModelOptions(
            name="camerahealth",
            options={"managed": False, "db_table": "camera_health"},
        ),
        migrations.AlterModelOptions(
            name="camerasnapshot",
            options={"managed": False, "db_table": "camera_snapshots"},
        ),
    ]
