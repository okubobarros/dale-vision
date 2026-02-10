from django.core.exceptions import FieldError
from django.db.utils import ProgrammingError, OperationalError
from django.db.models import Max
from django.db import connection
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Camera, CameraHealthLog, Store, OrgMember

ONLINE_SEC = 120
DEGRADED_SEC = 300
_CAMERA_ACTIVE_COLUMN_EXISTS = None


def _user_has_store_access(user, store_id) -> bool:
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    store_row = Store.objects.filter(id=store_id).values("org_id").first()
    if not store_row:
        return False
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_uuid FROM public.user_id_map WHERE django_user_id = %s",
            [user.id],
        )
        row = cursor.fetchone()
        if row and row[0]:
            user_uuid = row[0]
        else:
            cursor.execute(
                "INSERT INTO public.user_id_map (django_user_id) VALUES (%s) RETURNING user_uuid",
                [user.id],
            )
            user_uuid = cursor.fetchone()[0]
    return OrgMember.objects.filter(
        org_id=store_row["org_id"],
        user_id=user_uuid,
    ).exists()


def classify_age(dt):
    if not dt:
        return ("offline", None, "no_heartbeat")
    age = (timezone.now() - dt).total_seconds()
    if age <= ONLINE_SEC:
        return ("online", int(age), "recent_heartbeat")
    if age <= DEGRADED_SEC:
        return ("degraded", int(age), "stale_heartbeat")
    return ("offline", int(age), "heartbeat_expired")


def _empty_payload(store_id, reason: str, detail: str = None, ok: bool = False):
    payload = {
        "ok": ok,
        "online": False,
        "store_id": str(store_id),
        "store_status": "offline",
        "store_status_age_seconds": None,
        "store_status_reason": reason,
        "last_heartbeat": None,
        "last_heartbeat_at": None,
        "agent_id": None,
        "version": None,
        "cameras_total": 0,
        "cameras_online": 0,
        "cameras_degraded": 0,
        "cameras_offline": 0,
        "cameras_unknown": 0,
        "cameras": [],
        "last_metric_bucket": None,
        "last_error": None,
    }
    if detail:
        payload["detail"] = detail
    return payload


def _with_stable_contract(payload: dict) -> dict:
    heartbeat = payload.get("last_heartbeat")
    status = str(payload.get("store_status") or "").lower()
    payload["ok"] = payload.get("ok", True)
    payload["online"] = status in ("online", "degraded") or bool(heartbeat)
    payload["last_heartbeat_at"] = payload.get("last_heartbeat_at") or heartbeat
    payload.setdefault("agent_id", None)
    payload.setdefault("version", None)
    return payload


def compute_store_edge_status_snapshot(store_id):
    store = Store.objects.filter(id=store_id).first()
    if not store:
        return (_empty_payload(store_id, "store_not_found"), "store_not_found")

    try:
        try:
            cameras = Camera.objects.filter(store_id=store_id, active=True).order_by("name")
        except FieldError:
            cameras = Camera.objects.filter(store_id=store_id).order_by("name")
        cameras_out = []
        cameras_total = 0
        cameras_online = 0
        cameras_degraded = 0
        cameras_offline = 0
        cameras_unknown = 0
        camera_age_seconds = []
        for cam in cameras:
            cameras_total += 1
            last_ts = getattr(cam, "last_seen_at", None)
            if not last_ts:
                last_log = _get_latest_camera_health(cam.id)
                if last_log is not None:
                    last_ts = getattr(last_log, "checked_at", None) or getattr(last_log, "created_at", None)

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

            cameras_out.append(
                {
                    "camera_id": str(cam.id),
                    "external_id": cam.external_id,
                    "name": cam.name,
                    "camera_last_heartbeat_ts": last_ts.isoformat() if last_ts else None,
                    "status": cam_status,
                    "age_seconds": cam_age_seconds,
                    "reason": cam_reason,
                }
            )

        last_heartbeat = _get_last_heartbeat(store_id)
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
            store_status_age_seconds = min(camera_age_seconds) if camera_age_seconds else None
        last_error = _get_latest_error(store_id)
        if not last_error:
            last_error = store.last_error
    except (ProgrammingError, OperationalError):
        return (_empty_payload(store.id, "db_unavailable", "db_unavailable"), "db_unavailable")
    except Exception:
        return (_empty_payload(store.id, "unexpected_error", "unexpected_error"), "unexpected_error")

    return (
        _with_stable_contract({
            "ok": True,
            "store_id": str(store.id),
            "store_status": store_status,
            "store_status_age_seconds": store_status_age_seconds,
            "store_status_reason": store_status_reason,
            "last_heartbeat": last_heartbeat.isoformat() if last_heartbeat else None,
            "cameras_total": cameras_total,
            "cameras_online": cameras_online,
            "cameras_degraded": cameras_degraded,
            "cameras_offline": cameras_offline,
            "cameras_unknown": cameras_unknown,
            "cameras": cameras_out,
            "last_metric_bucket": None,
            "last_error": last_error,
        }),
        None,
    )


def _camera_active_column_exists():
    global _CAMERA_ACTIVE_COLUMN_EXISTS
    if _CAMERA_ACTIVE_COLUMN_EXISTS is not None:
        return _CAMERA_ACTIVE_COLUMN_EXISTS
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "cameras")
        _CAMERA_ACTIVE_COLUMN_EXISTS = any(col.name == "active" for col in columns)
    except Exception:
        _CAMERA_ACTIVE_COLUMN_EXISTS = False
    return _CAMERA_ACTIVE_COLUMN_EXISTS


def _filter_active_health_qs(qs):
    if not _camera_active_column_exists():
        return qs
    try:
        return qs.filter(camera__active=True)
    except FieldError:
        return qs


def _get_active_camera_ids(store_id):
    try:
        return list(
            Camera.objects.filter(store_id=store_id, active=True)
            .values_list("id", flat=True)
        )
    except FieldError:
        return list(
            Camera.objects.filter(store_id=store_id)
            .values_list("id", flat=True)
        )


def _get_last_heartbeat(store_id):
    camera_ids = _get_active_camera_ids(store_id)
    if not camera_ids:
        return None

    try:
        last_ts = (
            Camera.objects
            .filter(id__in=camera_ids)
            .aggregate(last_ts=Max("last_seen_at"))
            .get("last_ts")
        )
    except Exception:
        last_ts = None

    if last_ts:
        return last_ts

    try:
        last_ts = (
            CameraHealthLog.objects
            .filter(camera_id__in=camera_ids)
            .aggregate(last_ts=Max("checked_at"))
            .get("last_ts")
        )
    except FieldError:
        last_ts = None

    if last_ts:
        return last_ts

    try:
        return (
            CameraHealthLog.objects
            .filter(camera_id__in=camera_ids)
            .aggregate(last_ts=Max("created_at"))
            .get("last_ts")
        )
    except FieldError:
        try:
            qs = CameraHealthLog.objects.filter(camera__store_id=store_id)
            qs = _filter_active_health_qs(qs)
            last_ts = qs.aggregate(last_ts=Max("created_at")).get("last_ts")
        except FieldError:
            last_ts = None
        return last_ts


def _get_latest_camera_health(camera_id):
    try:
        log = (
            CameraHealthLog.objects
            .filter(camera_id=camera_id)
            .order_by("-checked_at")
            .first()
        )
    except FieldError:
        log = None

    if log is not None:
        return log

    try:
        return (
            CameraHealthLog.objects
            .filter(camera_id=camera_id)
            .order_by("-created_at")
            .first()
        )
    except FieldError:
        return None


def _get_latest_error(store_id):
    try:
        camera_ids = _get_active_camera_ids(store_id)
        if not camera_ids:
            return None
        qs = CameraHealthLog.objects.filter(camera_id__in=camera_ids, error__isnull=False)
        last_error_row = (
            qs.exclude(error="")
            .order_by("-checked_at")
            .values("error")
            .first()
        )
        if last_error_row:
            return last_error_row["error"]
    except FieldError:
        pass

    try:
        camera_ids = _get_active_camera_ids(store_id)
        if not camera_ids:
            return None
        qs = CameraHealthLog.objects.filter(camera_id__in=camera_ids, error__isnull=False)
        last_error_row = (
            qs.exclude(error="")
            .order_by("-created_at")
            .values("error")
            .first()
        )
        if last_error_row:
            return last_error_row["error"]
    except FieldError:
        try:
            qs = CameraHealthLog.objects.filter(camera__store_id=store_id, error__isnull=False)
            qs = _filter_active_health_qs(qs)
            last_error_row = (
                qs.exclude(error="")
                .order_by("-created_at")
                .values("error")
                .first()
            )
            if last_error_row:
                return last_error_row["error"]
        except FieldError:
            pass

    return None


class StoreEdgeStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            payload, _reason = compute_store_edge_status_snapshot(store_id)
            return Response(payload, status=200)

        if not _user_has_store_access(request.user, store_id):
            return Response(
                _empty_payload(store.id, "forbidden", "Você não tem acesso a esta store."),
                status=200,
            )

        payload, _reason = compute_store_edge_status_snapshot(store_id)
        return Response(payload, status=200)
