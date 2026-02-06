import os
from typing import List, Tuple

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.core.exceptions import FieldError
from django.db.utils import ProgrammingError, OperationalError
from django.utils import timezone

from apps.core.models import Store, Camera, NotificationLog
from apps.stores.views_edge_status import (
    classify_age,
    _get_last_heartbeat,
    _get_latest_camera_health,
)


ALERT_THRESHOLD_SECONDS = 5 * 60
ALERT_COOLDOWN_SECONDS = 15 * 60

_NOTIFICATION_LOGS_AVAILABLE = None


def _notification_logs_available() -> bool:
    global _NOTIFICATION_LOGS_AVAILABLE
    if _NOTIFICATION_LOGS_AVAILABLE is not None:
        return _NOTIFICATION_LOGS_AVAILABLE
    try:
        NotificationLog.objects.all().only("id")[:1]
        _NOTIFICATION_LOGS_AVAILABLE = True
    except Exception:
        _NOTIFICATION_LOGS_AVAILABLE = False
    return _NOTIFICATION_LOGS_AVAILABLE


def _get_recipients() -> List[str]:
    raw = (
        getattr(settings, "EDGE_ALERT_EMAIL_TO", None)
        or os.getenv("EDGE_ALERT_EMAIL_TO")
        or os.getenv("ALERT_EMAIL_TO")
    )
    if not raw:
        return []
    return [r.strip() for r in raw.replace(";", ",").split(",") if r.strip()]


def _send_email(subject: str, body: str, recipients: List[str]) -> Tuple[bool, str]:
    if not recipients:
        return False, "no_recipients"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(
        settings, "EMAIL_HOST_USER", None
    )
    if not from_email:
        from_email = "no-reply@localhost"
    try:
        send_mail(subject, body, from_email, recipients, fail_silently=False)
        return True, ""
    except Exception as exc:
        return False, str(exc)


def _cooldown_ok(store_id, alert_type: str) -> bool:
    if not _notification_logs_available():
        return True
    try:
        last = (
            NotificationLog.objects.filter(
                store_id=store_id,
                provider="edge_status",
                provider_message_id=alert_type,
            )
            .order_by("-sent_at")
            .first()
        )
        if not last or not last.sent_at:
            return True
        delta = (timezone.now() - last.sent_at).total_seconds()
        return delta >= ALERT_COOLDOWN_SECONDS
    except Exception:
        return True


def _log_notification(store: Store, alert_type: str, recipients: List[str], ok: bool, error: str):
    if not _notification_logs_available():
        return
    try:
        NotificationLog.objects.create(
            org_id=store.org_id,
            store_id=store.id,
            channel="email",
            destination=",".join(recipients) if recipients else None,
            provider="edge_status",
            status="sent" if ok else "failed",
            provider_message_id=alert_type,
            error=error or None,
            sent_at=timezone.now(),
        )
    except Exception:
        pass


def _get_active_cameras(store_id) -> List[Camera]:
    try:
        return list(
            Camera.objects.filter(store_id=store_id, active=True).order_by("name")
        )
    except FieldError:
        return list(Camera.objects.filter(store_id=store_id).order_by("name"))


class Command(BaseCommand):
    help = "Emite alertas de saúde do edge (tick único; agendar externamente)."

    def handle(self, *args, **options):
        try:
            stores = Store.objects.filter(status__in=["active", "trial"]).order_by("name")
        except Exception:
            stores = Store.objects.all().order_by("name")

        recipients = _get_recipients()

        for store in stores:
            cameras = _get_active_cameras(store.id)
            cameras_total = 0
            cameras_online = 0
            cameras_degraded = 0
            cameras_offline = 0
            cameras_unknown = 0
            camera_age_seconds = []
            offline_cameras = []

            for cam in cameras:
                cameras_total += 1
                last_log = _get_latest_camera_health(cam.id)
                last_ts = None
                if last_log is not None:
                    last_ts = getattr(last_log, "checked_at", None) or getattr(
                        last_log, "created_at", None
                    )

                cam_status, cam_age_seconds, cam_reason = classify_age(last_ts)

                if cam_status == "online":
                    cameras_online += 1
                elif cam_status == "degraded":
                    cameras_degraded += 1
                elif cam_status == "offline":
                    cameras_offline += 1
                else:
                    cameras_unknown += 1

                if cam_age_seconds is not None:
                    camera_age_seconds.append(cam_age_seconds)

                if (
                    cam_status == "offline"
                    and cam_age_seconds is not None
                    and cam_age_seconds >= ALERT_THRESHOLD_SECONDS
                ):
                    offline_cameras.append((cam, cam_age_seconds, cam_reason))

            last_heartbeat = _get_last_heartbeat(store.id)
            hb_status, hb_age_seconds, hb_reason = classify_age(last_heartbeat)

            if cameras_total == 0:
                store_status = "offline"
                store_status_reason = "no_cameras"
            elif cameras_online >= 1:
                if cameras_online < cameras_total:
                    store_status = "degraded"
                    store_status_reason = "partial_camera_coverage"
                else:
                    store_status = "online"
                    store_status_reason = "all_cameras_online"
            else:
                store_status = hb_status
                store_status_reason = hb_reason

            if last_heartbeat:
                store_status_age_seconds = hb_age_seconds
            else:
                store_status_age_seconds = (
                    min(camera_age_seconds) if camera_age_seconds else None
                )

            if (
                store_status in ("degraded", "offline")
                and store_status_age_seconds is not None
                and store_status_age_seconds >= ALERT_THRESHOLD_SECONDS
            ):
                alert_type = f"store_{store_status}"
                if _cooldown_ok(store.id, alert_type):
                    subject = f"[Edge] Store {store.name} {store_status}"
                    body = (
                        f"Store: {store.name} ({store.id})\n"
                        f"Status: {store_status}\n"
                        f"Reason: {store_status_reason}\n"
                        f"Age (s): {store_status_age_seconds}\n"
                        f"Last heartbeat: {last_heartbeat.isoformat() if last_heartbeat else None}\n"
                        f"Cameras: total={cameras_total} online={cameras_online} "
                        f"degraded={cameras_degraded} offline={cameras_offline} unknown={cameras_unknown}\n"
                    )
                    ok, err = _send_email(subject, body, recipients)
                    _log_notification(store, alert_type, recipients, ok, err)
                    if not ok:
                        self.stdout.write(f"[WARN] email failed for {alert_type}: {err}")

            if offline_cameras:
                alert_type = "camera_offline"
                if _cooldown_ok(store.id, alert_type):
                    subject = f"[Edge] Cameras offline - {store.name}"
                    lines = []
                    for cam, age_s, reason in offline_cameras:
                        lines.append(
                            f"- {cam.name} ({cam.id}) age_s={age_s} reason={reason}"
                        )
                    body = (
                        f"Store: {store.name} ({store.id})\n"
                        f"Offline cameras (>={ALERT_THRESHOLD_SECONDS}s):\n"
                        + "\n".join(lines)
                    )
                    ok, err = _send_email(subject, body, recipients)
                    _log_notification(store, alert_type, recipients, ok, err)
                    if not ok:
                        self.stdout.write(f"[WARN] email failed for {alert_type}: {err}")
