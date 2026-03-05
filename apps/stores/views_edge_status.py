from datetime import datetime
import logging
import uuid
from django.core.exceptions import FieldDoesNotExist, FieldError
from django.test.testcases import DatabaseOperationForbidden
from django.db.utils import ProgrammingError, OperationalError
from django.db.models import Max
from django.db import connection
from django.utils import timezone
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Camera, CameraHealthLog, Store, OrgMember
from apps.cameras.permissions import get_user_role_for_store, ALLOWED_READ_ROLES
from apps.edge.models import EdgeEventReceipt
from apps.core.services.onboarding_progress import OnboardingProgressService

ONLINE_SEC = 120
DEGRADED_SEC = 300
EDGE_ONLINE_THRESHOLD_SECONDS = 90
CAMERA_HEALTH_RECENT_SECONDS = 120
_CAMERA_ACTIVE_COLUMN_EXISTS = None
logger = logging.getLogger(__name__)


def _user_has_store_access(user, store_id) -> bool:
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    role = get_user_role_for_store(user, str(store_id))
    return role in ALLOWED_READ_ROLES


def classify_age(dt):
    if not dt:
        return ("offline", None, "no_heartbeat")
    age = (timezone.now() - dt).total_seconds()
    if age <= ONLINE_SEC:
        return ("online", int(age), "recent_heartbeat")
    if age <= DEGRADED_SEC:
        return ("degraded", int(age), "stale_heartbeat")
    return ("offline", int(age), "heartbeat_expired")


def _health_recent_threshold(now=None):
    now = now or timezone.now()
    return now - timezone.timedelta(seconds=CAMERA_HEALTH_RECENT_SECONDS)


def _as_datetime(value):
    return value if isinstance(value, datetime) else None


def _empty_payload(store_id, reason: str, detail: str = None, ok: bool = False):
    payload = {
        "ok": ok,
        "online": False,
        "store_id": str(store_id),
        "connectivity_status": "offline",
        "connectivity_age_seconds": None,
        "pipeline_status": "no_data",
        "health_fresh_seconds": CAMERA_HEALTH_RECENT_SECONDS,
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
    if "online" not in payload:
        payload["online"] = status in ("online", "degraded", "online_no_cameras")
    connectivity_status = str(payload.get("connectivity_status") or "").lower()
    if not connectivity_status:
        connectivity_status = "online" if payload.get("online") else "offline"
    payload["connectivity_status"] = connectivity_status
    payload.setdefault("connectivity_age_seconds", payload.get("store_status_age_seconds"))
    payload.setdefault("pipeline_status", "no_data")
    payload.setdefault("health_fresh_seconds", CAMERA_HEALTH_RECENT_SECONDS)
    payload["last_heartbeat_at"] = payload.get("last_heartbeat_at") or heartbeat
    payload.setdefault("agent_id", None)
    payload.setdefault("version", None)
    return payload


def _parse_edge_ts(raw_ts):
    if not raw_ts:
        return None
    try:
        ts_str = str(raw_ts).replace("Z", "+00:00")
        dt = timezone.datetime.fromisoformat(ts_str)
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.utc)
        return dt
    except Exception:
        return None


def _get_last_edge_heartbeat_receipt(store_id):
    return (
        EdgeEventReceipt.objects
        .filter(event_name="edge_heartbeat", store_id=str(store_id))
        .order_by("-created_at")
        .first()
    )


def _get_edge_heartbeat_fallback(store_id):
    receipt = _get_last_edge_heartbeat_receipt(store_id)
    if not receipt:
        return (None, None, None)
    payload = receipt.payload or {}
    data = payload.get("data") or {}
    ts = _parse_edge_ts(data.get("ts") or payload.get("ts"))
    agent_id = data.get("agent_id") or payload.get("agent_id")
    version = data.get("version") or payload.get("version")
    return (ts, agent_id, version)


def compute_store_edge_status_snapshot(store_id):
    store = Store.objects.filter(id=store_id).first()
    if not store:
        return (_empty_payload(store_id, "store_not_found"), "store_not_found")

    try:
        now = timezone.now()
        recent_threshold = _health_recent_threshold(now)
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
        max_camera_last_seen = None
        max_health_ts = None
        camera_ids = [str(cam.id) for cam in cameras]
        latest_health_map = _get_latest_camera_health_map(camera_ids)
        for cam in cameras:
            cameras_total += 1
            last_ts = _as_datetime(getattr(cam, "last_seen_at", None))
            if last_ts and (max_camera_last_seen is None or last_ts > max_camera_last_seen):
                max_camera_last_seen = last_ts
            last_log = latest_health_map.get(str(cam.id))
            log_ts = None
            if last_log is not None:
                log_ts = _as_datetime(
                    getattr(last_log, "checked_at", None) or getattr(last_log, "created_at", None)
                )
                if log_ts and (max_health_ts is None or log_ts > max_health_ts):
                    max_health_ts = log_ts

            if log_ts and log_ts >= recent_threshold:
                cam_age_seconds = int((now - log_ts).total_seconds())
                cam_status = getattr(last_log, "status", None) or "unknown"
                cam_reason = "health_recent"
                last_ts = log_ts
            else:
                if log_ts:
                    cam_age_seconds = int((now - log_ts).total_seconds())
                    cam_status = "offline"
                    cam_reason = "health_stale"
                else:
                    cam_status = "unknown"
                    cam_reason = "no_recent_health"
                    if last_ts:
                        cam_age_seconds = int((now - last_ts).total_seconds())
                    else:
                        cam_age_seconds = None

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
                    "last_snapshot_url": cam.last_snapshot_url,
                    "camera_last_heartbeat_ts": last_ts.isoformat() if last_ts else None,
                    "status": cam_status,
                    "age_seconds": cam_age_seconds,
                    "reason": cam_reason,
                }
            )

        edge_heartbeat_at, edge_agent_id, edge_version = _get_edge_heartbeat_fallback(store_id)
        edge_online = False
        edge_age_seconds = None
        if edge_heartbeat_at:
            edge_age_seconds = int((timezone.now() - edge_heartbeat_at).total_seconds())
            edge_online = edge_age_seconds <= EDGE_ONLINE_THRESHOLD_SECONDS

        comm_candidates = [
            dt
            for dt in (
                _as_datetime(store.last_seen_at),
                max_camera_last_seen,
                max_health_ts,
                _as_datetime(edge_heartbeat_at),
            )
            if dt
        ]
        last_comm_at = max(comm_candidates) if comm_candidates else None
        comm_status, comm_age_seconds, comm_reason = classify_age(last_comm_at)
        connectivity_status = comm_status
        connectivity_age_seconds = comm_age_seconds

        if cameras_total == 0:
            store_status = "online_no_cameras" if comm_status in ("online", "degraded") else "offline"
            if comm_status in ("online", "degraded"):
                store_status_reason = "no_cameras"
            else:
                store_status_reason = comm_reason
            store_status_age_seconds = comm_age_seconds
            pipeline_status = "no_data"
        elif cameras_online >= 1:
            if cameras_online < cameras_total:
                store_status = "degraded"
                store_status_reason = "partial_camera_coverage"
                pipeline_status = "healthy"
            else:
                store_status = "online"
                store_status_reason = "all_cameras_online"
                pipeline_status = "healthy"
        else:
            if comm_status in ("online", "degraded"):
                store_status = "offline"
                store_status_reason = "camera_health_stale"
                pipeline_status = "stale"
            else:
                store_status = comm_status
                store_status_reason = comm_reason
                pipeline_status = "no_data"

        if cameras_total != 0:
            store_status_age_seconds = min(camera_age_seconds) if camera_age_seconds else None
        last_error = None
        if store_status_reason != "all_cameras_online":
            last_error = _get_latest_error(store_id, recent_threshold=recent_threshold)
    except (ProgrammingError, OperationalError):
        return (_empty_payload(store.id, "db_unavailable", "db_unavailable"), "db_unavailable")
    except Exception as exc:
        request_id = uuid.uuid4().hex
        logger.exception("[EDGE_STATUS] unexpected_error store_id=%s request_id=%s", store_id, request_id)
        # Fallback: return minimal status so UI doesn't show "Nunca" when we have store.last_seen_at.
        try:
            fallback_last_comm = _as_datetime(store.last_seen_at)
            comm_status, comm_age_seconds, comm_reason = classify_age(fallback_last_comm)
            try:
                cameras_total = Camera.objects.filter(store_id=store_id, active=True).count()
            except FieldError:
                cameras_total = Camera.objects.filter(store_id=store_id).count()
            debug_error = f"{type(exc).__name__}: {exc}"
            payload = {
                "ok": False,
                "online": comm_status in ("online", "degraded"),
                "store_id": str(store.id),
                "connectivity_status": comm_status,
                "connectivity_age_seconds": comm_age_seconds,
                "pipeline_status": "no_data",
                "health_fresh_seconds": CAMERA_HEALTH_RECENT_SECONDS,
                "store_status": comm_status,
                "store_status_age_seconds": comm_age_seconds,
                "store_status_reason": "edge_status_fallback",
                "last_heartbeat": fallback_last_comm.isoformat() if fallback_last_comm else None,
                "last_comm_at": fallback_last_comm.isoformat() if fallback_last_comm else None,
                "last_heartbeat_at": fallback_last_comm.isoformat() if fallback_last_comm else None,
                "agent_id": None,
                "version": None,
                "cameras_total": cameras_total,
                "cameras_online": 0,
                "cameras_degraded": 0,
                "cameras_offline": 0,
                "cameras_unknown": cameras_total,
                "cameras": [],
                "last_metric_bucket": None,
                "last_error": None,
                "detail": "unexpected_error",
                "request_id": request_id,
                "debug_error": debug_error,
            }
            return (_with_stable_contract(payload), "edge_status_fallback")
        except Exception:
            return (_empty_payload(store.id, "unexpected_error", "unexpected_error"), "unexpected_error")

    payload = {
        "ok": True,
        "store_id": str(store.id),
        "connectivity_status": connectivity_status,
        "connectivity_age_seconds": connectivity_age_seconds,
        "pipeline_status": pipeline_status,
        "health_fresh_seconds": CAMERA_HEALTH_RECENT_SECONDS,
        "store_status": store_status,
        "store_status_age_seconds": store_status_age_seconds,
        "store_status_reason": store_status_reason,
        "last_heartbeat": last_comm_at.isoformat() if last_comm_at else None,
        "last_comm_at": last_comm_at.isoformat() if last_comm_at else None,
        "cameras_total": cameras_total,
        "cameras_online": cameras_online,
        "cameras_degraded": cameras_degraded,
        "cameras_offline": cameras_offline,
        "cameras_unknown": cameras_unknown,
        "cameras": cameras_out,
        "last_metric_bucket": None,
        "last_error": last_error,
    }
    if cameras_total == 0:
        payload["online"] = store_status in ("online_no_cameras", "online", "degraded")
        payload["last_heartbeat_at"] = last_comm_at.isoformat() if last_comm_at else None
        payload["agent_id"] = edge_agent_id
        payload["version"] = edge_version

    return (
        _with_stable_contract(payload),
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


def _get_latest_camera_health_map(camera_ids):
    if not camera_ids:
        return {}
    try:
        qs = (
            CameraHealthLog.objects
            .filter(camera_id__in=camera_ids)
            .order_by("camera_id", "-checked_at")
            .only("camera_id", "checked_at", "status", "error")
        )
    except (FieldError, FieldDoesNotExist, DatabaseOperationForbidden):
        try:
            qs = (
                CameraHealthLog.objects
                .filter(camera_id__in=camera_ids)
                .order_by("camera_id", "-created_at")
                .only("camera_id", "created_at", "status", "error")
            )
        except (FieldError, FieldDoesNotExist, DatabaseOperationForbidden):
            return {}

    latest = {}
    for row in qs:
        cid = str(getattr(row, "camera_id", None))
        if cid and cid not in latest:
            latest[cid] = row
    return latest


def _get_latest_error(store_id, *, recent_threshold=None):
    if recent_threshold is None:
        recent_threshold = _health_recent_threshold()
    try:
        camera_ids = _get_active_camera_ids(store_id)
        if not camera_ids:
            return None
        qs = CameraHealthLog.objects.filter(
            camera_id__in=camera_ids,
            error__isnull=False,
            checked_at__gte=recent_threshold,
        )
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
        qs = CameraHealthLog.objects.filter(
            camera_id__in=camera_ids,
            error__isnull=False,
            created_at__gte=recent_threshold,
        )
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
            qs = CameraHealthLog.objects.filter(
                camera__store_id=store_id,
                error__isnull=False,
                created_at__gte=recent_threshold,
            )
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
        debug_error = payload.pop("debug_error", None)
        if debug_error:
            if settings.DEBUG or getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False):
                if not payload.get("last_error"):
                    payload["last_error"] = debug_error
        if payload.get("online") and store:
            try:
                OnboardingProgressService(str(store.org_id)).complete_step(
                    "edge_connected",
                    meta={"store_id": str(store.id), "last_seen_at": payload.get("last_heartbeat_at")},
                )
            except Exception:
                pass
        return Response(payload, status=200)
