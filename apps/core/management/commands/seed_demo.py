import uuid

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.core import models


class Command(BaseCommand):
    help = "Seed demo data for an organization, store, zones, and camera."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--org-name", dest="org_name")
        parser.add_argument("--store-name", dest="store_name")
        parser.add_argument("--store-code", dest="store_code")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        username = options["username"]
        org_name = options.get("org_name") or f"Demo {username}"
        store_name = options.get("store_name") or f"Store {username}"
        store_code = options.get("store_code")
        dry_run = options["dry_run"]

        now = timezone.now()
        user_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"dalevision:user:{username}")

        if dry_run:
            self.stdout.write("dry-run: no changes will be committed")

        def log_result(kind, created, detail):
            if created:
                prefix = "[dry-run] would create" if dry_run else "created"
            else:
                prefix = "found"
            self.stdout.write(f"{prefix} {kind}: {detail}")

        with transaction.atomic():
            org, org_created = models.Organization.objects.get_or_create(
                name=org_name,
                defaults={"created_at": now},
            )
            log_result("Organization", org_created, f"name={org.name} id={org.id}")

            member, member_created = models.OrgMember.objects.get_or_create(
                org=org,
                user_id=user_uuid,
                defaults={"role": "owner", "created_at": now},
            )
            log_result(
                "OrgMember",
                member_created,
                f"org_id={org.id} user_id={user_uuid} id={member.id}",
            )

            store_lookup = {"org": org}
            if store_code:
                store_lookup["code"] = store_code
            else:
                store_lookup["name"] = store_name

            store, store_created = models.Store.objects.get_or_create(
                **store_lookup,
                defaults={
                    "name": store_name,
                    "code": store_code,
                    "status": "trial",
                    "trial_started_at": now,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            log_result("Store", store_created, f"name={store.name} id={store.id}")

            entrance_zone, entrance_created = models.StoreZone.objects.get_or_create(
                store=store,
                name="Entrada",
                defaults={
                    "zone_type": "entrance",
                    "is_critical": True,
                    "created_at": now,
                },
            )
            log_result(
                "StoreZone",
                entrance_created,
                f"store_id={store.id} name=Entrada id={entrance_zone.id}",
            )

            checkout_zone, checkout_created = models.StoreZone.objects.get_or_create(
                store=store,
                name="Checkout 1",
                defaults={
                    "zone_type": "checkout",
                    "is_critical": True,
                    "created_at": now,
                },
            )
            log_result(
                "StoreZone",
                checkout_created,
                f"store_id={store.id} name=Checkout 1 id={checkout_zone.id}",
            )

            camera, camera_created = models.Camera.objects.get_or_create(
                store=store,
                name="Cam Entrada",
                defaults={
                    "zone": entrance_zone,
                    "onvif": True,
                    "status": "unknown",
                    "created_at": now,
                    "updated_at": now,
                },
            )
            log_result(
                "Camera",
                camera_created,
                f"store_id={store.id} zone_id={entrance_zone.id} name=Cam Entrada id={camera.id}",
            )

            if dry_run:
                transaction.set_rollback(True)
