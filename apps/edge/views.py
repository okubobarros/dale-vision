# apps/edge/views.py
from uuid import UUID
import hashlib
import json
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from django.db import connection, models
from django.test.testcases import DatabaseOperationForbidden
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.permissions import AllowAny
from knox.auth import TokenAuthentication

from .serializers import EdgeEventSerializer
from .models import EdgeEventMinuteStats
from .auth import authenticate_edge_token

from apps.alerts.views import AlertRuleViewSet
from apps.core.models import Camera, CameraHealthLog
from apps.core.models import Store
from apps.stores.services.user_uuid import ensure_user_uuid
from apps.stores.services.user_orgs import get_user_org_ids
from apps.stores.views import _serialize_cameras_for_edge
from apps.stores.views_edge_status import classify_age, compute_store_edge_status_snapshot
from apps.cameras.limits import enforce_trial_camera_limit
from apps.cameras.services import rtsp_probe_with_hard_timeout
from apps.billing.utils import PaywallError
from .status_events import emit_store_status_changed, emit_camera_status_changed
from .vision_metrics import (
    insert_event_receipt_if_new,
    insert_vision_atomic_event_if_new,
    apply_vision_metrics,
    apply_vision_crossing,
    apply_vision_queue_state,
    apply_vision_checkout_proxy,
    apply_vision_zone_occupancy,
    mark_event_receipt_processed,
    mark_event_receipt_failed,
)
from apps.core.services.journey_events import log_journey_event


def _is_uuid(x: str) -> bool:
    try:
        UUID(str(x))
        return True
    except Exception:
        return False

def _extract_store_id(payload: dict):
    if not isinstance(payload, dict):
        return None
    data = payload.get("data") or {}
    return (
        data.get("store_id")
        or payload.get("store_id")
        or (payload.get("agent") or {}).get("store_id")
    )

def _compute_receipt_id(payload: dict) -> str:
    event_name = str(payload.get("event_name") or "")
    data = payload.get("data") or {}
    ts = payload.get("ts") or data.get("ts")
    parsed_ts = _parse_edge_ts(ts) or timezone.now()

    # Vision events use minute-bucket idempotency to absorb retries from edge.
    if event_name.startswith("vision."):
        ts_bucket = parsed_ts.replace(second=0, microsecond=0).isoformat()
        base = {
            "event_name": event_name,
            "store_id": data.get("store_id") or payload.get("store_id"),
            "camera_id": data.get("camera_id") or payload.get("camera_id"),
            "roi_entity_id": data.get("roi_entity_id"),
            "metric_type": data.get("metric_type"),
            "ts_bucket": ts_bucket,
            "event_version": payload.get("event_version", 1),
        }
    elif event_name == "retail.event.v1":
        minute = parsed_ts.minute - (parsed_ts.minute % 5)
        ts_bucket = parsed_ts.replace(minute=minute, second=0, microsecond=0).isoformat()
        base = {
            "event_name": event_name,
            "store_id": data.get("store_id") or payload.get("store_id"),
            "event_type": data.get("event_type"),
            "value": data.get("value"),
            "source": data.get("source") or payload.get("source") or "edge",
            "ts_bucket_5m": ts_bucket,
            "event_version": payload.get("event_version", 1),
        }
    else:
        base = {
            "event_name": event_name,
            "store_id": data.get("store_id") or payload.get("store_id"),
            "camera_id": data.get("camera_id") or payload.get("camera_id"),
            "ts": ts,
            "event_version": payload.get("event_version", 1),
        }
    raw = json.dumps(base, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def _normalize_ingest_event_name(event_name: str, payload: dict, data: dict) -> str:
    event_type = payload.get("event_type") or data.get("event_type") or event_name
    normalized = (event_type or "").replace(".", "_").lower()
    if str(event_name or "") == "retail.event.v1" and normalized:
        if not normalized.startswith("retail_"):
            return f"retail_{normalized}"
    return normalized


def _canonical_ingest_event_name(event_name: str, payload: dict, data: dict) -> str:
    raw_name = str(event_name or "").strip().lower()
    if not raw_name:
        return raw_name

    # Keep legacy non-retail names stable for backward compatibility.
    if raw_name != "retail.event.v1":
        return raw_name

    event_type = str(payload.get("event_type") or data.get("event_type") or "").strip().lower()
    if not event_type:
        return raw_name
    if event_type.startswith("retail."):
        return event_type if event_type.endswith(".v1") else f"{event_type}.v1"
    if event_type.startswith("retail_"):
        event_type = event_type[len("retail_") :]
    return f"retail.{event_type}.v1"


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


def _resolve_edge_ts(data: dict, payload: dict):
    ts = (data or {}).get("ts") or payload.get("ts")
    return _parse_edge_ts(ts) or timezone.now()


def _camera_name_for_write(*, incoming_name: str, external_id: str, existing_name: str) -> str:
    candidate = (incoming_name or "").strip() or (external_id or "").strip() or "camera"
    # Preserve human-readable names already in DB when incoming payload only has UUID-ish labels.
    if _is_uuid(candidate):
        current = (existing_name or "").strip()
        if current and not _is_uuid(current):
            return current
    return candidate


def _first_non_empty(*values):
    for value in values:
        if value is None:
            continue
        if isinstance(value, str):
            candidate = value.strip()
            if candidate:
                return candidate
            continue
        if isinstance(value, (dict, list, tuple, set)):
            if len(value) > 0:
                return value
            continue
        return value
    return None


def _validate_vision_contract(event_name: str, payload: dict, data: dict):
    if not str(event_name or "").startswith("vision."):
        return True, []

    traffic = data.get("traffic") if isinstance(data.get("traffic"), dict) else {}
    conversion = data.get("conversion") if isinstance(data.get("conversion"), dict) else {}

    camera_id = _first_non_empty(data.get("camera_id"), payload.get("camera_id"), data.get("external_id"))
    ts_raw = _first_non_empty(data.get("ts"), payload.get("ts"))
    metric_type = _first_non_empty(
        data.get("metric_type"),
        traffic.get("metric_type"),
        conversion.get("metric_type"),
    )
    ownership = _first_non_empty(
        data.get("ownership"),
        traffic.get("ownership"),
        conversion.get("ownership"),
    )
    roi_entity_id = _first_non_empty(
        data.get("roi_entity_id"),
        traffic.get("roi_entity_id"),
        conversion.get("roi_entity_id"),
    )

    missing = []
    if not camera_id:
        missing.append("camera_id")
    if not ts_raw:
        missing.append("ts")
    elif _parse_edge_ts(ts_raw) is None:
        missing.append("ts")
    if not metric_type:
        missing.append("metric_type")
    if ownership is None:
        missing.append("ownership")
    if not roi_entity_id:
        missing.append("roi_entity_id")

    return len(missing) == 0, missing


def _validate_retail_event_contract(event_name: str, payload: dict, data: dict):
    if str(event_name or "") != "retail.event.v1":
        return True, {}

    required_fields = ("store_id", "ts", "event_type", "value", "source", "confidence")
    missing = [field for field in required_fields if data.get(field) in (None, "", [])]
    errors = {}
    if missing:
        errors["missing_fields"] = missing

    allowed_types = {
        "person_enter",
        "person_exit",
        "queue_detected",
        "queue_length",
        "sale_completed",
        "staff_detected",
        "zone_dwell",
    }
    event_type = str(data.get("event_type") or "").strip()
    if event_type and event_type not in allowed_types:
        errors["event_type"] = f"unsupported_event_type:{event_type}"

    confidence = data.get("confidence")
    try:
        confidence_value = float(confidence)
        if confidence_value > 1:
            confidence_value = confidence_value / 100.0
        if confidence_value < 0 or confidence_value > 1:
            errors["confidence"] = "confidence_must_be_between_0_and_1_or_0_to_100"
    except (TypeError, ValueError):
        if confidence not in (None, ""):
            errors["confidence"] = "confidence_must_be_numeric"

    ts_raw = data.get("ts") or payload.get("ts")
    if ts_raw and _parse_edge_ts(ts_raw) is None:
        errors["ts"] = "invalid_iso_ts"

    return len(errors) == 0, errors


def _update_store_last_seen(store_id: str, ts_dt):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE public.stores
                SET last_seen_at = %s,
                    last_error = NULL,
                    updated_at = now()
                WHERE id = %s
                """,
                [ts_dt, store_id],
            )
    except Exception:
        logger.exception("[WARN] store last_seen_at update failed")


def _touch_store_seen(store_id: str):
    try:
        Store.objects.filter(id=store_id).update(
            last_seen_at=timezone.now(),
            last_error=None,
            updated_at=timezone.now(),
        )
    except Exception:
        logger.exception("[WARN] store touch update failed")


def _floor_minute(ts_dt):
    if not ts_dt:
        return None
    return ts_dt.replace(second=0, microsecond=0)


def _bump_event_minute(store_id: str, event_name: str, ts_dt):
    minute_bucket = _floor_minute(ts_dt)
    if not minute_bucket:
        return
    try:
        row, created = EdgeEventMinuteStats.objects.get_or_create(
            store_id=store_id,
            event_name=str(event_name or "")[:64],
            minute_bucket=minute_bucket,
            defaults={
                "count": 1,
                "last_event_at": ts_dt,
                "created_at": timezone.now(),
                "updated_at": timezone.now(),
            },
        )
        if not created:
            EdgeEventMinuteStats.objects.filter(id=row.id).update(
                count=models.F("count") + 1,
                last_event_at=ts_dt,
                updated_at=timezone.now(),
            )
    except DatabaseOperationForbidden:
        # SimpleTestCase blocks DB access; ignore in tests.
        return
    except Exception:
        logger.exception("[EDGE] event minute stats failed store=%s event=%s", store_id, event_name)

logger = logging.getLogger(__name__)

class EdgeEventsIngestView(APIView):
    """
    POST /api/edge/events/
    Recebe envelope do Edge Agent:
      - edge_heartbeat
      - edge_metric_bucket
      - alert
    Faz:
      - valida envelope
      - dedupe por receipt_id (event_receipts canônico)
      - encaminha "alert" para AlertRuleViewSet.ingest (internamente)
      - para edge_metric_bucket / heartbeat: só registra receipt e retorna ok
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def _get_service_user(self):
        """
        Usuário interno que será usado para chamar o ingest do Alerts.
        """
        username = getattr(settings, "EDGE_SERVICE_USERNAME", "edge-agent")
        User = get_user_model()
        u = User.objects.filter(username=username).first()
        return u

    def _is_edge_request(self, request, validated_data=None):
        payload = validated_data if isinstance(validated_data, dict) else request.data
        store_id = _extract_store_id(payload)
        return authenticate_edge_token(request, requested_store_id=store_id if store_id else None)

    def _user_has_store_access(self, user, store_id: str) -> bool:
        org_ids = get_user_org_ids(user)
        return Store.objects.filter(id=store_id, org_id__in=org_ids).exists()

    def post(self, request):
        ser = EdgeEventSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"detail": "payload inválido", "errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        validated = ser.validated_data
        payload = request.data  # salva raw json

        event_name = validated.get("event_name")
        source = validated.get("source") or "edge"
        receipt_id = (
            validated.get("idempotency_key")
            or validated.get("receipt_id")
            or ""
        )
        data = validated.get("data") or {}
        store_id = (
            data.get("store_id")
            or payload.get("store_id")
            or (payload.get("agent") or {}).get("store_id")
        )
        normalized = _normalize_ingest_event_name(event_name, payload, data)
        canonical_event_name = _canonical_ingest_event_name(event_name, payload, data)

        if not event_name:
            return Response({"detail": "event_name ausente."}, status=status.HTTP_400_BAD_REQUEST)

        user_auth = TokenAuthentication().authenticate(request)
        if user_auth:
            user, _ = user_auth
            try:
                ensure_user_uuid(user)
                if not self._user_has_store_access(user, store_id):
                    print("[EDGE] user has no access to store")
                    return Response({"detail": "Usuário sem acesso à store."}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({"detail": "Usuário não autenticado."}, status=status.HTTP_403_FORBIDDEN)
        else:
            auth_result = self._is_edge_request(request, validated)
            if not auth_result.ok:
                return Response(
                    {
                        "code": auth_result.code or "edge_token_invalid",
                        "detail": auth_result.detail or "Edge token inválido.",
                    },
                    status=auth_result.status_code or status.HTTP_401_UNAUTHORIZED,
                )
            if not store_id:
                store_id = auth_result.store_id
                data = dict(data)
                data["store_id"] = store_id
                payload = dict(payload)
                payload["store_id"] = store_id

        if not store_id or not _is_uuid(store_id):
            return Response({"detail": "store_id inválido ou ausente."}, status=status.HTTP_400_BAD_REQUEST)

        contract_ok, contract_missing = _validate_vision_contract(event_name=event_name, payload=payload, data=data)
        if not contract_ok:
            logger.warning(
                "[EDGE] vision contract invalid event=%s store=%s missing=%s",
                event_name,
                store_id,
                ",".join(contract_missing),
            )
            return Response(
                {
                    "ok": False,
                    "stored": False,
                    "reason": "vision_contract_invalid",
                    "contract_version": "vision_event_v1",
                    "missing_fields": contract_missing,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        retail_contract_ok, retail_contract_errors = _validate_retail_event_contract(
            event_name=event_name, payload=payload, data=data
        )
        if not retail_contract_ok:
            logger.warning(
                "[EDGE] retail event contract invalid event=%s store=%s errors=%s",
                event_name,
                store_id,
                retail_contract_errors,
            )
            return Response(
                {
                    "ok": False,
                    "stored": False,
                    "reason": "retail_event_contract_invalid",
                    "contract_version": "retail_event_v1",
                    "errors": retail_contract_errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- update store last_seen_at for heartbeat events (idempotent) ---
        if normalized in ("edge_heartbeat", "camera_heartbeat", "edge_camera_heartbeat"):
            if Store.objects.filter(id=store_id).exists():
                ts_dt = _resolve_edge_ts(data, payload)
                _update_store_last_seen(store_id, ts_dt)

        # --- validar camera para eventos que dependem dela ---
        camera_id = data.get("camera_id") or payload.get("camera_id") or data.get("external_id")
        camera_obj = None
        if camera_id and normalized not in ("edge_heartbeat", "camera_heartbeat", "edge_camera_heartbeat"):
            camera_qs = Camera.objects.filter(store_id=store_id)
            camera_obj = camera_qs.filter(external_id=camera_id).first()
            if camera_obj is None and _is_uuid(camera_id):
                camera_obj = camera_qs.filter(id=camera_id).first()
            if camera_obj is None:
                camera_obj = camera_qs.filter(name=camera_id).first()
            if camera_obj is None:
                return Response(
                    {"detail": "camera not found", "stored": False, "reason": "camera_not_found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # --- dedupe por receipt_id no recibo canônico ---
        stored = False
        deduped = False
        if not receipt_id:
            receipt_id = _compute_receipt_id(payload)
        try:
            created = insert_event_receipt_if_new(
                event_id=receipt_id,
                event_name=canonical_event_name,
                payload=payload,
                source=source or "edge",
            )
        except (OperationalError, ProgrammingError):
            logger.exception("[EDGE] receipt write failed")
            return Response(
                {"ok": False, "stored": False, "reason": "db_write_failed"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception("[EDGE] receipt write failed")
            return Response(
                {"ok": False, "stored": False, "reason": "db_write_failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        if not created:
            deduped = True
            _touch_store_seen(store_id)
            try:
                ts_dt = _resolve_edge_ts(data, payload)
                _bump_event_minute(store_id, event_name, ts_dt)
            except Exception:
                pass
            try:
                ts_dt = _resolve_edge_ts(data, payload)
                age_s = int((timezone.now() - ts_dt).total_seconds()) if ts_dt else None
                logger.info(
                    "[EDGE] ingest store=%s event=%s age_s=%s stored=%s deduped=%s",
                    store_id,
                    event_name,
                    age_s,
                    True,
                    True,
                )
            except Exception:
                pass
            mark_event_receipt_processed(event_id=receipt_id)
            return Response(
                {"ok": True, "receipt_id": receipt_id or None, "stored": True, "deduped": True},
                status=status.HTTP_200_OK,
            )
        stored = True
        _touch_store_seen(store_id)
        try:
            ts_dt = _resolve_edge_ts(data, payload)
            _bump_event_minute(store_id, event_name, ts_dt)
        except Exception:
            pass
        try:
            ts_dt = _resolve_edge_ts(data, payload)
            age_s = int((timezone.now() - ts_dt).total_seconds()) if ts_dt else None
            logger.info(
                "[EDGE] ingest store=%s event=%s age_s=%s stored=%s deduped=%s",
                store_id,
                event_name,
                age_s,
                True,
                False,
            )
        except Exception:
            pass

        # --- vision metrics (v1) ---
        if event_name == "vision.metrics.v1":
            try:
                if stored:
                    apply_vision_metrics(payload)
                mark_event_receipt_processed(event_id=receipt_id)
                return Response(
                    {"ok": True, "receipt_id": receipt_id or None, "stored": True, "deduped": not stored},
                    status=status.HTTP_201_CREATED if stored else status.HTTP_200_OK,
                )
            except Exception:
                logger.exception("[EDGE] vision metrics ingest failed")
                mark_event_receipt_failed(event_id=receipt_id, error_message="vision_ingest_failed")
                return Response(
                    {"ok": False, "stored": False, "reason": "vision_ingest_failed"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if event_name == "vision.crossing.v1":
            try:
                inserted = insert_vision_atomic_event_if_new(
                    receipt_id=receipt_id,
                    payload=payload,
                )
                if inserted:
                    apply_vision_crossing(payload)
                mark_event_receipt_processed(event_id=receipt_id)
                return Response(
                    {"ok": True, "receipt_id": receipt_id or None, "stored": True, "deduped": not inserted},
                    status=status.HTTP_201_CREATED if inserted else status.HTTP_200_OK,
                )
            except Exception:
                logger.exception("[EDGE] vision crossing ingest failed")
                mark_event_receipt_failed(event_id=receipt_id, error_message="vision_crossing_ingest_failed")
                return Response(
                    {"ok": False, "stored": False, "reason": "vision_crossing_ingest_failed"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if event_name == "vision.queue_state.v1":
            try:
                inserted = insert_vision_atomic_event_if_new(
                    receipt_id=receipt_id,
                    payload=payload,
                )
                if inserted:
                    apply_vision_queue_state(payload)
                mark_event_receipt_processed(event_id=receipt_id)
                return Response(
                    {"ok": True, "receipt_id": receipt_id or None, "stored": True, "deduped": not inserted},
                    status=status.HTTP_201_CREATED if inserted else status.HTTP_200_OK,
                )
            except Exception:
                logger.exception("[EDGE] vision queue_state ingest failed")
                mark_event_receipt_failed(event_id=receipt_id, error_message="vision_queue_state_ingest_failed")
                return Response(
                    {"ok": False, "stored": False, "reason": "vision_queue_state_ingest_failed"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if event_name == "vision.checkout_proxy.v1":
            try:
                inserted = insert_vision_atomic_event_if_new(
                    receipt_id=receipt_id,
                    payload=payload,
                )
                if inserted:
                    apply_vision_checkout_proxy(payload)
                mark_event_receipt_processed(event_id=receipt_id)
                return Response(
                    {"ok": True, "receipt_id": receipt_id or None, "stored": True, "deduped": not inserted},
                    status=status.HTTP_201_CREATED if inserted else status.HTTP_200_OK,
                )
            except Exception:
                logger.exception("[EDGE] vision checkout_proxy ingest failed")
                mark_event_receipt_failed(event_id=receipt_id, error_message="vision_checkout_proxy_ingest_failed")
                return Response(
                    {"ok": False, "stored": False, "reason": "vision_checkout_proxy_ingest_failed"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if event_name == "vision.zone_occupancy.v1":
            try:
                inserted = insert_vision_atomic_event_if_new(
                    receipt_id=receipt_id,
                    payload=payload,
                )
                if inserted:
                    apply_vision_zone_occupancy(payload)
                mark_event_receipt_processed(event_id=receipt_id)
                return Response(
                    {"ok": True, "receipt_id": receipt_id or None, "stored": True, "deduped": not inserted},
                    status=status.HTTP_201_CREATED if inserted else status.HTTP_200_OK,
                )
            except Exception:
                logger.exception("[EDGE] vision zone_occupancy ingest failed")
                mark_event_receipt_failed(event_id=receipt_id, error_message="vision_zone_occupancy_ingest_failed")
                return Response(
                    {"ok": False, "stored": False, "reason": "vision_zone_occupancy_ingest_failed"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        # --- persistir heartbeat do edge ---
        if normalized == "camera_health":
            if not camera_obj:
                mark_event_receipt_failed(event_id=receipt_id, error_message="camera_not_found")
                return Response(
                    {"detail": "camera not found", "stored": False, "reason": "camera_not_found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            status_value = (data.get("status") or payload.get("status") or "unknown").lower()
            if status_value not in ("online", "degraded", "offline", "unknown", "error"):
                status_value = "unknown"
            checked_at = _resolve_edge_ts(data, payload)
            latency_ms = data.get("latency_ms") or data.get("latency") or payload.get("latency_ms")
            error = data.get("error") or payload.get("error")
            if status_value == "online":
                error = None

            try:
                Camera.objects.filter(id=camera_obj.id).update(
                    status=status_value,
                    last_seen_at=checked_at,
                    last_error=None if status_value == "online" else error,
                    updated_at=timezone.now(),
                )
            except Exception:
                logger.exception("[EDGE] camera_health update failed camera_id=%s", str(camera_obj.id))

            try:
                CameraHealthLog.objects.create(
                    camera_id=camera_obj.id,
                    checked_at=checked_at,
                    status=status_value,
                    latency_ms=latency_ms,
                    snapshot_url=None,
                    error=error,
                )
            except Exception:
                logger.exception("[EDGE] camera_health log failed camera_id=%s", str(camera_obj.id))

            if status_value == "online":
                try:
                    Store.objects.filter(id=store_id).update(
                        last_error=None,
                        updated_at=timezone.now(),
                    )
                except Exception:
                    pass

            mark_event_receipt_processed(event_id=receipt_id)
            return Response(
                {"ok": True, "stored": stored, "receipt_id": receipt_id or None},
                status=status.HTTP_201_CREATED,
            )

        if normalized in ("edge_heartbeat", "camera_heartbeat", "edge_camera_heartbeat"):
            store_obj = Store.objects.filter(id=store_id).first()
            pre_snapshot = None
            pre_reason = None
            if store_obj:
                pre_snapshot, pre_reason = compute_store_edge_status_snapshot(store_id)
            org_id = str(getattr(store_obj, "org_id", None)) if store_obj else None

            camera_transitions = []
            heartbeat_ok = True
            try:
                ts = data.get("ts") or payload.get("ts")
                if ts:
                    try:
                        ts_dt = timezone.datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    except Exception:
                        ts_dt = timezone.now()
                else:
                    ts_dt = timezone.now()

                cameras_in = (
                    payload.get("cameras")
                    or data.get("cameras")
                    or payload.get("camera_heartbeats")
                    or []
                )
                if not cameras_in:
                    if data.get("camera_id") or data.get("external_id") or data.get("name"):
                        cameras_in = [data]
                    elif payload.get("camera_id") or payload.get("external_id") or payload.get("name"):
                        cameras_in = [
                            {
                                "camera_id": payload.get("camera_id"),
                                "external_id": payload.get("external_id"),
                                "name": payload.get("name"),
                                "rtsp_url": payload.get("rtsp_url"),
                                "snapshot_url": payload.get("snapshot_url"),
                            }
                        ]

                try:
                    logger.info(
                        "[EDGE] heartbeat store=%s cameras=%s ts=%s",
                        store_id,
                        len(cameras_in),
                        ts_dt.isoformat() if ts_dt else None,
                    )
                except Exception:
                    pass

                for cam in cameras_in:
                    if not isinstance(cam, dict):
                        continue
                    external_id = cam.get("external_id") or cam.get("camera_id")
                    incoming_name = cam.get("name")
                    rtsp_url = cam.get("rtsp_url")
                    snapshot_url = cam.get("snapshot_url") or cam.get("snapshot_data_url")
                    if isinstance(snapshot_url, str):
                        snapshot_url = snapshot_url.strip() or None
                        if snapshot_url and len(snapshot_url) > 500000:
                            snapshot_url = None
                            logger.warning(
                                "[EDGE] snapshot_url too large; dropped store=%s camera=%s",
                                store_id,
                                external_id or incoming_name or "camera",
                            )
                    else:
                        snapshot_url = None

                    camera_obj = None
                    if external_id:
                        camera_obj = Camera.objects.filter(store_id=store_id, external_id=external_id).first()
                        if camera_obj is None and _is_uuid(external_id):
                            camera_obj = Camera.objects.filter(store_id=store_id, id=external_id).first()
                    if camera_obj is None:
                        camera_obj = Camera.objects.filter(store_id=store_id, name=name).first()

                    prev_last_seen_at = getattr(camera_obj, "last_seen_at", None) if camera_obj else None
                    prev_status, _prev_age, _prev_reason = classify_age(prev_last_seen_at)

                    if camera_obj is None:
                        try:
                            enforce_trial_camera_limit(store_id, requested_active=True)
                        except PaywallError as exc:
                            mark_event_receipt_failed(event_id=receipt_id, error_message="camera_limit_reached")
                            return Response(exc.detail, status=exc.status_code)
                        name_for_write = _camera_name_for_write(
                            incoming_name=incoming_name,
                            external_id=external_id,
                            existing_name="",
                        )
                        camera_obj = Camera.objects.create(
                            store_id=store_id,
                            external_id=external_id,
                            name=name_for_write,
                            rtsp_url=rtsp_url,
                            last_snapshot_url=snapshot_url,
                            status="online",
                            last_seen_at=ts_dt,
                            last_error=None,
                            created_at=timezone.now(),
                            updated_at=timezone.now(),
                        )
                    else:
                        name_for_write = _camera_name_for_write(
                            incoming_name=incoming_name,
                            external_id=external_id,
                            existing_name=getattr(camera_obj, "name", None),
                        )
                        Camera.objects.filter(id=camera_obj.id).update(
                            external_id=external_id or camera_obj.external_id,
                            name=name_for_write or camera_obj.name,
                            rtsp_url=rtsp_url or camera_obj.rtsp_url,
                            last_snapshot_url=snapshot_url or camera_obj.last_snapshot_url,
                            status="online",
                            last_seen_at=ts_dt,
                            last_error=None,
                            updated_at=timezone.now(),
                        )

                    camera_obj.external_id = external_id or camera_obj.external_id
                    camera_obj.name = name_for_write or camera_obj.name
                    camera_obj.last_snapshot_url = snapshot_url or camera_obj.last_snapshot_url
                    camera_obj.status = "online"
                    camera_obj.last_seen_at = ts_dt

                    if prev_status in ("unknown", "offline", "error"):
                        try:
                            log_journey_event(
                                org_id=org_id,
                                event_name="camera_validated",
                                payload={
                                    "store_id": str(store_id),
                                    "camera_id": str(getattr(camera_obj, "id", "")),
                                    "status": "online",
                                },
                                source="app",
                                meta={"path": request.path},
                            )
                        except Exception:
                            pass

                    CameraHealthLog.objects.create(
                        camera_id=camera_obj.id,
                        checked_at=ts_dt,
                        status="online",
                        error=None,
                    )

                    new_status, new_age, new_reason = classify_age(ts_dt)
                    if prev_status != new_status:
                        camera_transitions.append(
                            (camera_obj, prev_status, new_status, new_reason, new_age, ts_dt)
                        )

            except Exception:
                heartbeat_ok = False
                logger.exception("[WARN] heartbeat persist failed")
                mark_event_receipt_failed(event_id=receipt_id, error_message="heartbeat_persist_failed")

            if heartbeat_ok and store_obj:
                post_snapshot, post_reason = compute_store_edge_status_snapshot(store_id)
                edge_meta = {"source": "edge_ingest"}
                if receipt_id:
                    edge_meta["receipt_id"] = receipt_id

                if not pre_reason and not post_reason:
                    prev_store_status = pre_snapshot.get("store_status") if pre_snapshot else None
                    new_store_status = post_snapshot.get("store_status") if post_snapshot else None
                    if prev_store_status and new_store_status and prev_store_status != new_store_status:
                        emit_store_status_changed(
                            store=store_obj,
                            prev_status=prev_store_status,
                            new_status=new_store_status,
                            snapshot=post_snapshot,
                            meta=edge_meta,
                        )

                for cam_obj, prev_status, new_status, reason, age_s, ts_dt_item in camera_transitions:
                    emit_camera_status_changed(
                        store=store_obj,
                        camera=cam_obj,
                        prev_status=prev_status,
                        new_status=new_status,
                        reason=reason,
                        age_seconds=age_s,
                        last_heartbeat_ts=ts_dt_item.isoformat() if ts_dt_item else None,
                        meta=edge_meta,
                    )

            mark_event_receipt_processed(event_id=receipt_id)
            return Response(
                {"ok": True, "receipt_id": receipt_id or None, "stored": stored, "deduped": deduped or False},
                status=status.HTTP_201_CREATED if stored else status.HTTP_200_OK,
            )

        # --- encaminhar ALERT do edge para o ingest do Alerts ---
        if event_name == "alert":
            ingest_payload = {
                "store_id": data.get("store_id"),
                "camera_id": data.get("camera_id"),
                "zone_id": data.get("zone_id"),
                "event_type": data.get("event_type") or data.get("type"),
                "severity": data.get("severity"),
                "title": data.get("title") or "Alerta",
                "description": data.get("description") or data.get("message") or "",
                "metadata": data.get("metadata") or {},
                "occurred_at": data.get("occurred_at"),
                "clip_url": data.get("clip_url"),
                "snapshot_url": data.get("snapshot_url"),
                "destinations": data.get("destinations") or {},
            }
            if receipt_id:
                ingest_payload["receipt_id"] = receipt_id

            service_user = self._get_service_user()
            if service_user is None:
                # se não existir user, falha explícita para você corrigir rápido
                mark_event_receipt_failed(event_id=receipt_id, error_message="edge_service_user_not_found")
                return Response(
                    {"detail": "EDGE service user not found. Create user 'edge-agent' or set EDGE_SERVICE_USERNAME."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            factory = APIRequestFactory()
            drf_req = factory.post("/api/alerts/alert-rules/ingest/", ingest_payload, format="json")
            force_authenticate(drf_req, user=service_user)

            ingest_view = AlertRuleViewSet.as_view({"post": "ingest"})
            response = ingest_view(drf_req)
            if stored:
                response.status_code = status.HTTP_201_CREATED
            try:
                if isinstance(response.data, dict):
                    response.data.setdefault("receipt_id", receipt_id or None)
                    response.data.setdefault("stored", stored)
                    response.data.setdefault("deduped", deduped or False)
            except Exception:
                pass
            if getattr(response, "status_code", 500) >= 400:
                mark_event_receipt_failed(event_id=receipt_id, error_message="alert_ingest_failed")
            else:
                mark_event_receipt_processed(event_id=receipt_id)
            return response

        # por enquanto: heartbeat/bucket aceita e responde ok
        mark_event_receipt_processed(event_id=receipt_id)
        return Response(
            {"ok": True, "receipt_id": receipt_id or None, "stored": stored, "deduped": deduped or False},
            status=status.HTTP_201_CREATED if stored else status.HTTP_200_OK,
        )


class EdgeCameraTestConnectionView(APIView):
    """
    POST /api/edge/cameras/{id}/test_connection/
    O agente edge executa o teste local e publica resultado no cloud.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, camera_id):
        camera = Camera.objects.filter(id=camera_id).first()
        if not camera:
            return Response({"detail": "camera not found"}, status=status.HTTP_404_NOT_FOUND)

        auth_result = authenticate_edge_token(request, requested_store_id=str(camera.store_id))
        if not auth_result.ok:
            return Response(
                {
                    "code": auth_result.code or "edge_token_invalid",
                    "detail": auth_result.detail or "Edge token inválido.",
                },
                status=auth_result.status_code or status.HTTP_401_UNAUTHORIZED,
            )

        payload = request.data or {}
        if "ok" in payload:
            ok = bool(payload.get("ok"))
            latency_ms = payload.get("latency_ms")
            fps_est = payload.get("fps_est")
            frames_read = payload.get("frames_read")
            error_msg = payload.get("error_msg") or ""
            reason = payload.get("reason")
        else:
            if not camera.rtsp_url:
                return Response({"detail": "camera rtsp_url missing"}, status=status.HTTP_400_BAD_REQUEST)
            probe = rtsp_probe_with_hard_timeout(camera.rtsp_url, timeout_sec=4, hard_timeout_sec=5)
            ok = bool(probe.get("ok"))
            latency_ms = probe.get("latency_ms")
            fps_est = probe.get("fps_est")
            frames_read = probe.get("frames_read")
            error_msg = probe.get("error_msg") or ""
            reason = "rtsp_timeout" if error_msg == "rtsp_timeout" else None

        checked_at = _parse_edge_ts(payload.get("ts")) or timezone.now()
        if ok:
            camera.status = "online"
            camera.last_seen_at = checked_at
            camera.last_error = None
            camera.updated_at = timezone.now()
            camera.save(update_fields=["status", "last_seen_at", "last_error", "updated_at"])
            CameraHealthLog.objects.create(
                camera_id=camera.id,
                checked_at=checked_at,
                status="online",
                latency_ms=latency_ms,
                snapshot_url=None,
                error=None,
            )
        else:
            camera.status = "error"
            camera.last_error = error_msg or "Falha ao testar RTSP."
            camera.updated_at = timezone.now()
            camera.save(update_fields=["status", "last_error", "updated_at"])
            CameraHealthLog.objects.create(
                camera_id=camera.id,
                checked_at=checked_at,
                status="error",
                latency_ms=latency_ms,
                snapshot_url=None,
                error=error_msg or "Falha ao testar RTSP.",
            )

        return Response(
            {
                "ok": ok,
                "reason": reason,
                "latency_ms": latency_ms,
                "fps_est": fps_est,
                "frames_read": frames_read,
                "error_msg": "" if ok else (error_msg or "Falha ao testar RTSP."),
            },
            status=status.HTTP_200_OK,
        )


class EdgeCamerasView(APIView):
    """
    GET /api/edge/cameras/
    Legacy compatibility endpoint for edge builds that fetch cameras by token store.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        auth_result = authenticate_edge_token(request)
        if not auth_result.ok or not auth_result.store_id:
            return Response(
                {
                    "code": auth_result.code or "edge_token_invalid",
                    "detail": auth_result.detail or "Edge token inválido.",
                },
                status=auth_result.status_code or status.HTTP_401_UNAUTHORIZED,
            )
        cameras_qs = (
            Camera.objects
            .select_related("store")
            .filter(store_id=auth_result.store_id, active=True)
            .order_by("-updated_at")
        )
        return Response(_serialize_cameras_for_edge(cameras_qs), status=status.HTTP_200_OK)


class EdgeStoreCamerasView(APIView):
    """
    GET /api/edge/stores/{store_id}/cameras/
    Legacy compatibility endpoint for edge builds that call store-scoped path.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, store_id):
        auth_result = authenticate_edge_token(request, requested_store_id=str(store_id))
        if not auth_result.ok:
            return Response(
                {
                    "code": auth_result.code or "edge_token_invalid",
                    "detail": auth_result.detail or "Edge token inválido.",
                },
                status=auth_result.status_code or status.HTTP_401_UNAUTHORIZED,
            )
        cameras_qs = (
            Camera.objects
            .select_related("store")
            .filter(store_id=store_id, active=True)
            .order_by("-updated_at")
        )
        return Response(_serialize_cameras_for_edge(cameras_qs), status=status.HTTP_200_OK)
