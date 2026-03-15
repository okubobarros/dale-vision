# apps/stores/views.py 
import logging
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import time
from django.core.cache import cache
from rest_framework import viewsets, status, permissions
from knox.auth import TokenAuthentication
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.response import Response
from django.http import Http404
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied as DjangoPermissionDenied, ValidationError as DjangoValidationError
from django.db.utils import ProgrammingError, OperationalError
from django.db import connection, DatabaseError
from django.utils import timezone
from django.conf import settings
from django.utils.dateparse import parse_datetime
from apps.core.models import Store, OrgMember, Organization, Camera, Employee, DetectionEvent, Subscription
from apps.edge.models import EdgeToken, StoreCalibrationRun
from apps.edge.auth import validate_store_token, EdgeAwareJWTAuthentication
from apps.cameras.limits import (
    enforce_trial_camera_limit,
    count_active_cameras,
    get_camera_limit_for_store,
    get_org_plan_code,
    PLAN_LIMITS,
)
from apps.core.services.onboarding_progress import OnboardingProgressService
from apps.core.services.journey_events import log_journey_event
from apps.cameras.permissions import (
    require_store_role,
    get_user_role_for_store,
    ALLOWED_MANAGE_ROLES,
    ALLOWED_READ_ROLES,
)
from apps.cameras.serializers import CameraSerializer
from apps.cameras.roi import get_latest_published_roi_config
from apps.billing.utils import (
    PaywallError,
    enforce_trial_store_limit,
)
from backend.utils.entitlements import enforce_can_use_product, require_trial_active
import hashlib
import secrets
import uuid
from urllib.parse import quote, urlparse, urlunparse
from .serializers import StoreSerializer, EmployeeSerializer
from apps.stores.services.user_uuid import ensure_user_uuid
from apps.stores.services.user_orgs import get_user_org_ids

logger = logging.getLogger(__name__)


def _build_metric_governance():
    return {
        "total_visitors": {
            "metric_status": "official",
            "source_method": "entry_camera_footfall",
            "ownership_mode": "single_camera_owner",
            "label": "Oficial",
        },
        "avg_dwell_seconds": {
            "metric_status": "estimated",
            "source_method": "bucket_average_dwell_proxy",
            "ownership_mode": "single_camera_owner",
            "label": "Estimativa",
        },
        "avg_queue_seconds": {
            "metric_status": "official",
            "source_method": "cashier_queue_primary_camera",
            "ownership_mode": "single_camera_owner",
            "label": "Oficial",
        },
        "avg_staff_active": {
            "metric_status": "official",
            "source_method": "cashier_staff_primary_camera",
            "ownership_mode": "single_camera_owner",
            "label": "Oficial",
        },
        "avg_conversion_rate": {
            "metric_status": "proxy",
            "source_method": "checkout_events_over_footfall",
            "ownership_mode": "single_camera_owner",
            "label": "Proxy",
        },
        "queue_now_people": {
            "metric_status": "estimated",
            "source_method": "last_bucket_queue_avg_seconds",
            "ownership_mode": "single_camera_owner",
            "label": "Estimativa",
        },
        "idle_index": {
            "metric_status": "estimated",
            "source_method": "staff_active_est_normalized",
            "ownership_mode": "single_camera_owner",
            "label": "Estimativa",
        },
        "zones": {
            "metric_status": "estimated",
            "source_method": "zone_traffic_without_cross_camera_dedupe",
            "ownership_mode": "single_camera_owner",
            "label": "Estimativa",
        },
    }

def _error_response(code: str, message: str, status_code: int, *, details=None, deprecated_detail=None):
    payload = {
        "code": code,
        "message": message,
    }
    if details is not None:
        payload["details"] = details
    if deprecated_detail:
        payload["detail"] = deprecated_detail
    return Response(payload, status=status_code)

def _mask_rtsp(value: str) -> str:
    if not value:
        return ""
    if "://" in value:
        scheme, _rest = value.split("://", 1)
        return f"{scheme}://***"
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}***{value[-3:]}"

def _resolved_rtsp_for_edge(camera: Camera) -> str:
    raw_rtsp = str(getattr(camera, "rtsp_url", "") or "").strip()
    username = str(getattr(camera, "username", "") or "").strip()
    password = str(getattr(camera, "password", "") or "").strip()
    ip = str(getattr(camera, "ip", "") or "").strip()

    if raw_rtsp:
        parsed = urlparse(raw_rtsp)
        if parsed.scheme and parsed.hostname:
            # Keep path/query from dashboard, but enforce current credentials if present.
            if username or password:
                auth_user = quote(username, safe="") if username else ""
                auth_pass = quote(password, safe="") if password else ""
                if auth_user and auth_pass:
                    auth = f"{auth_user}:{auth_pass}@"
                elif auth_user:
                    auth = f"{auth_user}@"
                elif auth_pass:
                    auth = f":{auth_pass}@"
                else:
                    auth = ""
                host = parsed.hostname or ""
                if parsed.port:
                    host = f"{host}:{parsed.port}"
                netloc = f"{auth}{host}"
                return urlunparse(parsed._replace(netloc=netloc))
            return raw_rtsp

    # Fallback for legacy rows where only ip/user/password are filled.
    if ip:
        host = ip
        if username or password:
            auth_user = quote(username, safe="") if username else ""
            auth_pass = quote(password, safe="") if password else ""
            if auth_user and auth_pass:
                auth = f"{auth_user}:{auth_pass}@"
            elif auth_user:
                auth = f"{auth_user}@"
            elif auth_pass:
                auth = f":{auth_pass}@"
            else:
                auth = ""
            return f"rtsp://{auth}{host}:554/stream"
        return f"rtsp://{host}:554/stream"

    return raw_rtsp


def _serialize_cameras_for_edge(cameras_qs) -> list[dict]:
    payload = []
    for camera in cameras_qs:
        rtsp_url = _resolved_rtsp_for_edge(camera)
        connection_type = "rtsp_direct" if rtsp_url else ("onvif" if getattr(camera, "onvif", False) else "unknown")
        payload.append(
            {
                "id": str(camera.id),
                "camera_id": str(camera.id),
                "store_id": str(camera.store_id) if getattr(camera, "store_id", None) else None,
                "zone_id": str(camera.zone_id) if getattr(camera, "zone_id", None) else None,
                "name": camera.name,
                "external_id": camera.external_id,
                "active": bool(getattr(camera, "active", True)),
                "status": camera.status,
                "brand": camera.brand,
                "model": camera.model,
                "onvif": bool(getattr(camera, "onvif", False)),
                "connection_type": connection_type,
                "ip": camera.ip,
                "username": camera.username,
                "password": camera.password,
                "rtsp_url": rtsp_url,
                "rtsp_url_masked": _mask_rtsp(rtsp_url) if rtsp_url else None,
                "updated_at": camera.updated_at.isoformat() if camera.updated_at else None,
            }
        )
    return payload


def _sanitize_camera_payload(payload):
    if not isinstance(payload, dict):
        return {}
    data = dict(payload)
    if "password" in data:
        data["password"] = "***"
    if "rtsp_url" in data and isinstance(data["rtsp_url"], str):
        data["rtsp_url"] = _mask_rtsp(data["rtsp_url"])
    return data

def _expire_trial_stores(qs, user=None):
    try:
        if user and (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False)):
            return
        now = timezone.now()
        expired_ids = list(
            qs.filter(
                status="trial",
                trial_ends_at__isnull=False,
                trial_ends_at__lt=now,
            ).values_list("id", flat=True)
        )
        if expired_ids:
            Store.objects.filter(id__in=expired_ids).update(
                status="blocked",
                blocked_reason="trial_expired",
                updated_at=now,
            )
    except Exception:
        logger.exception("[STORE] failed to expire trial stores")


def _apply_staff_trial_bypass(store: Store, data: dict, user) -> dict:
    if not user or not (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)):
        return data
    if data.get("status") == "blocked" and data.get("blocked_reason") == "trial_expired":
        data["status"] = "trial"
        data["blocked_reason"] = None
    return data

def filter_stores_for_user(qs, user):
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return qs
    org_ids = get_user_org_ids(user)
    if not org_ids:
        if settings.DEBUG:
            return qs
        return qs.none()
    return qs.filter(org_id__in=org_ids)

def _require_store_owner_or_admin(user, store):
    require_store_role(user, str(store.id), ALLOWED_MANAGE_ROLES)

def _camera_active_column_exists():
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "cameras")
        return any(col.name == "active" for col in columns)
    except Exception:
        return False

def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except Exception:
        return False

def _hash_edge_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def _validate_edge_token_for_store(store_id: str, provided: str) -> bool:
    if not provided or not store_id:
        return False
    token_hash = _hash_edge_token(provided)
    edge_token = EdgeToken.objects.filter(
        store_id=store_id,
        token_hash=token_hash,
        active=True,
    ).first()
    if edge_token:
        EdgeToken.objects.filter(id=edge_token.id).update(last_used_at=timezone.now())
        return True
    return False

def _get_active_edge_token(store_id):
    return (
        EdgeToken.objects.filter(store_id=store_id, active=True)
        .order_by("-created_at")
        .first()
    )

def _issue_edge_token(store_id):
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_edge_token(raw_token)
    token = EdgeToken.objects.create(
        store_id=store_id,
        token_hash=token_hash,
        token_plaintext=raw_token,
        active=True,
        created_at=timezone.now(),
    )
    return token, raw_token

def _rotate_edge_token(store_id):
    EdgeToken.objects.filter(store_id=store_id, active=True).update(active=False)
    return _issue_edge_token(store_id)

def _edge_token_meta(token_obj):
    if not token_obj:
        return {
            "has_active_token": False,
            "token_created_at": None,
            "token_last_used_at": None,
        }
    return {
        "has_active_token": True,
        "token_created_at": token_obj.created_at.isoformat() if token_obj.created_at else None,
        "token_last_used_at": token_obj.last_used_at.isoformat() if token_obj.last_used_at else None,
    }


def _resolve_cloud_base_url(request=None) -> str:
    configured = (
        (getattr(settings, "CLOUD_BASE_URL", None) or os.getenv("CLOUD_BASE_URL") or "")
        .strip()
        .rstrip("/")
    )
    if configured:
        return configured
    if request is not None:
        try:
            return request.build_absolute_uri("/").rstrip("/")
        except Exception:
            pass
    return ""


def _edge_debug_enabled() -> bool:
    raw = str(
        getattr(settings, "EDGE_DEBUG", None)
        or os.getenv("EDGE_DEBUG")
        or "0"
    ).strip().lower()
    return raw in ("1", "true", "yes", "on")


def _parse_dt(value: str | None, tz) -> datetime | None:
    if not value:
        return None
    dt = parse_datetime(value)
    if not dt:
        try:
            dt = datetime.fromisoformat(value)
        except Exception:
            return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, tz)
    return dt


def _get_org_timezone(store: Store):
    tz_name = None
    try:
        org = Organization.objects.filter(id=store.org_id).values("timezone").first()
        tz_name = org.get("timezone") if org else None
    except Exception:
        tz_name = None
    tz_name = tz_name or settings.TIME_ZONE
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return timezone.get_current_timezone()


VISION_CONFIDENCE_METRIC_RULES = {
    "entrada": [
        {"metric_key": "entry_exit", "event_type": "vision.crossing.v1", "target_events_24h": 20},
    ],
    "balcao": [
        {"metric_key": "queue", "event_type": "vision.queue_state.v1", "target_events_24h": 120},
        {"metric_key": "checkout_proxy", "event_type": "vision.checkout_proxy.v1", "target_events_24h": 10},
    ],
    "salao": [
        {"metric_key": "occupancy", "event_type": "vision.zone_occupancy.v1", "target_events_24h": 120},
    ],
}


def _infer_camera_role_from_roi_or_name(camera: Camera, roi_config: dict | None) -> str:
    config = roi_config or {}
    zones = config.get("zones") if isinstance(config, dict) else []
    lines = config.get("lines") if isinstance(config, dict) else []
    zone_names = {
        str((item or {}).get("name") or "").strip().lower()
        for item in (zones or [])
        if isinstance(item, dict)
    }
    if lines:
        return "entrada"
    if zone_names & {"fila", "area_atendimento_fila", "ponto_pagamento", "zona_funcionario_caixa"}:
        return "balcao"
    if zone_names & {"area_consumo", "salao", "mesa"}:
        return "salao"

    name = str(getattr(camera, "name", "") or "").lower()
    ext = str(getattr(camera, "external_id", "") or "").lower()
    if "caixa" in name or "caixa" in ext or "checkout" in name or "checkout" in ext:
        return "balcao"
    if "entrada" in name or "entrada" in ext:
        return "entrada"
    if "salao" in name or "salao" in ext:
        return "salao"
    return "unknown"


def _camera_operational_score(status_value: str) -> int:
    normalized = str(status_value or "unknown").lower()
    if normalized == "online":
        return 100
    if normalized == "degraded":
        return 65
    if normalized == "unknown":
        return 35
    return 10


def _freshness_score(last_event_at):
    if not last_event_at:
        return 0
    age_seconds = max(0, int((timezone.now() - last_event_at).total_seconds()))
    if age_seconds <= 30 * 60:
        return 100
    if age_seconds <= 6 * 3600:
        return 70
    if age_seconds <= 24 * 3600:
        return 40
    return 10


def _classify_confidence_status(coverage_score: int, confidence_score: int) -> str:
    if coverage_score >= 70 and confidence_score >= 70:
        return "pronto"
    if coverage_score >= 40 and confidence_score >= 40:
        return "parcial"
    return "recalibrar"


def _metric_display_label(metric_key: str) -> str:
    labels = {
        "entry_exit": "Fluxo de entrada/saida",
        "queue": "Fila",
        "checkout_proxy": "Checkout proxy",
        "occupancy": "Ocupacao",
    }
    return labels.get(metric_key, metric_key)


def _camera_role_playbook(camera_role: str) -> str:
    playbooks = {
        "entrada": "Validar direcao da linha, area de passagem e cobertura total da porta.",
        "balcao": "Validar zonas de fila, caixa e equipe; revisar oclusoes e campo de visao.",
        "salao": "Validar area de consumo, permanencia e cobertura da zona principal.",
    }
    return playbooks.get(camera_role, "Validar enquadramento, ROI publicada e saude operacional da camera.")


def _build_calibration_actions(cameras_out: list[dict]) -> tuple[list[dict], dict]:
    actions = []
    high_priority = 0
    medium_priority = 0
    for camera in cameras_out:
        for metric in camera.get("metrics") or []:
            if metric.get("status") == "pronto":
                continue
            reasons = metric.get("reasons") or []
            if "roi_not_published" in reasons:
                action_code = "publish_roi"
                title = "Publicar ROI da camera"
                description = "A metrica nao pode ser confiavel sem ROI publicada e versionada."
                priority = "alta"
            elif "camera_not_healthy" in reasons:
                action_code = "recover_camera_health"
                title = "Recuperar saude operacional da camera"
                description = "A camera precisa voltar a online ou degraded estavel antes de validar a metrica."
                priority = "alta"
            elif "stale_or_missing_events" in reasons:
                action_code = "inspect_event_pipeline"
                title = "Inspecionar pipeline de eventos"
                description = "Ha ausencia ou envelhecimento de eventos atomicos para a metrica nas ultimas horas."
                priority = "alta" if metric.get("events_24h", 0) == 0 else "media"
            else:
                action_code = "tune_roi_coverage"
                title = "Ajustar cobertura e calibracao"
                description = "A metrica esta viva, mas com volume insuficiente para cobertura confiavel."
                priority = "media"

            if priority == "alta":
                high_priority += 1
            else:
                medium_priority += 1

            actions.append(
                {
                    "camera_id": camera.get("camera_id"),
                    "camera_name": camera.get("camera_name"),
                    "camera_role": camera.get("camera_role"),
                    "camera_status": camera.get("camera_status"),
                    "metric_key": metric.get("metric_key"),
                    "metric_label": _metric_display_label(metric.get("metric_key") or ""),
                    "event_type": metric.get("event_type"),
                    "status": metric.get("status"),
                    "priority": priority,
                    "action_code": action_code,
                    "title": title,
                    "description": description,
                    "playbook_hint": _camera_role_playbook(str(camera.get("camera_role") or "")),
                    "reasons": reasons,
                    "coverage_score": metric.get("coverage_score"),
                    "confidence_score": metric.get("confidence_score"),
                    "events_24h": metric.get("events_24h"),
                    "roi_published": camera.get("roi_published"),
                    "roi_version": metric.get("roi_version") or camera.get("roi_version"),
                    "last_event_at": metric.get("last_event_at"),
                    "last_seen_at": camera.get("last_seen_at"),
                    "audit_filters": {
                        "camera_id": camera.get("camera_id"),
                        "event_type": metric.get("event_type"),
                    },
                }
            )

    actions.sort(
        key=lambda item: (
            0 if item["priority"] == "alta" else 1,
            0 if item["status"] == "recalibrar" else 1,
            item.get("camera_name") or "",
            item.get("metric_key") or "",
        )
    )
    return actions, {
        "actions_total": len(actions),
        "high_priority": high_priority,
        "medium_priority": medium_priority,
    }


def _get_latest_calibration_runs(store: Store, camera_ids: list[str]) -> dict[tuple[str, str], dict]:
    if not camera_ids:
        return {}
    rows = (
        StoreCalibrationRun.objects.filter(store_id=store.id, camera_id__in=camera_ids)
        .order_by("camera_id", "metric_type", "-approved_at", "-created_at")
        .values(
            "camera_id",
            "metric_type",
            "roi_version",
            "manual_sample_size",
            "manual_reference_value",
            "system_value",
            "error_pct",
            "approved_by",
            "approved_at",
            "notes",
            "status",
            "created_at",
        )
    )
    latest: dict[tuple[str, str], dict] = {}
    for row in rows:
        key = (str(row["camera_id"]), str(row["metric_type"]))
        if key in latest:
            continue
        latest[key] = {
            "metric_type": row["metric_type"],
            "roi_version": row.get("roi_version"),
            "manual_sample_size": row.get("manual_sample_size"),
            "manual_reference_value": row.get("manual_reference_value"),
            "system_value": row.get("system_value"),
            "error_pct": row.get("error_pct"),
            "approved_by": str(row["approved_by"]) if row.get("approved_by") else None,
            "approved_at": row["approved_at"].isoformat() if row.get("approved_at") else None,
            "notes": row.get("notes"),
            "status": row.get("status"),
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        }
    return latest


def _build_vision_confidence_snapshot(store: Store, window_hours: int = 24) -> dict:
    cameras = list(Camera.objects.filter(store_id=store.id).order_by("name"))
    camera_ids = [str(camera.id) for camera in cameras]
    latest_calibrations = _get_latest_calibration_runs(store, camera_ids)
    atomic_stats: dict[tuple[str, str], dict] = {}
    if camera_ids:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT camera_id, event_type, COUNT(*) AS events_count, MAX(ts) AS last_event_at
                FROM public.vision_atomic_events
                WHERE store_id = %s
                  AND ts >= %s
                  AND camera_id = ANY(%s)
                GROUP BY camera_id, event_type
                """,
                [str(store.id), timezone.now() - timedelta(hours=window_hours), camera_ids],
            )
            for row in cursor.fetchall():
                atomic_stats[(str(row[0]), str(row[1]))] = {
                    "events_count": int(row[2] or 0),
                    "last_event_at": row[3],
                }

    cameras_out = []
    metrics_ready = 0
    metrics_partial = 0
    metrics_recalibrate = 0
    cameras_with_roi = 0
    for camera in cameras:
        published = get_latest_published_roi_config(str(camera.id))
        roi_config = published.config_json if published and isinstance(published.config_json, dict) else {}
        roi_version = roi_config.get("roi_version") if isinstance(roi_config, dict) else None
        camera_role = _infer_camera_role_from_roi_or_name(camera, roi_config)
        if published:
            cameras_with_roi += 1

        metric_rules = VISION_CONFIDENCE_METRIC_RULES.get(camera_role, [])
        metrics = []
        for rule in metric_rules:
            stat = atomic_stats.get((str(camera.id), rule["event_type"]), {})
            latest_calibration = latest_calibrations.get((str(camera.id), rule["metric_key"]))
            last_event_at = stat.get("last_event_at")
            events_count = int(stat.get("events_count") or 0)
            freshness = _freshness_score(last_event_at)
            volume_score = min(100, int((events_count / max(1, rule["target_events_24h"])) * 100))
            roi_score = 100 if published else 0
            camera_score = _camera_operational_score(getattr(camera, "status", "unknown"))
            coverage_score = int(round((volume_score * 0.6) + (freshness * 0.4)))
            confidence_score = int(
                round((roi_score * 0.35) + (camera_score * 0.25) + (freshness * 0.25) + (volume_score * 0.15))
            )
            status_value = _classify_confidence_status(coverage_score, confidence_score)
            if status_value == "pronto":
                metrics_ready += 1
            elif status_value == "parcial":
                metrics_partial += 1
            else:
                metrics_recalibrate += 1
            reasons = []
            if not published:
                reasons.append("roi_not_published")
            if camera_score < 60:
                reasons.append("camera_not_healthy")
            if freshness < 70:
                reasons.append("stale_or_missing_events")
            if volume_score < 60:
                reasons.append("low_event_volume")

            metrics.append(
                {
                    "metric_key": rule["metric_key"],
                    "event_type": rule["event_type"],
                    "status": status_value,
                    "coverage_score": coverage_score,
                    "confidence_score": confidence_score,
                    "events_24h": events_count,
                    "last_event_at": last_event_at.isoformat() if last_event_at else None,
                    "roi_version": roi_version,
                    "reasons": reasons,
                    "latest_calibration": latest_calibration,
                }
            )

        camera_status = "recalibrar"
        if metrics:
            camera_statuses = {metric["status"] for metric in metrics}
            if camera_statuses == {"pronto"}:
                camera_status = "pronto"
            elif "pronto" in camera_statuses or "parcial" in camera_statuses:
                camera_status = "parcial"
        elif published and str(getattr(camera, "status", "")).lower() in {"online", "degraded"}:
            camera_status = "parcial"

        cameras_out.append(
            {
                "camera_id": str(camera.id),
                "camera_name": camera.name,
                "camera_role": camera_role,
                "camera_status": getattr(camera, "status", "unknown"),
                "store_status": camera_status,
                "last_seen_at": camera.last_seen_at.isoformat() if getattr(camera, "last_seen_at", None) else None,
                "roi_published": bool(published),
                "roi_version": roi_version,
                "metrics": metrics,
            }
        )

    if metrics_recalibrate == 0 and (metrics_ready > 0 or metrics_partial > 0):
        store_status = "pronto" if metrics_partial == 0 else "parcial"
    elif metrics_ready > 0 or metrics_partial > 0:
        store_status = "parcial"
    else:
        store_status = "recalibrar"

    return {
        "store_status": store_status,
        "summary": {
            "cameras_total": len(cameras_out),
            "cameras_with_published_roi": cameras_with_roi,
            "metrics_ready": metrics_ready,
            "metrics_partial": metrics_partial,
            "metrics_recalibrate": metrics_recalibrate,
        },
        "cameras": cameras_out,
    }


def _serialize_calibration_run(row: StoreCalibrationRun) -> dict:
    return {
        "id": str(row.id),
        "store_id": str(row.store_id),
        "camera_id": str(row.camera_id),
        "metric_type": row.metric_type,
        "roi_version": row.roi_version,
        "manual_sample_size": row.manual_sample_size,
        "manual_reference_value": row.manual_reference_value,
        "system_value": row.system_value,
        "error_pct": row.error_pct,
        "approved_by": str(row.approved_by) if row.approved_by else None,
        "approved_at": row.approved_at.isoformat() if row.approved_at else None,
        "notes": row.notes,
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _require_subscription_for_org_ids(self, org_ids, action: str):
        if getattr(self.request.user, "is_superuser", False) or getattr(
            self.request.user, "is_staff", False
        ):
            return
        if not org_ids:
            return
        actor_user_id = None
        try:
            actor_user_id = ensure_user_uuid(self.request.user)
        except Exception:
            actor_user_id = None
        for org_id in {str(o) for o in org_ids if o}:
            require_trial_active(
                org_id=org_id,
                actor_user_id=actor_user_id,
                action=action,
                endpoint=self.request.path,
                user=self.request.user,
            )

    def _require_subscription_for_store(self, store: Store, action: str):
        self._require_subscription_for_org_ids([getattr(store, "org_id", None)], action)
    
    def get_queryset(self):
        qs = Store.objects.all().order_by("-updated_at")
        qs = filter_stores_for_user(qs, self.request.user)
        org_id = self.request.query_params.get("org_id")
        if org_id:
            qs = qs.filter(org_id=org_id)
        _expire_trial_stores(qs, self.request.user)
        return qs
    
    def list(self, request):
        """Sobrescreve list para retornar formato personalizado - MANTENHA ESTE!"""
        view = request.query_params.get("view")
        stores = self.get_queryset()

        if view in ("min", "summary"):
            start_ts = time.monotonic()
            try:
                user = request.user if request.user and request.user.is_authenticated else None
                user_key = "anon"
                if user:
                    user_key = str(getattr(user, "id", "unknown"))
                org_ids = get_user_org_ids(user) if user else []
                org_key = ",".join(sorted({str(o) for o in org_ids if o}))[:200]
                cache_key = f"stores:list:{view}:u={user_key}:orgs={org_key}"
                cached = cache.get(cache_key)
                if cached:
                    return Response(cached)
            except Exception:
                cache_key = None

            if view == "min":
                rows = list(
                    stores.values("id", "name", "created_at", "status")
                )
                data = [
                    {
                        "id": str(row["id"]),
                        "name": row.get("name"),
                        "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
                        "is_active": row.get("status") in ("active", "trial"),
                    }
                    for row in rows
                ]
                payload = {
                    "status": "success",
                    "count": len(data),
                    "data": data,
                    "timestamp": timezone.now().isoformat(),
                }
            else:
                rows = list(
                    stores.values("id", "name", "status", "blocked_reason", "trial_ends_at", "org_id")
                )
                role_map = {}
                if request.user and request.user.is_authenticated:
                    if request.user.is_staff or request.user.is_superuser:
                        role_map = {str(row.get("org_id")): "owner" for row in rows}
                    else:
                        try:
                            user_uuid = ensure_user_uuid(request.user)
                            org_ids = {row.get("org_id") for row in rows if row.get("org_id")}
                            members = OrgMember.objects.filter(
                                org_id__in=list(org_ids),
                                user_id=user_uuid,
                            ).values("org_id", "role")
                            role_map = {str(m["org_id"]): m["role"] for m in members}
                        except Exception:
                            role_map = {}

                data = []
                for row in rows:
                    status_value = row.get("status")
                    blocked_reason = row.get("blocked_reason")
                    if request.user and (request.user.is_staff or request.user.is_superuser):
                        if status_value == "blocked" and blocked_reason == "trial_expired":
                            status_value = "trial"
                            blocked_reason = None
                    data.append({
                        "id": str(row["id"]),
                        "name": row.get("name"),
                        "status": status_value,
                        "blocked_reason": blocked_reason,
                        "trial_ends_at": row.get("trial_ends_at").isoformat() if row.get("trial_ends_at") else None,
                        "plan": "trial" if status_value == "trial" else None,
                        "role": role_map.get(str(row.get("org_id"))),
                    })

                payload = {
                    "status": "success",
                    "count": len(data),
                    "data": data,
                    "timestamp": timezone.now().isoformat(),
                }

            duration_ms = int((time.monotonic() - start_ts) * 1000)
            try:
                log_key = f"stores:list:log:{view}"
                if cache.add(log_key, True, timeout=30):
                    logger.info(
                        "[STORE] list view=%s duration_ms=%s count=%s",
                        view,
                        duration_ms,
                        len(payload.get("data", [])),
                    )
            except Exception:
                pass

            if cache_key:
                try:
                    cache.set(cache_key, payload, timeout=30)
                except Exception:
                    pass
            return Response(payload)

        serializer = self.get_serializer(stores, many=True)
        data = list(serializer.data)
        if request.user and request.user.is_authenticated:
            for idx, store in enumerate(stores):
                if idx >= len(data):
                    break
                role = "owner" if (request.user.is_staff or request.user.is_superuser) else get_user_role_for_store(request.user, str(store.id))
                if role:
                    data[idx]["role"] = role
                data[idx] = _apply_staff_trial_bypass(store, data[idx], request.user)
        return Response({
            'status': 'success',
            'count': stores.count(),
            'data': data,
            'timestamp': timezone.now().isoformat()
        })

    def destroy(self, request, *args, **kwargs):
        store = self.get_object()
        try:
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        actor_user_id = None
        try:
            actor_user_id = ensure_user_uuid(request.user)
        except Exception:
            actor_user_id = None
        enforce_can_use_product(
            org_id=store.org_id,
            actor_user_id=actor_user_id,
            action="delete_store",
            endpoint=request.path,
            user=request.user,
        )
        return super().destroy(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        store = self.get_object()
        try:
            require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        serializer = self.get_serializer(store)
        data = _apply_staff_trial_bypass(store, dict(serializer.data), request.user)
        return Response(data)

    def update(self, request, *args, **kwargs):
        store = self.get_object()
        try:
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        store = self.get_object()
        try:
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def edge_token(self, request, pk=None):
        """
        Retorna um token do edge para a store (não rotaciona se já existir).
        """
        store = self.get_object()
        _require_store_owner_or_admin(request.user, store)
        actor_user_id = None
        try:
            actor_user_id = ensure_user_uuid(request.user)
        except Exception:
            actor_user_id = None
        enforce_can_use_product(
            org_id=store.org_id,
            actor_user_id=actor_user_id,
            action="edge_token",
            endpoint=request.path,
            user=request.user,
        )
        edge_token = _get_active_edge_token(store.id)
        raw_token = edge_token.token_plaintext if edge_token else None
        if not edge_token:
            edge_token, raw_token = _issue_edge_token(store.id)
        return Response({
            "store_id": str(store.id),
            "token": raw_token,
            **_edge_token_meta(edge_token),
        })

    @action(detail=True, methods=["get"], url_path="edge-credentials")
    def edge_credentials(self, request, pk=None):
        """
        Retorna credenciais do edge (não rotaciona se já existir).
        Apenas owner/admin/manager da store pode acessar.
        """
        store = self.get_object()
        _require_store_owner_or_admin(request.user, store)
        actor_user_id = None
        try:
            actor_user_id = ensure_user_uuid(request.user)
        except Exception:
            actor_user_id = None
        enforce_can_use_product(
            org_id=store.org_id,
            actor_user_id=actor_user_id,
            action="edge_credentials",
            endpoint=request.path,
            user=request.user,
        )

        edge_token = _get_active_edge_token(store.id)
        raw_token = edge_token.token_plaintext if edge_token else None
        if not edge_token:
            edge_token, raw_token = _issue_edge_token(store.id)

        return Response(
            {
                "store_id": str(store.id),
                "edge_token": raw_token,
                "agent_id_default": "edge-001",
                "cloud_base_url": _resolve_cloud_base_url(request),
                **_edge_token_meta(edge_token),
            }
        )

    @action(detail=True, methods=["get"], url_path="edge-setup")
    def edge_setup(self, request, pk=None):
        """
        Retorna credenciais do edge para setup (idempotente; não rotaciona se já existir).
        Apenas owner/admin/manager da store pode acessar.
        """
        try:
            store = self.get_object()
        except Http404:
            return _error_response(
                "STORE_NOT_FOUND",
                "Store not found.",
                status.HTTP_404_NOT_FOUND,
                details={"store_id": str(pk)},
                deprecated_detail="Store not found",
            )
        except Exception as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_SETUP] failed to resolve store store_id=%s error=%s", str(pk), exc)
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado no servidor. Tente novamente.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Erro inesperado no servidor.",
            )

        try:
            _require_store_owner_or_admin(request.user, store)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "FORBIDDEN",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                details={"store_id": str(store.id)},
                deprecated_detail=str(exc) or "Sem permissão.",
            )

        try:
            edge_token = _get_active_edge_token(store.id)
            raw_token = edge_token.token_plaintext if edge_token else None
            if not edge_token or not raw_token:
                edge_token, raw_token = _issue_edge_token(store.id)
        except (ProgrammingError, OperationalError) as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_SETUP] token error store_id=%s error=%s", str(store.id), exc)
            return _error_response(
                "EDGE_TOKEN_ERROR",
                "Falha ao obter token do Edge.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Falha ao obter token do Edge.",
            )
        except Exception as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_SETUP] unexpected error store_id=%s error=%s", str(store.id), exc)
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado no servidor. Tente novamente.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Erro inesperado no servidor.",
            )

        return Response(
            {
                "store_id": str(store.id),
                "edge_token": raw_token,
                "agent_id_suggested": "edge-001",
                "cloud_base_url": _resolve_cloud_base_url(request),
                **_edge_token_meta(edge_token),
            }
        )

    @action(detail=True, methods=["post"], url_path="edge-token/rotate")
    def edge_token_rotate(self, request, pk=None):
        """
        Rotaciona o token do edge explicitamente (desativa tokens ativos anteriores).
        """
        try:
            store = self.get_object()
        except Http404:
            return _error_response(
                "STORE_NOT_FOUND",
                "Store not found.",
                status.HTTP_404_NOT_FOUND,
                details={"store_id": str(pk)},
                deprecated_detail="Store not found",
            )
        except Exception as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_TOKEN_ROTATE] failed to resolve store store_id=%s error=%s", str(pk), exc)
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado no servidor. Tente novamente.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Erro inesperado no servidor.",
            )

        try:
            _require_store_owner_or_admin(request.user, store)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "FORBIDDEN",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                details={"store_id": str(store.id)},
                deprecated_detail=str(exc) or "Sem permissão.",
            )

        try:
            edge_token, raw_token = _rotate_edge_token(store.id)
        except (ProgrammingError, OperationalError) as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_TOKEN_ROTATE] token error store_id=%s error=%s", str(store.id), exc)
            return _error_response(
                "EDGE_TOKEN_ERROR",
                "Falha ao gerar novo token do Edge.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Falha ao gerar novo token do Edge.",
            )
        except Exception as exc:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            logger.exception("[EDGE_TOKEN_ROTATE] unexpected error store_id=%s error=%s", str(store.id), exc)
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado no servidor. Tente novamente.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Erro inesperado no servidor.",
            )

        if not raw_token:
            trace_id = request.META.get("HTTP_X_REQUEST_ID") or request.META.get("HTTP_X_TRACE_ID")
            return _error_response(
                "EDGE_TOKEN_ERROR",
                "Falha ao gerar novo token do Edge.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"trace_id": trace_id or "n/a"},
                deprecated_detail="Falha ao gerar novo token do Edge.",
            )

        return Response(
            {
                "store_id": str(store.id),
                "edge_token": raw_token,
                "rotated_at": timezone.now().isoformat(),
                **_edge_token_meta(edge_token),
            }
        )

    @action(detail=True, methods=["get"], url_path="edge-token-hint")
    def edge_token_hint(self, request, pk=None):
        if not _edge_debug_enabled():
            raise Http404()

        if not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
            return _error_response(
                "FORBIDDEN",
                "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail="Sem permissão.",
            )

        store = self.get_object()
        edge_token = _get_active_edge_token(store.id)
        if not edge_token:
            return _error_response(
                "EDGE_TOKEN_NOT_FOUND",
                "Nenhum token edge ativo para a store.",
                status.HTTP_404_NOT_FOUND,
                details={"store_id": str(store.id)},
                deprecated_detail="Nenhum token edge ativo para a store.",
            )

        raw_token = edge_token.token_plaintext or ""
        token_prefix = raw_token[:6] if raw_token else None
        token_last4 = raw_token[-4:] if raw_token else None
        return Response(
            {
                "store_id": str(store.id),
                "token_prefix": token_prefix,
                "token_last4": token_last4,
                "token_created_at": edge_token.created_at.isoformat() if edge_token.created_at else None,
                "token_last_used_at": edge_token.last_used_at.isoformat() if edge_token.last_used_at else None,
            }
        )

    @action(detail=True, methods=["patch"], url_path=r"cameras/(?P<camera_id>[^/.]+)")
    def set_camera_active(self, request, pk=None, camera_id=None):
        store = self.get_object()
        try:
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )

        if "active" not in request.data:
            return Response({"detail": "Campo 'active' obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        active = request.data.get("active")
        if isinstance(active, str):
            if active.lower() in ("true", "1", "yes"):
                active = True
            elif active.lower() in ("false", "0", "no"):
                active = False

        if not isinstance(active, bool):
            return Response({"detail": "Campo 'active' deve ser booleano."}, status=status.HTTP_400_BAD_REQUEST)

        if not _camera_active_column_exists():
            return Response(
                {"detail": "Coluna 'active' não existe. Rode o script SQL no Supabase."},
                status=status.HTTP_409_CONFLICT,
            )

        camera_qs = Camera.objects.filter(store_id=store.id)
        if _is_uuid(camera_id):
            camera_qs = camera_qs.filter(id=camera_id)
        else:
            camera_qs = camera_qs.filter(external_id=camera_id)

        camera = camera_qs.first()
        if not camera:
            return Response({"detail": "Camera não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if active and not getattr(camera, "active", False):
            try:
                actor_user_id = None
                try:
                    actor_user_id = ensure_user_uuid(request.user)
                except Exception:
                    actor_user_id = None

                enforce_trial_camera_limit(
                    store.id,
                    requested_active=True,
                    exclude_camera_id=str(camera.id),
                    actor_user_id=actor_user_id,
                    user=request.user,
                )
            except PaywallError as exc:
                return Response(
                    {
                        "ok": False,
                        "code": "LIMIT_CAMERAS_REACHED",
                        "message": "Limite de câmeras do trial atingido.",
                        "meta": exc.detail.get("meta", {}) if isinstance(exc.detail, dict) else {},
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        try:
            camera.active = active
            camera.updated_at = timezone.now()
            camera.save(update_fields=["active", "updated_at"])
        except (ProgrammingError, OperationalError):
            return Response(
                {"detail": "Falha ao atualizar camera.active."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "id": str(camera.id),
                "name": camera.name,
                "external_id": camera.external_id,
                "active": camera.active,
                "status": camera.status,
                "last_seen_at": camera.last_seen_at.isoformat() if camera.last_seen_at else None,
            }
        )

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="cameras",
        permission_classes=[permissions.AllowAny],
        authentication_classes=[EdgeAwareJWTAuthentication, TokenAuthentication],
    )
    def cameras(self, request, pk=None):
        try:
            store = self.get_object()
        except Http404:
            return _error_response(
                "STORE_NOT_FOUND",
                "Store not found.",
                status.HTTP_404_NOT_FOUND,
                deprecated_detail="Store not found",
            )
        if request.method == "GET":
            edge_token = (request.headers.get("X-EDGE-TOKEN") or "").strip()
            cameras_qs = Camera.objects.select_related("store").filter(store_id=store.id).order_by("-updated_at")
            if edge_token:
                if not validate_store_token(request, str(store.id)):
                    return _error_response(
                        "FORBIDDEN",
                        "Edge token inválido para esta loja.",
                        status.HTTP_401_UNAUTHORIZED,
                        deprecated_detail="Edge token inválido para esta loja.",
                    )
                # Source-of-truth for edge runtime: only active cameras should be synced.
                cameras_qs = cameras_qs.filter(active=True)
                # S1 contract: edge token receives operational payload (single source of truth for RTSP).
                return Response(_serialize_cameras_for_edge(cameras_qs))
            elif request.user and request.user.is_authenticated:
                require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
            else:
                return _error_response(
                    "FORBIDDEN",
                    "Edge token inválido para esta loja.",
                    status.HTTP_401_UNAUTHORIZED,
                    deprecated_detail="Edge token inválido para esta loja.",
                )
            serializer = CameraSerializer(cameras_qs, many=True)
            return Response(serializer.data)

        try:
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        actor_user_id = None
        try:
            actor_user_id = ensure_user_uuid(request.user)
        except Exception:
            actor_user_id = None
        try:
                enforce_can_use_product(
                    org_id=store.org_id,
                    actor_user_id=actor_user_id,
                    action="create_camera",
                    endpoint=request.path,
                    user=request.user,
                )
        except Exception as exc:
            if getattr(exc, "status_code", None) == status.HTTP_402_PAYMENT_REQUIRED:
                details = getattr(exc, "detail", None)
                message = None
                if isinstance(details, dict):
                    message = details.get("message")
                return _error_response(
                    "PAYWALL_TRIAL_LIMIT",
                    message or "Trial expirado. Assinatura necessária.",
                    status.HTTP_402_PAYMENT_REQUIRED,
                    details=details,
                    deprecated_detail=message or "Trial expirado. Assinatura necessária.",
                )
            logger.exception(
                "[STORE] cameras create entitlement error store_id=%s org_id=%s user_id=%s payload=%s",
                str(store.id),
                str(getattr(store, "org_id", None)),
                getattr(request.user, "id", None),
                _sanitize_camera_payload(request.data),
            )
            return _error_response(
                "INTERNAL_ERROR",
                "Erro inesperado ao validar assinatura.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"reason": str(exc)[:200]},
                deprecated_detail="Erro inesperado ao validar assinatura.",
            )
        serializer = CameraSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except (ValidationError, DjangoValidationError) as exc:
            details = None
            if hasattr(exc, "detail"):
                details = exc.detail
            elif hasattr(exc, "message_dict"):
                details = exc.message_dict
            else:
                details = {"non_field_errors": [str(exc)]}
            logger.warning(
                "[STORE] cameras create validation error store_id=%s org_id=%s user_id=%s errors=%s payload=%s",
                str(store.id),
                str(getattr(store, "org_id", None)),
                getattr(request.user, "id", None),
                details,
                _sanitize_camera_payload(request.data),
            )
            return _error_response(
                "CAMERA_VALIDATION_ERROR",
                "Dados inválidos para câmera.",
                status.HTTP_400_BAD_REQUEST,
                details=details,
                deprecated_detail="Dados inválidos para câmera.",
            )
        requested_active = serializer.validated_data.get("active", True)
        try:
            actor_user_id = None
            try:
                actor_user_id = ensure_user_uuid(request.user)
            except Exception:
                actor_user_id = None
            enforce_trial_camera_limit(
                str(store.id),
                requested_active=requested_active,
                actor_user_id=actor_user_id,
                user=request.user,
            )
        except PaywallError as exc:
            return _error_response(
                "LIMIT_CAMERAS_REACHED",
                "Limite de câmeras do trial atingido.",
                status.HTTP_409_CONFLICT,
                details=exc.detail.get("meta", {}) if isinstance(exc.detail, dict) else {},
                deprecated_detail="Limite de câmeras do trial atingido.",
            )

        now = timezone.now()
        try:
            camera = serializer.save(
                store=store,
                created_at=now,
                updated_at=now,
                status="unknown",
                last_error=None,
            )
        except Exception as exc:
            logger.exception(
                "[STORE] cameras create failed store_id=%s org_id=%s user_id=%s payload=%s",
                str(store.id),
                str(getattr(store, "org_id", None)),
                getattr(request.user, "id", None),
                _sanitize_camera_payload(request.data),
            )
            return _error_response(
                "CAMERA_CREATE_FAILED",
                "Não foi possível cadastrar a câmera.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"reason": str(exc)[:200]},
                deprecated_detail="Não foi possível cadastrar a câmera.",
            )
        try:
            OnboardingProgressService(str(store.org_id)).complete_step(
                "camera_added",
                meta={"store_id": str(store.id), "camera_id": str(camera.id)},
            )
        except Exception:
            pass
        try:
            log_journey_event(
                org_id=str(store.org_id),
                event_name="camera_added",
                payload={
                    "store_id": str(store.id),
                    "camera_id": str(camera.id),
                },
                source="app",
                meta={"path": request.path},
            )
        except Exception:
            logger.exception(
                "[STORE] failed to log camera_added store_id=%s camera_id=%s",
                str(store.id),
                str(camera.id),
            )
        return Response(CameraSerializer(camera).data, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Auto-popula owner_email com email do usuário - ADICIONE ESTE!"""
        user = self.request.user
        payload = getattr(self.request, "data", None) or getattr(self.request, "POST", None) or {}
        requested_org_id = payload.get("org_id") or payload.get("org")
        now = timezone.now()
        user_uuid = None

        def _log_store_created(store: Store):
            try:
                log_journey_event(
                    org_id=str(getattr(store, "org_id", None)) if getattr(store, "org_id", None) else None,
                    event_name="store_created",
                    payload={
                        "store_id": str(store.id),
                        "status": getattr(store, "status", None),
                    },
                    source="app",
                    meta={"path": self.request.path},
                )
            except Exception:
                logger.exception("[STORE] failed to log store_created store_id=%s", str(store.id))

        def _trial_defaults():
            if payload.get("status") or payload.get("trial_started_at") or payload.get("trial_ends_at"):
                return {}
            return {
                "status": "trial",
                "trial_started_at": now,
                "trial_ends_at": now + timedelta(hours=72),
            }

        if requested_org_id:
            if not (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False)):
                user_uuid = ensure_user_uuid(user)
                is_member = OrgMember.objects.filter(
                    org_id=requested_org_id,
                    user_id=user_uuid,
                ).exists()
                if not is_member:
                    print(f"[RBAC] user {user.id} tentou criar store em org {requested_org_id} sem membership.")
                    raise PermissionDenied("Você não tem acesso a esta organização.")
            if not user_uuid:
                try:
                    user_uuid = ensure_user_uuid(user)
                except Exception:
                    user_uuid = None
            enforce_can_use_product(
                org_id=requested_org_id,
                actor_user_id=user_uuid,
                action="create_store",
                endpoint=self.request.path,
                user=self.request.user,
            )
            enforce_trial_store_limit(
                org_id=requested_org_id,
                actor_user_id=user_uuid,
                user=self.request.user,
            )
            store = serializer.save(
                org_id=requested_org_id,
                created_at=now,
                updated_at=now,
                **_trial_defaults(),
            )
            logger.info("[STORE] created store_id=%s org_id=%s user_id=%s", str(store.id), str(requested_org_id), getattr(user, "id", None))
            _log_store_created(store)
            return

        org_ids = get_user_org_ids(user)
        if len(org_ids) == 1:
            if not user_uuid:
                try:
                    user_uuid = ensure_user_uuid(user)
                except Exception:
                    user_uuid = None
            enforce_can_use_product(
                org_id=org_ids[0],
                actor_user_id=user_uuid,
                action="create_store",
                endpoint=self.request.path,
                user=self.request.user,
            )
            enforce_trial_store_limit(
                org_id=org_ids[0],
                actor_user_id=user_uuid,
                user=self.request.user,
            )
            store = serializer.save(
                org_id=org_ids[0],
                created_at=now,
                updated_at=now,
                **_trial_defaults(),
            )
            logger.info("[STORE] created store_id=%s org_id=%s user_id=%s", str(store.id), str(org_ids[0]), getattr(user, "id", None))
            _log_store_created(store)
            return
        if len(org_ids) > 1:
            raise ValidationError("Informe org_id para criar a store.")

        # Sem org: cria uma org default e adiciona o usuário como owner.
        try:
            user_uuid = ensure_user_uuid(user)
            created_at = timezone.now()
            trial_ends_at = created_at + timedelta(hours=72)
            try:
                org = Organization.objects.create(
                    name="Default",
                    segment=None,
                    country="BR",
                    timezone="America/Sao_Paulo",
                    created_at=created_at,
                    trial_ends_at=trial_ends_at,
                )
            except DatabaseError:
                logger.warning(
                    "[ORG] missing trial_ends_at column on organizations, creating without trial",
                    exc_info=True,
                )
                org = Organization.objects.create(
                    name="Default",
                    segment=None,
                    country="BR",
                    timezone="America/Sao_Paulo",
                    created_at=created_at,
                )
            OrgMember.objects.create(
                org=org,
                user_id=user_uuid,
                role="owner",
                created_at=timezone.now(),
            )
            logger.info("[ORG] created org_id=%s user_uuid=%s", str(org.id), str(user_uuid))
            enforce_can_use_product(
                org_id=org.id,
                actor_user_id=user_uuid,
                action="create_store",
                endpoint=self.request.path,
                user=request.user,
            )
            enforce_trial_store_limit(
                org_id=org.id,
                actor_user_id=user_uuid,
                user=request.user,
            )
            store = serializer.save(
                org=org,
                created_at=now,
                updated_at=now,
                **_trial_defaults(),
            )
            logger.info("[STORE] created store_id=%s org_id=%s user_id=%s", str(store.id), str(org.id), getattr(user, "id", None))
            _log_store_created(store)
        except (ProgrammingError, OperationalError) as exc:
            print(f"[RBAC] falha ao criar org padrão: {exc}")
            raise ValidationError("Não foi possível criar organização padrão.")
    
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Dashboard específico da loja (como no seu design)"""
        try:
            store = self.get_object()
            require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
            self._require_subscription_for_store(store, "store_dashboard")
            store_status = getattr(store, "status", None)
            if (
                request.user
                and (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False))
                and store_status == "blocked"
                and getattr(store, "blocked_reason", None) == "trial_expired"
            ):
                store_status = "trial"
            status_ui = "active" if store_status in ("active", "trial") else "inactive"
            plan_value = "trial" if store_status == "trial" else None

            end = timezone.now()
            start = end - timedelta(days=7)

            total_visitors = 0
            avg_dwell_seconds = 0.0
            avg_conversion_rate = 0.0
            avg_queue_seconds = 0.0
            avg_staff_active = 0.0
            peak_hour = "-"
            best_selling_zone = "-"
            open_events = []
            critical_alerts_open = 0

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        COALESCE(SUM(footfall), 0) AS total_visitors,
                        COALESCE(AVG(NULLIF(dwell_seconds_avg, 0)), 0) AS avg_dwell_seconds
                    FROM public.traffic_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    """,
                    [str(store.id), start, end],
                )
                row = cursor.fetchone()
                if row:
                    total_visitors = int(row[0] or 0)
                    avg_dwell_seconds = float(row[1] or 0)

                cursor.execute(
                    """
                    SELECT
                        COALESCE(AVG(NULLIF(conversion_rate, 0)), 0) AS avg_conversion_rate,
                        COALESCE(AVG(queue_avg_seconds), 0) AS avg_queue_seconds,
                        COALESCE(AVG(staff_active_est), 0) AS avg_staff_active
                    FROM public.conversion_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    """,
                    [str(store.id), start, end],
                )
                row = cursor.fetchone()
                if row:
                    avg_conversion_rate = float(row[0] or 0)
                    avg_queue_seconds = float(row[1] or 0)
                    avg_staff_active = float(row[2] or 0)

                cursor.execute(
                    """
                    SELECT
                        date_trunc('hour', ts_bucket) AS bucket,
                        COALESCE(SUM(footfall), 0) AS flow
                    FROM public.traffic_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                    ORDER BY flow DESC
                    LIMIT 1
                    """,
                    [str(store.id), start, end],
                )
                row = cursor.fetchone()
                if row and row[0]:
                    peak_hour = timezone.localtime(row[0]).strftime("%H:%M")

                cursor.execute(
                    """
                    SELECT z.name, COALESCE(SUM(t.footfall), 0) AS flow
                    FROM public.store_zones z
                    JOIN public.traffic_metrics t ON t.zone_id = z.id
                    WHERE z.store_id = %s
                      AND t.ts_bucket >= %s
                      AND t.ts_bucket < %s
                    GROUP BY z.id, z.name
                    ORDER BY flow DESC
                    LIMIT 1
                    """,
                    [str(store.id), start, end],
                )
                row = cursor.fetchone()
                if row and row[0]:
                    best_selling_zone = str(row[0])

            open_events_qs = (
                DetectionEvent.objects.filter(store_id=store.id, status="open")
                .order_by("-occurred_at")
            )
            critical_alerts_open = open_events_qs.filter(severity="critical").count()
            open_events = list(open_events_qs[:5])

            queue_penalty = min(45, max(0.0, avg_queue_seconds / 15.0))
            incident_penalty = critical_alerts_open * 12
            health_score = max(0, min(100, round(100 - queue_penalty - incident_penalty)))

            avg_visitors_per_hour = float(total_visitors) / (24.0 * 7.0) if total_visitors > 0 else 0.0
            estimated_abandon_rate = max(0.0, min(0.35, (avg_queue_seconds - 180.0) / 1200.0))
            estimated_lost_customers = int(round(avg_visitors_per_hour * estimated_abandon_rate * 8.0))
            estimated_ticket_brl = 85.0
            estimated_revenue_gap_brl = int(max(0.0, estimated_lost_customers * estimated_ticket_brl))

            needs_attention = (
                "Cobertura de caixa no pico"
                if avg_queue_seconds >= 300
                else "Eficiência de atendimento"
                if avg_queue_seconds >= 180
                else "Operação estável"
            )

            recommendations = []
            if avg_queue_seconds >= 300:
                recommendations.append(
                    {
                        "id": "queue-peak",
                        "title": "Reforçar equipe no caixa em horário crítico",
                        "description": "Fila média acima de 5 minutos. Priorize abertura de caixa adicional no pico.",
                        "priority": "high",
                        "action": "Abrir segundo caixa entre 17h e 19h",
                        "estimated_impact": "Redução esperada de até 30% no tempo de espera",
                    }
                )
            if estimated_revenue_gap_brl > 0:
                recommendations.append(
                    {
                        "id": "revenue-gap",
                        "title": "Mitigar gap de receita por abandono de fila",
                        "description": f"Estimativa atual de perda potencial em 7 dias: R$ {estimated_revenue_gap_brl:,.0f}".replace(",", "."),
                        "priority": "high" if estimated_revenue_gap_brl >= 2000 else "medium",
                        "action": "Ajustar escala de atendimento nos horários de maior fluxo",
                        "estimated_impact": "Recuperação progressiva de conversão e receita",
                    }
                )
            if not recommendations:
                recommendations.append(
                    {
                        "id": "monitoring",
                        "title": "Operação sob controle",
                        "description": "Sem desvios críticos. Continue monitorando as lojas com foco em conversão.",
                        "priority": "low",
                        "action": "Revisar tendências com o Copiloto",
                        "estimated_impact": "Manutenção da consistência operacional",
                    }
                )

            alerts_payload = [
                {
                    "type": str(evt.type or "event"),
                    "message": str(evt.title or evt.description or "Evento operacional"),
                    "severity": str(evt.severity or "info"),
                    "time": timezone.localtime(evt.occurred_at).isoformat() if evt.occurred_at else None,
                }
                for evt in open_events
            ]

            dashboard_data = {
                'store': {
                    'id': str(store.id),
                    'name': getattr(store, "name", None),
                    'owner_email': getattr(request.user, "email", None),
                    'plan': plan_value,
                    'status': status_ui,
                },
                'metrics': {
                    'health_score': int(health_score),
                    'productivity': int(round(avg_staff_active)),
                    'idle_time': int(max(0, round((1 - min(avg_staff_active / 3.0, 1.0)) * 60))),
                    'visitor_flow': int(total_visitors),
                    'conversion_rate': float(round(avg_conversion_rate, 2)),
                    'avg_cart_value': int(round(estimated_ticket_brl)),
                },
                'insights': {
                    'peak_hour': peak_hour,
                    'best_selling_zone': best_selling_zone,
                    'employee_performance': {
                        'best': "Equipe base estabilizada",
                        'needs_attention': needs_attention,
                    },
                },
                'executive': {
                    'estimated_revenue_gap_brl': int(estimated_revenue_gap_brl),
                    'estimated_lost_customers': int(estimated_lost_customers),
                    'critical_alerts_open': int(critical_alerts_open),
                    'window': '7d',
                },
                'recommendations': recommendations,
                'alerts': alerts_payload,
            }

            return Response(dashboard_data)
        except (PermissionDenied, DjangoPermissionDenied) as exc:
            return _error_response(
                "PERMISSION_DENIED",
                str(exc) or "Sem permissão.",
                status.HTTP_403_FORBIDDEN,
                deprecated_detail=str(exc) or "Sem permissão.",
            )
        except (ProgrammingError, ObjectDoesNotExist) as exc:
            print(f"[WARN] dashboard fallback for store {pk}: {exc}")
            fallback_status = "inactive"
            return Response({
                'store': {
                    'id': str(pk),
                    'name': None,
                    'owner_email': getattr(request.user, "email", None),
                    'plan': None,
                    'status': fallback_status,
                },
                'metrics': None,
                'insights': None,
                'recommendations': [],
                'alerts': [],
                'timestamp': timezone.now().isoformat(),
            })
    
    @action(detail=True, methods=['get'])
    def live_monitor(self, request, pk=None):
        """Dados para monitoramento em tempo real"""
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        
        # ⭐ MOCK - depois vem do processamento de vídeo
        monitor_data = {
            'store': store.name,
            'timestamp': timezone.now().isoformat(),
            'cameras': [
                {
                    'id': 'cam_001',
                    'name': 'Caixa Principal',
                    'status': 'online',
                    'current_viewers': 0,
                    'events_last_hour': 12,
                    'stream_url': f'/api/cameras/{store.id}/stream/cam_001'
                },
                {
                    'id': 'cam_002',
                    'name': 'Entrada Loja',
                    'status': 'online',
                    'current_viewers': 1,
                    'events_last_hour': 47,
                    'stream_url': f'/api/cameras/{store.id}/stream/cam_002'
                }
            ],
            'current_events': [
                {
                    'type': 'person_detected',
                    'camera': 'Entrada Loja',
                    'confidence': 0.92,
                    'timestamp': timezone.now().isoformat(),
                },
                {
                    'type': 'queue_forming',
                    'camera': 'Caixa Principal',
                    'confidence': 0.78,
                    'timestamp': timezone.now().isoformat(),
                    'details': '3 pessoas na fila'
                }
            ]
        }
        
        return Response(monitor_data)

    @action(detail=True, methods=["get"], url_path="limits")
    def limits(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)

        org_id = getattr(store, "org_id", None)
        plan_code = get_org_plan_code(str(org_id) if org_id else None)
        if plan_code not in PLAN_LIMITS:
            plan_code = "start"
        cameras_limit = get_camera_limit_for_store(str(store.id))
        cameras_used = count_active_cameras(str(store.id))
        stores_used = Store.objects.filter(org_id=org_id).count() if org_id else 0
        stores_limit = PLAN_LIMITS.get(plan_code, {}).get("stores")
        sub = (
            Subscription.objects.filter(org_id=org_id).order_by("-created_at").only("status").first()
            if org_id
            else None
        )
        subscription_status = str(getattr(sub, "status", "") or "").lower()

        return Response(
            {
                "store_id": str(store.id),
                "plan": plan_code,
                "plan_status": subscription_status or ("trialing" if plan_code == "trial" else "active"),
                "limits": {
                    "cameras": cameras_limit,
                    "stores": stores_limit,
                },
                "usage": {
                    "cameras": cameras_used,
                    "stores": stores_used,
                },
            }
        )

    @action(detail=True, methods=["get"], url_path="metrics/summary")
    def metrics_summary(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)

        tz = _get_org_timezone(store)
        period = (request.query_params.get("period") or "7d").lower()
        bucket = (request.query_params.get("bucket") or "day").lower()
        if bucket not in {"hour", "day"}:
            bucket = "day"

        start = _parse_dt(request.query_params.get("from"), tz)
        end = _parse_dt(request.query_params.get("to"), tz)
        if not end:
            end = timezone.now()
        if not start:
            days = 7
            if period == "30d":
                days = 30
            elif period == "90d":
                days = 90
            start = end - timedelta(days=days)

        traffic_series = []
        conversion_series = []
        totals = {
            "total_visitors": 0,
            "avg_dwell_seconds": 0,
            "avg_queue_seconds": 0,
            "avg_staff_active": 0,
            "avg_conversion_rate": 0,
        }
        metric_governance = _build_metric_governance()
        zones_breakdown = []

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT date_trunc(%s, ts_bucket) AS bucket,
                       COALESCE(SUM(footfall), 0) AS footfall,
                       COALESCE(AVG(NULLIF(dwell_seconds_avg, 0)), 0) AS dwell_avg
                FROM public.traffic_metrics
                WHERE store_id = %s
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                  AND (camera_role = 'entrada' OR camera_role IS NULL)
                  AND (ownership = 'primary' OR ownership IS NULL)
                GROUP BY 1
                ORDER BY 1 ASC
                """,
                [bucket, str(store.id), start, end],
            )
            for row in cursor.fetchall():
                traffic_series.append(
                    {
                        "ts_bucket": row[0].isoformat(),
                        "footfall": int(row[1] or 0),
                        "dwell_seconds_avg": int(row[2] or 0),
                    }
                )

            cursor.execute(
                """
                WITH traffic AS (
                    SELECT date_trunc(%s, ts_bucket) AS bucket,
                           COALESCE(SUM(footfall), 0) AS footfall
                    FROM public.traffic_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                ),
                conversion AS (
                    SELECT date_trunc(%s, ts_bucket) AS bucket,
                           COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                           COALESCE(AVG(staff_active_est), 0) AS staff_active_est,
                           COALESCE(SUM(checkout_events), 0) AS checkout_events
                    FROM public.conversion_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                )
                SELECT COALESCE(conversion.bucket, traffic.bucket) AS bucket,
                       COALESCE(conversion.queue_avg_seconds, 0) AS queue_avg_seconds,
                       COALESCE(conversion.staff_active_est, 0) AS staff_active_est,
                       CASE
                           WHEN COALESCE(traffic.footfall, 0) > 0
                           THEN ROUND((COALESCE(conversion.checkout_events, 0)::numeric / traffic.footfall::numeric) * 100, 2)
                           ELSE 0
                       END AS conversion_rate
                FROM conversion
                FULL OUTER JOIN traffic ON traffic.bucket = conversion.bucket
                ORDER BY 1 ASC
                """,
                [bucket, str(store.id), start, end, bucket, str(store.id), start, end],
            )
            for row in cursor.fetchall():
                conversion_series.append(
                    {
                        "ts_bucket": row[0].isoformat(),
                        "queue_avg_seconds": int(row[1] or 0),
                        "staff_active_est": int(row[2] or 0),
                        "conversion_rate": float(row[3] or 0),
                    }
                )

            cursor.execute(
                """
                SELECT COALESCE(SUM(footfall), 0) AS total_visitors,
                       COALESCE(AVG(NULLIF(dwell_seconds_avg, 0)), 0) AS avg_dwell_seconds
                FROM public.traffic_metrics
                WHERE store_id = %s
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                  AND (camera_role = 'entrada' OR camera_role IS NULL)
                  AND (ownership = 'primary' OR ownership IS NULL)
                """,
                [str(store.id), start, end],
            )
            row = cursor.fetchone()
            if row:
                totals["total_visitors"] = int(row[0] or 0)
                totals["avg_dwell_seconds"] = int(row[1] or 0)

            cursor.execute(
                """
                WITH traffic AS (
                    SELECT ts_bucket,
                           COALESCE(SUM(footfall), 0) AS footfall
                    FROM public.traffic_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                ),
                conversion AS (
                    SELECT ts_bucket,
                           COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                           COALESCE(AVG(staff_active_est), 0) AS avg_staff_active,
                           COALESCE(SUM(checkout_events), 0) AS checkout_events
                    FROM public.conversion_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                )
                SELECT COALESCE(AVG(conversion.queue_avg_seconds), 0) AS avg_queue_seconds,
                       COALESCE(AVG(conversion.avg_staff_active), 0) AS avg_staff_active,
                       COALESCE(
                           AVG(
                               CASE
                                   WHEN COALESCE(traffic.footfall, 0) > 0
                                   THEN (COALESCE(conversion.checkout_events, 0)::numeric / traffic.footfall::numeric) * 100
                                   ELSE 0
                               END
                           ),
                           0
                       ) AS avg_conversion_rate
                FROM conversion
                LEFT JOIN traffic ON traffic.ts_bucket = conversion.ts_bucket
                """,
                [str(store.id), start, end, str(store.id), start, end],
            )
            row = cursor.fetchone()
            if row:
                totals["avg_queue_seconds"] = int(row[0] or 0)
                totals["avg_staff_active"] = int(row[1] or 0)
                totals["avg_conversion_rate"] = float(row[2] or 0)

            cursor.execute(
                """
                SELECT z.id, z.name,
                       COALESCE(SUM(t.footfall), 0) AS footfall,
                       COALESCE(AVG(NULLIF(t.dwell_seconds_avg, 0)), 0) AS dwell_avg
                FROM public.store_zones z
                JOIN public.traffic_metrics t ON t.zone_id = z.id
                WHERE z.store_id = %s
                  AND t.ts_bucket >= %s
                  AND t.ts_bucket < %s
                  AND (t.ownership = 'primary' OR t.ownership IS NULL)
                GROUP BY z.id, z.name
                ORDER BY footfall DESC
                """,
                [str(store.id), start, end],
            )
            for row in cursor.fetchall():
                zones_breakdown.append(
                    {
                        "zone_id": str(row[0]),
                        "name": row[1],
                        "footfall": int(row[2] or 0),
                        "dwell_seconds_avg": int(row[3] or 0),
                    }
                )

        return Response(
            {
                "store_id": str(store.id),
                "from": start.isoformat(),
                "to": end.isoformat(),
                "bucket": bucket,
                "totals": totals,
                "series": {
                    "traffic": traffic_series,
                    "conversion": conversion_series,
                },
                "zones": zones_breakdown,
                "meta": {
                    "metric_governance": {
                        "totals": {
                            key: metric_governance[key]
                            for key in (
                                "total_visitors",
                                "avg_dwell_seconds",
                                "avg_queue_seconds",
                                "avg_staff_active",
                                "avg_conversion_rate",
                            )
                        },
                        "series": {
                            "traffic": metric_governance["total_visitors"],
                            "conversion": metric_governance["avg_conversion_rate"],
                        },
                        "zones": metric_governance["zones"],
                    }
                },
            }
        )

    @action(detail=True, methods=["get"], url_path="ceo-dashboard")
    def ceo_dashboard(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        self._require_subscription_for_store(store, "ceo_dashboard")

        tz = _get_org_timezone(store)
        period = (request.query_params.get("period") or "7d").lower()
        if period not in {"day", "7d"}:
            period = "7d"

        end = timezone.localtime(timezone.now(), tz)
        start = end - timedelta(days=1 if period == "day" else 7)

        traffic_by_hour = []
        conversion_by_hour = []
        metric_governance = _build_metric_governance()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT date_trunc('hour', ts_bucket AT TIME ZONE %s) AS bucket_local,
                       COALESCE(SUM(footfall), 0) AS footfall,
                       COALESCE(AVG(NULLIF(dwell_seconds_avg, 0)), 0) AS dwell_avg
                FROM public.traffic_metrics
                WHERE store_id = %s
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                  AND (camera_role = 'entrada' OR camera_role IS NULL)
                  AND (ownership = 'primary' OR ownership IS NULL)
                GROUP BY 1
                ORDER BY 1 ASC
                """,
                [tz.key, str(store.id), start, end],
            )
            for row in cursor.fetchall():
                bucket_local = row[0]
                if bucket_local and timezone.is_naive(bucket_local):
                    bucket_local = timezone.make_aware(bucket_local, tz)
                traffic_by_hour.append(
                    {
                        "ts_bucket": bucket_local.isoformat() if bucket_local else None,
                        "footfall": int(row[1] or 0),
                        "dwell_seconds_avg": int(row[2] or 0),
                        "hour_label": bucket_local.strftime("%H:00") if bucket_local else None,
                    }
                )

            cursor.execute(
                """
                WITH traffic AS (
                    SELECT date_trunc('hour', ts_bucket AT TIME ZONE %s) AS bucket_local,
                           COALESCE(SUM(footfall), 0) AS footfall
                    FROM public.traffic_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                ),
                conversion AS (
                    SELECT date_trunc('hour', ts_bucket AT TIME ZONE %s) AS bucket_local,
                           COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                           COALESCE(AVG(staff_active_est), 0) AS staff_active_est,
                           COALESCE(SUM(checkout_events), 0) AS checkout_events
                    FROM public.conversion_metrics
                    WHERE store_id = %s
                      AND ts_bucket >= %s
                      AND ts_bucket < %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                )
                SELECT COALESCE(conversion.bucket_local, traffic.bucket_local) AS bucket_local,
                       COALESCE(conversion.queue_avg_seconds, 0) AS queue_avg_seconds,
                       COALESCE(conversion.staff_active_est, 0) AS staff_active_est,
                       CASE
                           WHEN COALESCE(traffic.footfall, 0) > 0
                           THEN ROUND((COALESCE(conversion.checkout_events, 0)::numeric / traffic.footfall::numeric) * 100, 2)
                           ELSE 0
                       END AS conversion_rate
                FROM conversion
                FULL OUTER JOIN traffic ON traffic.bucket_local = conversion.bucket_local
                ORDER BY 1 ASC
                """,
                [tz.key, str(store.id), start, end, tz.key, str(store.id), start, end],
            )
            for row in cursor.fetchall():
                bucket_local = row[0]
                if bucket_local and timezone.is_naive(bucket_local):
                    bucket_local = timezone.make_aware(bucket_local, tz)
                conversion_by_hour.append(
                    {
                        "ts_bucket": bucket_local.isoformat() if bucket_local else None,
                        "queue_avg_seconds": int(row[1] or 0),
                        "staff_active_est": int(row[2] or 0),
                        "conversion_rate": float(row[3] or 0),
                        "hour_label": bucket_local.strftime("%H:00") if bucket_local else None,
                    }
                )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                WITH traffic AS (
                    SELECT ts_bucket,
                           COALESCE(SUM(footfall), 0) AS footfall
                    FROM public.traffic_metrics
                    WHERE store_id = %s
                      AND (camera_role = 'entrada' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                ),
                conversion AS (
                    SELECT ts_bucket,
                           COALESCE(AVG(queue_avg_seconds), 0) AS queue_avg_seconds,
                           COALESCE(AVG(staff_active_est), 0) AS staff_active_est,
                           COALESCE(SUM(checkout_events), 0) AS checkout_events
                    FROM public.conversion_metrics
                    WHERE store_id = %s
                      AND (camera_role = 'balcao' OR camera_role IS NULL)
                      AND (ownership = 'primary' OR ownership IS NULL)
                    GROUP BY 1
                )
                SELECT conversion.ts_bucket,
                       conversion.queue_avg_seconds,
                       conversion.staff_active_est,
                       CASE
                           WHEN COALESCE(traffic.footfall, 0) > 0
                           THEN ROUND((COALESCE(conversion.checkout_events, 0)::numeric / traffic.footfall::numeric) * 100, 2)
                           ELSE 0
                       END AS conversion_rate
                FROM conversion
                LEFT JOIN traffic ON traffic.ts_bucket = conversion.ts_bucket
                ORDER BY conversion.ts_bucket DESC
                LIMIT 1
                """,
                [str(store.id), str(store.id)],
            )
            latest_row = cursor.fetchone()

        latest_bucket = None
        queue_now_seconds = 0
        queue_now_people = 0
        if latest_row:
            latest_bucket = latest_row[0]
            if latest_bucket and timezone.is_naive(latest_bucket):
                latest_bucket = timezone.make_aware(latest_bucket, timezone.utc)
            queue_now_seconds = int(latest_row[1] or 0)
            queue_now_people = max(0, int(round(queue_now_seconds / 30)))

        traffic_avg_dwell = 0
        if traffic_by_hour:
            traffic_avg_dwell = int(
                round(sum(row["dwell_seconds_avg"] for row in traffic_by_hour) / len(traffic_by_hour))
            )

        conversion_avg_queue = 0
        conversion_avg_rate = 0.0
        if conversion_by_hour:
            conversion_avg_queue = int(
                round(sum(row["queue_avg_seconds"] for row in conversion_by_hour) / len(conversion_by_hour))
            )
            conversion_avg_rate = float(
                sum(row["conversion_rate"] for row in conversion_by_hour) / len(conversion_by_hour)
            )

        max_staff = max((row["staff_active_est"] for row in conversion_by_hour), default=0)
        traffic_map = {row["ts_bucket"]: row for row in traffic_by_hour if row.get("ts_bucket")}
        conversion_map = {row["ts_bucket"]: row for row in conversion_by_hour if row.get("ts_bucket")}
        all_buckets = sorted({*traffic_map.keys(), *conversion_map.keys()})

        idle_index_by_hour = []
        for bucket in all_buckets:
            staff_active = conversion_map.get(bucket, {}).get("staff_active_est", 0)
            footfall = traffic_map.get(bucket, {}).get("footfall", 0)
            idle_index = 0.0
            if max_staff > 0:
                idle_index = max(0.0, min(1.0, 1 - (staff_active / max_staff)))
            idle_index_by_hour.append(
                {
                    "ts_bucket": bucket,
                    "idle_index": round(idle_index, 3),
                    "staff_active_est": int(staff_active or 0),
                    "footfall": int(footfall or 0),
                }
            )

        flow_peak = max(traffic_by_hour, key=lambda x: x.get("footfall", 0), default=None)
        idle_peak = max(idle_index_by_hour, key=lambda x: x.get("idle_index", 0), default=None)
        flow_peak_label = flow_peak.get("hour_label") if flow_peak else None
        idle_peak_label = None
        if idle_peak:
            try:
                dt = datetime.fromisoformat(idle_peak.get("ts_bucket"))
                idle_peak_label = dt.strftime("%H:00")
            except Exception:
                idle_peak_label = None

        overlay_message = None
        if flow_peak_label and idle_peak_label:
            if flow_peak_label == idle_peak_label:
                overlay_message = f"Pico de fluxo e ociosidade no mesmo horário ({flow_peak_label})."
            else:
                overlay_message = (
                    f"Pico de fluxo às {flow_peak_label} e pico de ociosidade às {idle_peak_label}."
                )

        payload = {
            "store_id": str(store.id),
            "store_name": store.name,
            "timezone": tz.key,
            "period": period,
            "generated_at": timezone.now().isoformat(),
            "series": {
                "flow_by_hour": traffic_by_hour,
                "idle_index_by_hour": idle_index_by_hour,
            },
            "kpis": {
                "avg_dwell_seconds": traffic_avg_dwell,
                "avg_queue_seconds": conversion_avg_queue,
                "avg_conversion_rate": conversion_avg_rate,
                "queue_now_seconds": queue_now_seconds,
                "queue_now_people": queue_now_people,
                "queue_now_bucket": latest_bucket.isoformat() if latest_bucket else None,
                "queue_now_estimated": True,
            },
            "overlay": {
                "flow_peak_hour": flow_peak_label,
                "idle_peak_hour": idle_peak_label,
                "message": overlay_message,
            },
            "meta": {
                "idle_index_estimated": True,
                "idle_index_method": "staff_active_est_normalized",
                "queue_now_method": "last_bucket_queue_avg_seconds",
                "metric_governance": {
                    "avg_dwell_seconds": metric_governance["avg_dwell_seconds"],
                    "avg_queue_seconds": metric_governance["avg_queue_seconds"],
                    "avg_conversion_rate": metric_governance["avg_conversion_rate"],
                    "queue_now_people": metric_governance["queue_now_people"],
                    "idle_index": metric_governance["idle_index"],
                    "flow_by_hour": metric_governance["total_visitors"],
                },
            },
        }
        return Response(payload)

    @action(detail=True, methods=["get"], url_path="overview")
    def overview(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)

        summary_response = self.metrics_summary(request, pk=store.id)
        metrics_summary = summary_response.data if isinstance(summary_response, Response) else {}

        try:
            camera_qs = Camera.objects.filter(store_id=store.id).order_by("name")
        except Exception:
            camera_qs = Camera.objects.filter(store_id=store.id)
        cameras = list(
            camera_qs.values(
                "id",
                "name",
                "status",
                "last_seen_at",
                "last_snapshot_url",
                "last_error",
                "zone_id",
            )
        )
        cameras_out = [
            {
                **row,
                "id": str(row["id"]),
                "zone_id": str(row["zone_id"]) if row.get("zone_id") else None,
                "last_seen_at": row["last_seen_at"].isoformat() if row.get("last_seen_at") else None,
            }
            for row in cameras
        ]

        employees_qs = Employee.objects.filter(store_id=store.id, active=True).order_by("full_name")
        employees = list(
            employees_qs.values(
                "id",
                "full_name",
                "role",
                "email",
                "active",
            )
        )
        employees_out = [
            {**row, "id": str(row["id"])}
            for row in employees
        ]

        alerts_qs = (
            DetectionEvent.objects.filter(store_id=store.id)
            .order_by("-occurred_at")
            .values(
                "id",
                "title",
                "severity",
                "status",
                "occurred_at",
                "created_at",
                "type",
            )[:10]
        )
        alerts_out = [
            {
                **row,
                "id": str(row["id"]),
                "occurred_at": row["occurred_at"].isoformat() if row.get("occurred_at") else None,
                "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
            }
            for row in alerts_qs
        ]

        payload = {
            "store": {
                "id": str(store.id),
                "name": store.name,
                "city": store.city,
                "state": store.state,
                "status": store.status,
                "employees_count": store.employees_count,
                "trial_ends_at": store.trial_ends_at.isoformat() if store.trial_ends_at else None,
            },
            "metrics_summary": metrics_summary,
            "edge_health": {
                "last_seen_at": store.last_seen_at.isoformat() if store.last_seen_at else None,
                "last_error": store.last_error,
            },
            "cameras": cameras_out,
            "employees": employees_out,
            "last_alerts": alerts_out,
        }
        return Response(payload)

    @action(detail=True, methods=["get"], url_path="productivity/evidence")
    def productivity_evidence(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        self._require_subscription_for_store(store, "productivity_evidence")

        tz = _get_org_timezone(store)
        hour_bucket = request.query_params.get("hour_bucket")
        start = _parse_dt(hour_bucket, tz)
        if not start:
            return _error_response(
                "INVALID_HOUR_BUCKET",
                "hour_bucket inválido.",
                status.HTTP_400_BAD_REQUEST,
                deprecated_detail="hour_bucket inválido.",
            )
        end = start + timedelta(hours=1)

        events_qs = (
            DetectionEvent.objects.filter(store_id=store.id, occurred_at__gte=start, occurred_at__lt=end)
            .order_by("-occurred_at")
            .values("id", "title", "severity", "status", "occurred_at", "camera_id", "zone_id", "metadata", "type")
        )

        events = [
            {
                "id": str(row["id"]),
                "title": row.get("title"),
                "severity": row.get("severity"),
                "status": row.get("status"),
                "occurred_at": row["occurred_at"].isoformat() if row.get("occurred_at") else None,
                "camera_id": str(row["camera_id"]) if row.get("camera_id") else None,
                "zone_id": str(row["zone_id"]) if row.get("zone_id") else None,
                "metadata": row.get("metadata") or {},
                "type": row.get("type"),
                "media": [],
            }
            for row in events_qs[:12]
        ]

        return Response(
            {
                "store_id": str(store.id),
                "hour_bucket": start.isoformat(),
                "events": events,
            }
        )

    @action(detail=True, methods=["get"], url_path="productivity/coverage")
    def productivity_coverage(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        self._require_subscription_for_store(store, "productivity_coverage")

        tz = _get_org_timezone(store)
        period = (request.query_params.get("period") or "7d").lower()
        start = _parse_dt(request.query_params.get("from"), tz)
        end = _parse_dt(request.query_params.get("to"), tz)
        if not end:
            end = timezone.now()
        if not start:
            days = 7
            if period == "30d":
                days = 30
            elif period == "90d":
                days = 90
            start = end - timedelta(days=days)

        windows = []
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    ts_bucket,
                    window_minutes,
                    metrics_json,
                    metric_status_json,
                    confidence_score,
                    source_flags_json
                FROM public.operational_window_hourly
                WHERE store_id = %s
                  AND ts_bucket >= %s
                  AND ts_bucket < %s
                ORDER BY ts_bucket ASC
                """,
                [str(store.id), start, end],
            )
            for ts_bucket, window_minutes, metrics_json, metric_status_json, confidence_score, source_flags_json in cursor.fetchall():
                metrics_json = metrics_json if isinstance(metrics_json, dict) else {}
                metric_status_json = metric_status_json if isinstance(metric_status_json, dict) else {}
                source_flags_json = source_flags_json if isinstance(source_flags_json, dict) else {}
                gap = int(metrics_json.get("coverage_gap") or 0)
                windows.append(
                    {
                        "ts_bucket": ts_bucket.isoformat() if ts_bucket else None,
                        "hour_label": timezone.localtime(ts_bucket, tz).strftime("%H:%M") if ts_bucket else None,
                        "window_minutes": int(window_minutes or 5),
                        "footfall": int(metrics_json.get("footfall") or 0),
                        "staff_planned_ref": int(metrics_json.get("staff_planned") or 0),
                        "staff_detected_est": float(metrics_json.get("staff_detected_avg") or 0),
                        "coverage_gap": gap,
                        "gap_status": "critica" if gap >= 2 else "atencao" if gap == 1 else "adequada",
                        "source_flags": metric_status_json,
                        "confidence_score": int(confidence_score or 0),
                        "method": {
                            "id": "operational_window",
                            "version": source_flags_json.get("method_version") or "operational_window_v1_2026-03-14",
                        },
                    }
                )

        critical_windows = [window for window in windows if int(window["coverage_gap"]) >= 2]
        warning_windows = [window for window in windows if int(window["coverage_gap"]) == 1]
        best_windows = [window for window in windows if int(window["coverage_gap"]) == 0]
        worst_window = max(windows, key=lambda item: int(item["coverage_gap"])) if windows else None
        best_window = max(best_windows, key=lambda item: int(item["footfall"])) if best_windows else None
        peak_flow_window = max(windows, key=lambda item: int(item["footfall"])) if windows else None
        opportunity_window = min(windows, key=lambda item: int(item["coverage_gap"])) if windows else None
        confidence_score = (
            int(round(sum(int(window.get("confidence_score") or 0) for window in windows) / len(windows)))
            if windows
            else 0
        )
        confidence_status = "insuficiente"
        if windows:
            confidence_status = "alto" if confidence_score >= 85 else "parcial"

        payload = {
            "period": period,
            "from": start.isoformat() if start else None,
            "to": end.isoformat() if end else None,
            "store_id": str(store.id),
            "stores_count": 1,
            "method": {
                "id": "productivity_coverage",
                "version": "coverage_operational_window_v1_2026-03-14",
                "label": "Cobertura operacional por janela de 5 minutos",
                "description": "Compara fluxo e presença detectada contra referência de staff planejado por janela operacional.",
            },
            "confidence_governance": {
                "status": confidence_status,
                "score": confidence_score,
                "source_flags": {
                    "footfall": "official",
                    "staff_planned_ref": "proxy",
                    "staff_detected_est": "official",
                    "coverage_gap": "proxy",
                },
                "caveats": [
                    "Escala planejada ainda sem integração ERP/WFM; referência pode ser proxy da loja.",
                    "Presença real é agregada por visão computacional sem identificação nominal.",
                    "Indicador orientado à decisão operacional executiva.",
                ],
            },
            "summary": {
                "gaps_total": int(sum(int(window["coverage_gap"]) for window in windows)),
                "critical_windows": len(critical_windows),
                "warning_windows": len(warning_windows),
                "adequate_windows": len(best_windows),
                "worst_window": worst_window,
                "best_window": best_window,
                "peak_flow_window": peak_flow_window,
                "opportunity_window": opportunity_window,
                "planned_source_mode": "proxy",
            },
            "windows": windows,
        }
        return Response(payload)

    @action(detail=True, methods=["get"], url_path="vision/audit")
    def vision_audit(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        self._require_subscription_for_store(store, "vision_audit")

        tz = _get_org_timezone(store)
        start = _parse_dt(request.query_params.get("from"), tz)
        end = _parse_dt(request.query_params.get("to"), tz)
        if not end:
            end = timezone.now()
        if not start:
            start = end - timedelta(days=1)

        event_type = (request.query_params.get("event_type") or "").strip() or None
        event_source = (request.query_params.get("event_source") or "vision").strip().lower()
        if event_source not in {"vision", "retail", "all"}:
            event_source = "vision"
        camera_id = (request.query_params.get("camera_id") or "").strip() or None
        zone_id = (request.query_params.get("zone_id") or "").strip() or None
        roi_entity_id = (request.query_params.get("roi_entity_id") or "").strip() or None
        limit_raw = request.query_params.get("limit") or "100"
        try:
            limit = max(1, min(500, int(limit_raw)))
        except Exception:
            limit = 100

        items = []
        summary = {}
        retail_items = []
        retail_summary = {}
        with connection.cursor() as cursor:
            if event_source in {"vision", "all"}:
                filters = [
                    "store_id = %s",
                    "ts >= %s",
                    "ts < %s",
                ]
                params = [str(store.id), start, end]
                if event_type:
                    filters.append("event_type = %s")
                    params.append(event_type)
                if camera_id:
                    filters.append("camera_id = %s")
                    params.append(camera_id)
                if zone_id:
                    filters.append("zone_id = %s")
                    params.append(zone_id)
                if roi_entity_id:
                    filters.append("roi_entity_id = %s")
                    params.append(roi_entity_id)

                where_sql = " AND ".join(filters)

                cursor.execute(
                    f"""
                    SELECT event_type, COUNT(*)
                    FROM public.vision_atomic_events
                    WHERE {where_sql}
                    GROUP BY 1
                    ORDER BY 1 ASC
                    """,
                    params,
                )
                for row in cursor.fetchall():
                    summary[str(row[0])] = int(row[1] or 0)

                cursor.execute(
                    f"""
                    SELECT
                        receipt_id,
                        event_type,
                        camera_id,
                        camera_role,
                        zone_id,
                        roi_entity_id,
                        roi_version,
                        metric_type,
                        ownership,
                        direction,
                        count_value,
                        staff_active_est,
                        duration_seconds,
                        confidence,
                        track_id_hash,
                        ts,
                        raw_payload
                    FROM public.vision_atomic_events
                    WHERE {where_sql}
                    ORDER BY ts DESC
                    LIMIT %s
                    """,
                    [*params, limit],
                )
                for row in cursor.fetchall():
                    items.append(
                        {
                            "receipt_id": row[0],
                            "event_type": row[1],
                            "camera_id": row[2],
                            "camera_role": row[3],
                            "zone_id": row[4],
                            "roi_entity_id": row[5],
                            "roi_version": row[6],
                            "metric_type": row[7],
                            "ownership": row[8],
                            "direction": row[9],
                            "count_value": int(row[10] or 0),
                            "staff_active_est": int(row[11] or 0) if row[11] is not None else None,
                            "duration_seconds": int(row[12] or 0) if row[12] is not None else None,
                            "confidence": float(row[13]) if row[13] is not None else None,
                            "track_id_hash": row[14],
                            "ts": row[15].isoformat() if row[15] else None,
                            "raw_payload": row[16] or {},
                        }
                    )

            if event_source in {"retail", "all"}:
                retail_filters = [
                    "event_name LIKE 'retail_%'",
                    "ts >= %s",
                    "ts < %s",
                    "((raw->'data'->>'store_id') = %s OR (meta->>'store_id') = %s)",
                ]
                retail_params = [start, end, str(store.id), str(store.id)]
                if event_type:
                    normalized_retail = event_type if event_type.startswith("retail_") else f"retail_{event_type}"
                    retail_filters.append("event_name = %s")
                    retail_params.append(normalized_retail)
                if camera_id:
                    retail_filters.append("(raw->'data'->>'camera_id') = %s")
                    retail_params.append(camera_id)
                if zone_id:
                    retail_filters.append("(raw->'data'->>'zone_id') = %s")
                    retail_params.append(zone_id)
                if roi_entity_id:
                    retail_filters.append("(raw->'data'->>'roi_entity_id') = %s")
                    retail_params.append(roi_entity_id)

                retail_where_sql = " AND ".join(retail_filters)

                cursor.execute(
                    f"""
                    SELECT event_name, COUNT(*)
                    FROM public.event_receipts
                    WHERE {retail_where_sql}
                    GROUP BY 1
                    ORDER BY 1 ASC
                    """,
                    retail_params,
                )
                for row in cursor.fetchall():
                    retail_summary[str(row[0])] = int(row[1] or 0)

                cursor.execute(
                    f"""
                    SELECT event_id, event_name, ts, raw, meta, source
                    FROM public.event_receipts
                    WHERE {retail_where_sql}
                    ORDER BY ts DESC
                    LIMIT %s
                    """,
                    [*retail_params, limit],
                )
                for row in cursor.fetchall():
                    retail_items.append(
                        {
                            "receipt_id": row[0],
                            "event_name": row[1],
                            "ts": row[2].isoformat() if row[2] else None,
                            "raw_payload": row[3] or {},
                            "meta": row[4] or {},
                            "source": row[5],
                        }
                    )

        return Response(
            {
                "store_id": str(store.id),
                "from": start.isoformat(),
                "to": end.isoformat(),
                "filters": {
                    "event_source": event_source,
                    "event_type": event_type,
                    "camera_id": camera_id,
                    "zone_id": zone_id,
                    "roi_entity_id": roi_entity_id,
                    "limit": limit,
                },
                "summary": summary,
                "items": items,
                "retail_summary": retail_summary,
                "retail_items": retail_items,
            }
        )

    @action(detail=True, methods=["get"], url_path="vision/confidence")
    def vision_confidence(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        self._require_subscription_for_store(store, "vision_confidence")

        window_hours_raw = request.query_params.get("window_hours") or "24"
        try:
            window_hours = max(1, min(168, int(window_hours_raw)))
        except Exception:
            window_hours = 24
        snapshot = _build_vision_confidence_snapshot(store, window_hours=window_hours)

        return Response(
            {
                "store_id": str(store.id),
                "generated_at": timezone.now().isoformat(),
                "window_hours": window_hours,
                "store_status": snapshot["store_status"],
                "summary": snapshot["summary"],
                "cameras": snapshot["cameras"],
            }
        )

    @action(detail=True, methods=["get"], url_path="vision/calibration-plan")
    def vision_calibration_plan(self, request, pk=None):
        store = self.get_object()
        require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
        self._require_subscription_for_store(store, "vision_calibration_plan")

        window_hours_raw = request.query_params.get("window_hours") or "24"
        try:
            window_hours = max(1, min(168, int(window_hours_raw)))
        except Exception:
            window_hours = 24

        snapshot = _build_vision_confidence_snapshot(store, window_hours=window_hours)
        actions, action_summary = _build_calibration_actions(snapshot["cameras"])

        return Response(
            {
                "store_id": str(store.id),
                "generated_at": timezone.now().isoformat(),
                "window_hours": window_hours,
                "store_status": snapshot["store_status"],
                "summary": {
                    **snapshot["summary"],
                    **action_summary,
                },
                "actions": actions,
            }
        )

    @action(detail=True, methods=["get", "post"], url_path="vision/calibration-runs")
    def vision_calibration_runs(self, request, pk=None):
        store = self.get_object()
        if request.method.lower() == "post":
            require_store_role(request.user, str(store.id), ALLOWED_MANAGE_ROLES)
            action_name = "vision_calibration_runs_write"
        else:
            require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
            action_name = "vision_calibration_runs"
        self._require_subscription_for_store(store, action_name)

        if request.method.lower() == "get":
            limit_raw = request.query_params.get("limit") or "20"
            camera_id = (request.query_params.get("camera_id") or "").strip() or None
            metric_type = (request.query_params.get("metric_type") or "").strip() or None
            try:
                limit = max(1, min(100, int(limit_raw)))
            except Exception:
                limit = 20

            qs = StoreCalibrationRun.objects.filter(store_id=store.id).order_by("-approved_at", "-created_at")
            if camera_id:
                qs = qs.filter(camera_id=camera_id)
            if metric_type:
                qs = qs.filter(metric_type=metric_type)
            items = [_serialize_calibration_run(row) for row in qs[:limit]]
            return Response(
                {
                    "store_id": str(store.id),
                    "filters": {
                        "camera_id": camera_id,
                        "metric_type": metric_type,
                        "limit": limit,
                    },
                    "items": items,
                }
            )

        payload = request.data or {}
        camera_id = str(payload.get("camera_id") or "").strip()
        metric_type = str(payload.get("metric_type") or "").strip()
        if not camera_id or not metric_type:
            return _error_response(
                "INVALID_CALIBRATION_INPUT",
                "camera_id e metric_type sao obrigatorios.",
                status.HTTP_400_BAD_REQUEST,
                deprecated_detail="camera_id e metric_type sao obrigatorios.",
            )

        if metric_type not in {"entry_exit", "queue", "checkout_proxy", "occupancy"}:
            return _error_response(
                "INVALID_CALIBRATION_METRIC",
                "metric_type invalido.",
                status.HTTP_400_BAD_REQUEST,
                deprecated_detail="metric_type invalido.",
            )

        camera = Camera.objects.filter(store_id=store.id, id=camera_id).first()
        if not camera:
            return _error_response(
                "CAMERA_NOT_FOUND",
                "Camera nao encontrada para a loja.",
                status.HTTP_404_NOT_FOUND,
                deprecated_detail="Camera nao encontrada para a loja.",
            )

        def _to_int(value):
            if value in (None, ""):
                return None
            return int(value)

        def _to_float(value):
            if value in (None, ""):
                return None
            return float(value)

        try:
            manual_sample_size = _to_int(payload.get("manual_sample_size"))
            manual_reference_value = _to_float(payload.get("manual_reference_value"))
            system_value = _to_float(payload.get("system_value"))
            error_pct = _to_float(payload.get("error_pct"))
        except Exception:
            return _error_response(
                "INVALID_CALIBRATION_VALUES",
                "Valores numericos invalidos na calibracao.",
                status.HTTP_400_BAD_REQUEST,
                deprecated_detail="Valores numericos invalidos na calibracao.",
            )

        if error_pct is None and manual_reference_value not in (None, 0) and system_value is not None:
            error_pct = round(abs(system_value - manual_reference_value) / abs(manual_reference_value) * 100, 2)

        try:
            actor_user_id = ensure_user_uuid(request.user)
        except Exception:
            actor_user_id = None

        published = get_latest_published_roi_config(str(camera.id))
        roi_config = published.config_json if published and isinstance(published.config_json, dict) else {}
        roi_version = str(payload.get("roi_version") or roi_config.get("roi_version") or "") or None
        status_value = str(payload.get("status") or "approved").strip() or "approved"
        approved_at = timezone.now() if status_value == "approved" else None
        notes = str(payload.get("notes") or "").strip() or None

        row = StoreCalibrationRun.objects.create(
            store_id=store.id,
            camera_id=camera.id,
            metric_type=metric_type,
            roi_version=roi_version,
            manual_sample_size=manual_sample_size,
            manual_reference_value=manual_reference_value,
            system_value=system_value,
            error_pct=error_pct,
            approved_by=actor_user_id,
            approved_at=approved_at,
            notes=notes,
            status=status_value,
            created_at=timezone.now(),
            updated_at=timezone.now(),
        )
        return Response(_serialize_calibration_run(row), status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def network_dashboard(self, request):
        """Dashboard para redes com múltiplas lojas (seu segundo design)"""
        try:
            self._require_subscription_for_org_ids(get_user_org_ids(request.user), "network_dashboard")
            stores = list(self.get_queryset())
            total_stores = len(stores)
            active_stores = len([s for s in stores if getattr(s, "status", None) in ("active", "trial")])

            network_data = {
                'network': {
                    'total_stores': total_stores,
                    'active_stores': active_stores,
                    'total_visitors': 0,
                    'avg_conversion': 0,
                },
                'stores': []
            }
            return Response(network_data)
        except (ProgrammingError, ObjectDoesNotExist) as exc:
            print(f"[WARN] network_dashboard fallback: {exc}")
            return Response({
                'network': {
                    'total_stores': 0,
                    'active_stores': 0,
                    'total_visitors': 0,
                    'avg_conversion': 0,
                },
                'stores': []
            })


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Employee.objects.all()
        user = self.request.user
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return qs
        org_ids = get_user_org_ids(user)
        if not org_ids:
            return qs.none()
        store_ids = Store.objects.filter(org_id__in=org_ids).values_list("id", flat=True)
        return qs.filter(store_id__in=list(store_ids))

    def _require_store_access(self, user, store: Store):
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return
        org_ids = get_user_org_ids(user)
        if not org_ids or str(store.org_id) not in {str(o) for o in org_ids}:
            raise PermissionDenied("Você não tem acesso a esta loja.")

    def create(self, request, *args, **kwargs):
        is_many = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=is_many)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            logger.warning(
                "[EMPLOYEE] validation error user_id=%s payload=%s errors=%s",
                getattr(request.user, "id", None),
                request.data,
                getattr(exc, "detail", None) or str(exc),
            )
            raise
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.request.user
        if isinstance(serializer.validated_data, list):
            for item in serializer.validated_data:
                store = item.get("store")
                if store:
                    self._require_store_access(user, store)
        else:
            store = serializer.validated_data.get("store")
            if store:
                self._require_store_access(user, store)
        serializer.save()
