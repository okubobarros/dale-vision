from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone

from apps.core.models import (
    AlertRule,
    Camera,
    DetectionEvent,
    OrgMember,
    Store,
    StoreZone,
)
from apps.stores.services.user_uuid import ensure_user_uuid


class Command(BaseCommand):
    help = "Cria dados mock para demo (metrics + alerts) para uma store."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Email do usuário demo")
        parser.add_argument("--store-id", help="UUID da store demo")
        parser.add_argument("--store-name", default="Dale Vision", help="Nome da store demo")
        parser.add_argument("--days", type=int, default=7, help="Dias de histórico")
        parser.add_argument("--seed", type=int, default=42, help="Seed do gerador aleatório")
        parser.add_argument("--clear", action="store_true", help="Apagar dados antigos da store")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        store_id = options.get("store_id")
        store_name = options.get("store_name")
        days = int(options.get("days") or 7)
        seed = int(options.get("seed") or 42)
        clear = bool(options.get("clear"))

        store = None
        if store_id:
            store = Store.objects.filter(id=store_id).first()
        if not store and store_name:
            store = Store.objects.filter(name__iexact=store_name).first()
        if not store:
            raise RuntimeError("Store demo não encontrada.")

        User = get_user_model()
        user = User.objects.filter(email=email).first()
        if not user:
            user = User.objects.create(
                username=email,
                email=email,
                is_active=True,
            )
            user.set_unusable_password()
            user.save()

        user_uuid = ensure_user_uuid(user)
        OrgMember.objects.get_or_create(
            org_id=store.org_id,
            user_id=user_uuid,
            defaults={"role": "owner", "created_at": timezone.now()},
        )

        zones = list(StoreZone.objects.filter(store_id=store.id))
        if not zones:
            now = timezone.now()
            zones = [
                StoreZone(id=uuid.uuid4(), store_id=store.id, name="Entrada", zone_type="entrada", created_at=now),
                StoreZone(id=uuid.uuid4(), store_id=store.id, name="Balcao", zone_type="balcao", created_at=now),
                StoreZone(id=uuid.uuid4(), store_id=store.id, name="Salao", zone_type="salao", created_at=now),
            ]
            StoreZone.objects.bulk_create(zones)

        cameras = list(Camera.objects.filter(store_id=store.id))
        if not cameras:
            now = timezone.now()
            cameras = [
                Camera(id=uuid.uuid4(), store_id=store.id, zone_id=zones[0].id, name="Entrada", created_at=now, updated_at=now),
                Camera(id=uuid.uuid4(), store_id=store.id, zone_id=zones[1].id, name="Balcao", created_at=now, updated_at=now),
                Camera(id=uuid.uuid4(), store_id=store.id, zone_id=zones[2].id, name="Salao", created_at=now, updated_at=now),
            ]
            Camera.objects.bulk_create(cameras)

        if clear:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM public.traffic_metrics WHERE store_id = %s", [str(store.id)])
                cursor.execute("DELETE FROM public.conversion_metrics WHERE store_id = %s", [str(store.id)])
            DetectionEvent.objects.filter(store_id=store.id).delete()
            AlertRule.objects.filter(store_id=store.id).delete()

        rng = random.Random(seed)
        tz = timezone.get_current_timezone()
        end = timezone.now().astimezone(tz)
        start = end - timedelta(days=days)

        traffic_rows = []
        conversion_rows = []

        # Dados horários
        current = start.replace(minute=0, second=0, microsecond=0)
        while current < end:
            hour = current.hour
            base = 5 if hour < 9 or hour > 21 else 20
            peak = 35 if hour in (11, 12, 13, 17, 18, 19) else 0

            total_footfall = 0
            for idx, zone in enumerate(zones):
                zone_factor = 1.0 if idx == 0 else (0.6 if idx == 1 else 0.8)
                footfall = int((base + peak + rng.randint(0, 12)) * zone_factor)
                dwell = int(rng.randint(120, 420))
                total_footfall += footfall
                traffic_rows.append(
                    (
                        str(uuid.uuid4()),
                        str(store.id),
                        str(zone.id),
                        current,
                        footfall,
                        int(footfall * 0.4),
                        dwell,
                        timezone.now(),
                    )
                )

            queue_avg = int(rng.randint(60, 240))
            staff_active = int(rng.randint(1, 3))
            conversion_rate = round(rng.uniform(2.0, 8.0), 2)
            conversion_rows.append(
                (
                    str(uuid.uuid4()),
                    str(store.id),
                    current,
                    conversion_rate,
                    queue_avg,
                    staff_active,
                    timezone.now(),
                )
            )

            current += timedelta(hours=1)

        with connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO public.traffic_metrics
                (id, store_id, zone_id, ts_bucket, footfall, engaged, dwell_seconds_avg, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (store_id, zone_id, ts_bucket)
                DO UPDATE SET
                  footfall = EXCLUDED.footfall,
                  engaged = EXCLUDED.engaged,
                  dwell_seconds_avg = EXCLUDED.dwell_seconds_avg
                """,
                traffic_rows,
            )
            cursor.executemany(
                """
                INSERT INTO public.conversion_metrics
                (id, store_id, ts_bucket, conversion_rate, queue_avg_seconds, staff_active_est, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (store_id, ts_bucket)
                DO UPDATE SET
                  conversion_rate = EXCLUDED.conversion_rate,
                  queue_avg_seconds = EXCLUDED.queue_avg_seconds,
                  staff_active_est = EXCLUDED.staff_active_est
                """,
                conversion_rows,
            )

        now = timezone.now()
        valid_event_types = []
        with connection.cursor() as cursor:
            try:
                cursor.execute(
                    "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'event_type'::regtype ORDER BY enumsortorder"
                )
                valid_event_types = [row[0] for row in cursor.fetchall()]
            except Exception:
                valid_event_types = []

        def pick_event_type(preferred: list[str], fallback: str) -> str:
            for name in preferred:
                if name in valid_event_types:
                    return name
            return valid_event_types[0] if valid_event_types else fallback

        event_type_queue = pick_event_type(
            ["queue_high", "queue_long", "queue_waiting", "queue_alert"],
            "store_status_changed",
        )
        event_type_occupancy = pick_event_type(
            ["occupancy_high", "occupancy_alert", "crowd_high"],
            "camera_status_changed",
        )
        event_type_camera = pick_event_type(
            ["camera_offline", "camera_status_changed", "camera_health"],
            "camera_status_changed",
        )

        events = [
            DetectionEvent(
                id=uuid.uuid4(),
                org_id=store.org_id,
                store_id=store.id,
                camera_id=cameras[0].id if cameras else None,
                zone_id=zones[0].id if zones else None,
                type=event_type_queue,
                severity="warning",
                status="open",
                title="Fila acima do esperado",
                description="Fila com tempo médio acima de 6 min.",
                occurred_at=now - timedelta(hours=2),
                created_at=now - timedelta(hours=2),
            ),
            DetectionEvent(
                id=uuid.uuid4(),
                org_id=store.org_id,
                store_id=store.id,
                camera_id=cameras[1].id if cameras else None,
                zone_id=zones[1].id if zones else None,
                type=event_type_occupancy,
                severity="info",
                status="open",
                title="Ocupação alta no salão",
                description="Ocupação acima de 80%.",
                occurred_at=now - timedelta(hours=5),
                created_at=now - timedelta(hours=5),
            ),
            DetectionEvent(
                id=uuid.uuid4(),
                org_id=store.org_id,
                store_id=store.id,
                camera_id=cameras[2].id if cameras else None,
                zone_id=zones[2].id if zones else None,
                type=event_type_camera,
                severity="critical",
                status="open",
                title="Câmera offline",
                description="Câmera sem sinal há 10 minutos.",
                occurred_at=now - timedelta(hours=9),
                created_at=now - timedelta(hours=9),
            ),
        ]
        DetectionEvent.objects.bulk_create(events)

        AlertRule.objects.get_or_create(
            store_id=store.id,
            zone_id=zones[1].id if zones else None,
            type=event_type_queue,
            defaults={
                "severity": "warning",
                "active": True,
                "threshold": {"queue_avg_seconds": 300},
                "channels": {"dashboard": True, "email": False, "whatsapp": False},
                "cooldown_minutes": 15,
                "created_at": now,
                "updated_at": now,
            },
        )
        AlertRule.objects.get_or_create(
            store_id=store.id,
            zone_id=zones[2].id if zones else None,
            type=event_type_occupancy,
            defaults={
                "severity": "info",
                "active": True,
                "threshold": {"occupancy_pct": 80},
                "channels": {"dashboard": True, "email": False, "whatsapp": False},
                "cooldown_minutes": 15,
                "created_at": now,
                "updated_at": now,
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo mock criado com sucesso."))
