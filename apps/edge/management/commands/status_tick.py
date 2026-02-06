from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import Store, Camera
from apps.stores.views_edge_status import compute_store_edge_status_snapshot
from apps.edge.status_events import emit_store_status_changed, emit_camera_status_changed, _latest_status_event_for_store, _latest_status_event_for_camera


class Command(BaseCommand):
    help = "Computa status (store/camera), detecta transições e emite eventos para n8n (offline sem ingest)."

    def add_arguments(self, parser):
        parser.add_argument("--store-id", type=str, default=None)

    def handle(self, *args, **opts):
        store_id = opts.get("store_id")

        stores = Store.objects.all()
        if store_id:
            stores = stores.filter(id=store_id)

        for store in stores:
            snapshot, _ = compute_store_edge_status_snapshot(str(store.id))

            # --- Store transition ---
            last = _latest_status_event_for_store(str(store.id))
            prev_status = None
            if last and isinstance(last, dict):
                prev_status = ((last.get("data") or {}).get("current_status")) or None

            curr_status = snapshot.get("store_status")
            if prev_status and curr_status and prev_status != curr_status:
                emit_store_status_changed(
                    store=store,
                    prev_status=prev_status,
                    new_status=curr_status,
                    snapshot=snapshot,
                    meta={"source": "tick", "ts": timezone.now().isoformat()},
                )

            # --- Camera transitions ---
            for cam in Camera.objects.filter(store_id=store.id, active=True):
                cam_row = None
                for c in snapshot.get("cameras") or []:
                    if str(c.get("camera_id")) == str(cam.id):
                        cam_row = c
                        break
                if not cam_row:
                    continue

                curr_cam = cam_row.get("status")
                lastc = _latest_status_event_for_camera(str(cam.id))
                prev_cam = None
                if lastc and isinstance(lastc, dict):
                    prev_cam = ((lastc.get("data") or {}).get("current_status")) or None

                if prev_cam and curr_cam and prev_cam != curr_cam:
                    emit_camera_status_changed(
                        store=store,
                        camera=cam,
                        prev_status=prev_cam,
                        new_status=curr_cam,
                        reason=cam_row.get("reason") or "status_changed",
                        age_seconds=cam_row.get("age_seconds"),
                        last_heartbeat_ts=snapshot.get("last_heartbeat"),
                        meta={"source": "tick", "ts": timezone.now().isoformat()},
                    )

        self.stdout.write(self.style.SUCCESS("status_tick done"))
