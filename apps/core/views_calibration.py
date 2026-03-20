from __future__ import annotations

import uuid
from datetime import timedelta

from django.db import connection, models
from django.db.models import Avg, Count
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import (
    CalibrationAction,
    CalibrationEvidence,
    CalibrationResult,
    Camera,
    PosTransactionEvent,
    Store,
)
from apps.stores.services.user_orgs import get_user_org_ids
from apps.stores.services.user_uuid import ensure_user_uuid

ALLOWED_STATUSES = {"open", "in_progress", "waiting_validation", "validated", "rejected", "closed"}
ALLOWED_PRIORITIES = {"low", "medium", "high", "critical"}
ACTIVE_ACTION_STATUSES = {"open", "in_progress", "waiting_validation"}


def _is_internal_admin(user) -> bool:
    return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))


def _safe_user_uuid(user) -> str | None:
    try:
        raw = ensure_user_uuid(user)
        return str(raw) if raw else None
    except Exception:
        return None


def _parse_iso_datetime(value):
    if value in (None, ""):
        return None
    dt = parse_datetime(str(value).replace("Z", "+00:00"))
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _safe_uuid(value):
    if value in (None, ""):
        return None
    try:
        return str(uuid.UUID(str(value)))
    except Exception:
        return None


def _serialize_action(row: CalibrationAction) -> dict:
    return {
        "id": str(row.id),
        "org_id": str(row.org_id),
        "store_id": str(row.store_id),
        "store_name": getattr(getattr(row, "store", None), "name", None),
        "camera_id": str(row.camera_id) if row.camera_id else None,
        "camera_name": getattr(getattr(row, "camera", None), "name", None),
        "issue_code": row.issue_code,
        "recommended_action": row.recommended_action,
        "owner_role": row.owner_role,
        "status": row.status,
        "priority": row.priority,
        "source": row.source,
        "assigned_to_user_uuid": str(row.assigned_to_user_uuid) if row.assigned_to_user_uuid else None,
        "created_by_user_uuid": str(row.created_by_user_uuid) if row.created_by_user_uuid else None,
        "sla_due_at": row.sla_due_at.isoformat() if row.sla_due_at else None,
        "metadata": row.metadata or {},
        "notes": row.notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "evidences_total": int(getattr(row, "evidences_total", 0) or 0),
        "results_total": int(getattr(row, "results_total", 0) or 0),
        "results_passed_total": int(getattr(row, "results_passed_total", 0) or 0),
    }


def _serialize_evidence(row: CalibrationEvidence) -> dict:
    return {
        "id": str(row.id),
        "action_id": str(row.action_id),
        "snapshot_before_url": row.snapshot_before_url,
        "snapshot_after_url": row.snapshot_after_url,
        "clip_before_url": row.clip_before_url,
        "clip_after_url": row.clip_after_url,
        "captured_at": row.captured_at.isoformat() if row.captured_at else None,
        "captured_by_user_uuid": str(row.captured_by_user_uuid) if row.captured_by_user_uuid else None,
        "notes": row.notes,
        "metadata": row.metadata or {},
    }


def _serialize_result(row: CalibrationResult) -> dict:
    return {
        "id": str(row.id),
        "action_id": str(row.action_id),
        "metric_name": row.metric_name,
        "baseline_value": row.baseline_value,
        "after_value": row.after_value,
        "delta_value": row.delta_value,
        "threshold_value": row.threshold_value,
        "passed": bool(row.passed),
        "validated_by_user_uuid": str(row.validated_by_user_uuid) if row.validated_by_user_uuid else None,
        "validated_at": row.validated_at.isoformat() if row.validated_at else None,
        "notes": row.notes,
    }


def _parse_bool(value, default: bool = False) -> bool:
    if value in (None, ""):
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _has_active_action(*, store_id: str, issue_code: str, camera_id: str | None = None) -> bool:
    filters = {
        "store_id": store_id,
        "issue_code": issue_code,
        "status__in": ACTIVE_ACTION_STATUSES,
    }
    if camera_id:
        filters["camera_id"] = camera_id
    else:
        filters["camera_id__isnull"] = True
    return CalibrationAction.objects.filter(**filters).exists()


def _resolve_period_window(raw_period: str | None):
    period = str(raw_period or "30d").strip().lower()
    now = timezone.now()
    if period == "7d":
        return now - timedelta(days=7), now, "7d"
    if period == "90d":
        return now - timedelta(days=90), now, "90d"
    return now - timedelta(days=30), now, "30d"


class CalibrationActionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _resolve_scope_org_ids(self, user) -> set[str]:
        if _is_internal_admin(user):
            return set()
        try:
            return {str(item) for item in get_user_org_ids(user)}
        except Exception:
            return set()

    def get(self, request):
        is_admin = _is_internal_admin(request.user)
        scoped_org_ids = self._resolve_scope_org_ids(request.user)
        if not is_admin and not scoped_org_ids:
            return Response({"items": [], "total": 0}, status=status.HTTP_200_OK)

        qs = CalibrationAction.objects.select_related("store", "camera").order_by("-created_at")
        if not is_admin:
            qs = qs.filter(org_id__in=scoped_org_ids)

        store_id = str(request.GET.get("store_id") or "").strip()
        camera_id = str(request.GET.get("camera_id") or "").strip()
        status_filter = str(request.GET.get("status") or "").strip().lower()
        limit = int(request.GET.get("limit") or 100)
        limit = max(1, min(limit, 300))

        if store_id:
            qs = qs.filter(store_id=store_id)
        if camera_id:
            qs = qs.filter(camera_id=camera_id)
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)

        rows = list(qs[:limit])
        if rows:
            action_ids = [row.id for row in rows]
            evidence_counts = {
                str(item["action_id"]): int(item["qty"] or 0)
                for item in CalibrationEvidence.objects.filter(action_id__in=action_ids)
                .values("action_id")
                .annotate(qty=Count("id"))
            }
            result_counts = {
                str(item["action_id"]): int(item["qty"] or 0)
                for item in CalibrationResult.objects.filter(action_id__in=action_ids)
                .values("action_id")
                .annotate(qty=Count("id"))
            }
            result_passed_counts = {
                str(item["action_id"]): int(item["qty"] or 0)
                for item in CalibrationResult.objects.filter(action_id__in=action_ids, passed=True)
                .values("action_id")
                .annotate(qty=Count("id"))
            }
            for row in rows:
                key = str(row.id)
                row.evidences_total = evidence_counts.get(key, 0)
                row.results_total = result_counts.get(key, 0)
                row.results_passed_total = result_passed_counts.get(key, 0)

        return Response(
            {
                "items": [_serialize_action(row) for row in rows],
                "total": len(rows),
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        store_id = str(request.data.get("store_id") or "").strip()
        camera_id = str(request.data.get("camera_id") or "").strip() or None
        issue_code = str(request.data.get("issue_code") or "").strip().lower()
        recommended_action = str(request.data.get("recommended_action") or "").strip()
        owner_role = str(request.data.get("owner_role") or "store_manager").strip().lower() or "store_manager"
        status_value = str(request.data.get("status") or "open").strip().lower() or "open"
        priority = str(request.data.get("priority") or "medium").strip().lower() or "medium"
        source = str(request.data.get("source") or ("admin" if _is_internal_admin(request.user) else "store")).strip().lower()
        sla_due_at = _parse_iso_datetime(request.data.get("sla_due_at"))
        notes = str(request.data.get("notes") or "").strip() or None
        metadata = request.data.get("metadata") if isinstance(request.data.get("metadata"), dict) else {}
        assigned_to_user_uuid = _safe_uuid(request.data.get("assigned_to_user_uuid"))

        if not store_id or not issue_code or not recommended_action:
            return Response(
                {"detail": "store_id, issue_code e recommended_action são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if status_value not in ALLOWED_STATUSES:
            return Response({"detail": "status inválido."}, status=status.HTTP_400_BAD_REQUEST)
        if priority not in ALLOWED_PRIORITIES:
            return Response({"detail": "priority inválida."}, status=status.HTTP_400_BAD_REQUEST)

        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not _is_internal_admin(request.user):
            org_scope = {str(item) for item in get_user_org_ids(request.user)}
            if str(store.org_id) not in org_scope:
                return Response({"detail": "Sem permissão para esta loja."}, status=status.HTTP_403_FORBIDDEN)

        camera = None
        if camera_id:
            camera = Camera.objects.filter(id=camera_id, store_id=store_id).first()
            if not camera:
                return Response(
                    {"detail": "Câmera não encontrada para a loja informada."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        now = timezone.now()
        row = CalibrationAction.objects.create(
            org_id=store.org_id,
            store_id=store.id,
            camera_id=getattr(camera, "id", None),
            issue_code=issue_code,
            recommended_action=recommended_action,
            owner_role=owner_role,
            status=status_value,
            priority=priority,
            source=source,
            assigned_to_user_uuid=assigned_to_user_uuid,
            created_by_user_uuid=_safe_uuid(_safe_user_uuid(request.user)),
            sla_due_at=sla_due_at,
            metadata=metadata,
            notes=notes,
            created_at=now,
            updated_at=now,
        )
        row = CalibrationAction.objects.select_related("store", "camera").filter(id=row.id).first()
        return Response(_serialize_action(row), status=status.HTTP_201_CREATED)


class CalibrationActionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, action_id):
        row = CalibrationAction.objects.select_related("store", "camera").filter(id=action_id).first()
        if not row:
            return Response({"detail": "Ação não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not _is_internal_admin(request.user):
            org_scope = {str(item) for item in get_user_org_ids(request.user)}
            if str(row.org_id) not in org_scope:
                return Response({"detail": "Sem permissão para esta ação."}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data or {}
        status_value = str(payload.get("status") or "").strip().lower()
        priority = str(payload.get("priority") or "").strip().lower()
        notes = payload.get("notes")
        assigned_to_user_uuid = payload.get("assigned_to_user_uuid")

        updates = []
        if status_value:
            if status_value not in ALLOWED_STATUSES:
                return Response({"detail": "status inválido."}, status=status.HTTP_400_BAD_REQUEST)
            row.status = status_value
            updates.append("status")
        if priority:
            if priority not in ALLOWED_PRIORITIES:
                return Response({"detail": "priority inválida."}, status=status.HTTP_400_BAD_REQUEST)
            row.priority = priority
            updates.append("priority")
        if notes is not None:
            row.notes = str(notes).strip() or None
            updates.append("notes")
        if assigned_to_user_uuid is not None:
            parsed = _safe_uuid(assigned_to_user_uuid)
            row.assigned_to_user_uuid = parsed
            updates.append("assigned_to_user_uuid")

        if not updates:
            return Response(_serialize_action(row), status=status.HTTP_200_OK)

        row.updated_at = timezone.now()
        updates.append("updated_at")
        row.save(update_fields=updates)
        return Response(_serialize_action(row), status=status.HTTP_200_OK)


class CalibrationActionEvidenceCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, action_id):
        action = CalibrationAction.objects.filter(id=action_id).first()
        if not action:
            return Response({"detail": "Ação não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not _is_internal_admin(request.user):
            org_scope = {str(item) for item in get_user_org_ids(request.user)}
            if str(action.org_id) not in org_scope:
                return Response({"detail": "Sem permissão para esta ação."}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data or {}
        snapshot_before_url = str(payload.get("snapshot_before_url") or "").strip() or None
        snapshot_after_url = str(payload.get("snapshot_after_url") or "").strip() or None
        clip_before_url = str(payload.get("clip_before_url") or "").strip() or None
        clip_after_url = str(payload.get("clip_after_url") or "").strip() or None
        captured_at = _parse_iso_datetime(payload.get("captured_at")) or timezone.now()
        notes = str(payload.get("notes") or "").strip() or None
        metadata = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}

        if not snapshot_before_url and not snapshot_after_url and not clip_before_url and not clip_after_url:
            return Response(
                {"detail": "Informe pelo menos uma evidência (snapshot/clip before/after)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        row = CalibrationEvidence.objects.create(
            action_id=action.id,
            snapshot_before_url=snapshot_before_url,
            snapshot_after_url=snapshot_after_url,
            clip_before_url=clip_before_url,
            clip_after_url=clip_after_url,
            captured_at=captured_at,
            captured_by_user_uuid=_safe_uuid(_safe_user_uuid(request.user)),
            notes=notes,
            metadata=metadata,
            created_at=timezone.now(),
            updated_at=timezone.now(),
        )
        if action.status == "open":
            action.status = "in_progress"
            action.updated_at = timezone.now()
            action.save(update_fields=["status", "updated_at"])
        return Response(_serialize_evidence(row), status=status.HTTP_201_CREATED)


class CalibrationActionResultCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, action_id):
        action = CalibrationAction.objects.filter(id=action_id).first()
        if not action:
            return Response({"detail": "Ação não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not _is_internal_admin(request.user):
            org_scope = {str(item) for item in get_user_org_ids(request.user)}
            if str(action.org_id) not in org_scope:
                return Response({"detail": "Sem permissão para esta ação."}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data or {}
        metric_name = str(payload.get("metric_name") or "").strip()
        if not metric_name:
            return Response({"detail": "metric_name é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        baseline_value = payload.get("baseline_value")
        after_value = payload.get("after_value")
        threshold_value = payload.get("threshold_value")
        passed = bool(payload.get("passed"))
        notes = str(payload.get("notes") or "").strip() or None
        validated_at = _parse_iso_datetime(payload.get("validated_at")) or timezone.now()

        def _to_float(value):
            if value in (None, ""):
                return None
            try:
                return float(value)
            except Exception:
                return None

        baseline = _to_float(baseline_value)
        after = _to_float(after_value)
        threshold = _to_float(threshold_value)
        delta = after - baseline if after is not None and baseline is not None else None

        row = CalibrationResult.objects.create(
            action_id=action.id,
            metric_name=metric_name,
            baseline_value=baseline,
            after_value=after,
            delta_value=delta,
            threshold_value=threshold,
            passed=passed,
            validated_by_user_uuid=_safe_uuid(_safe_user_uuid(request.user)),
            validated_at=validated_at,
            notes=notes,
            created_at=timezone.now(),
            updated_at=timezone.now(),
        )

        action.status = "validated" if passed else "rejected"
        action.updated_at = timezone.now()
        action.save(update_fields=["status", "updated_at"])
        return Response(_serialize_result(row), status=status.HTTP_201_CREATED)


class CalibrationActionAutoGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        is_admin = _is_internal_admin(request.user)
        scoped_org_ids = {str(item) for item in get_user_org_ids(request.user)} if not is_admin else set()
        if not is_admin and not scoped_org_ids:
            return Response({"created_total": 0, "created": [], "skipped_total": 0, "skipped": []}, status=status.HTTP_200_OK)

        payload = request.data or {}
        store_id_filter = str(payload.get("store_id") or "").strip() or None
        dry_run = _parse_bool(payload.get("dry_run"), default=False)
        max_actions = int(payload.get("max_actions") or 50)
        max_actions = max(1, min(max_actions, 200))
        now = timezone.now()
        stale_cutoff = now - timedelta(minutes=10)
        day_ago = now - timedelta(hours=24)

        stores_qs = Store.objects.all()
        if store_id_filter:
            stores_qs = stores_qs.filter(id=store_id_filter)
        if not is_admin:
            stores_qs = stores_qs.filter(org_id__in=scoped_org_ids)
        stores = list(stores_qs[:500])

        created_items: list[dict] = []
        skipped_items: list[dict] = []

        def _register_candidate(
            *,
            store: Store,
            issue_code: str,
            recommended_action: str,
            priority: str,
            camera: Camera | None = None,
            metadata: dict | None = None,
            sla_due_hours: int | None = None,
        ):
            if len(created_items) >= max_actions:
                return
            camera_id = str(camera.id) if camera else None
            if _has_active_action(store_id=str(store.id), issue_code=issue_code, camera_id=camera_id):
                skipped_items.append(
                    {
                        "store_id": str(store.id),
                        "camera_id": camera_id,
                        "issue_code": issue_code,
                        "reason": "already_has_active_action",
                    }
                )
                return
            item = {
                "store_id": str(store.id),
                "camera_id": camera_id,
                "issue_code": issue_code,
                "priority": priority,
                "recommended_action": recommended_action,
                "metadata": metadata or {},
            }
            sla_due_at = None
            if sla_due_hours and int(sla_due_hours) > 0:
                sla_due_at = now + timedelta(hours=int(sla_due_hours))
                item["sla_due_at"] = sla_due_at.isoformat()
            if dry_run:
                created_items.append({**item, "dry_run": True})
                return
            row = CalibrationAction.objects.create(
                org_id=store.org_id,
                store_id=store.id,
                camera_id=camera.id if camera else None,
                issue_code=issue_code,
                recommended_action=recommended_action,
                owner_role="store_manager",
                status="open",
                priority=priority,
                source="system",
                created_by_user_uuid=_safe_uuid(_safe_user_uuid(request.user)),
                sla_due_at=sla_due_at,
                metadata=metadata or {},
                created_at=now,
                updated_at=now,
            )
            created_items.append(
                {
                    **item,
                    "id": str(row.id),
                    "status": row.status,
                }
            )

        # Rule 1: store without recent edge signal.
        for store in stores:
            if len(created_items) >= max_actions:
                break
            if store.last_seen_at is None or store.last_seen_at < stale_cutoff:
                _register_candidate(
                    store=store,
                    issue_code="edge_signal_stale",
                    priority="high",
                    recommended_action="Verificar edge-agent e conectividade. Reiniciar serviço e validar heartbeat em até 10 minutos.",
                    metadata={
                        "rule_id": "rule_store_signal_stale_v1",
                        "last_seen_at": store.last_seen_at.isoformat() if store.last_seen_at else None,
                    },
                )

        # Rule 2: active camera offline/error/unknown or stale.
        cameras_qs = Camera.objects.filter(active=True, store_id__in=[store.id for store in stores]).select_related("store")
        for camera in cameras_qs[:2000]:
            if len(created_items) >= max_actions:
                break
            camera_status = str(camera.status or "").strip().lower()
            camera_stale = camera.last_seen_at is None or camera.last_seen_at < stale_cutoff
            if camera_status in {"offline", "error", "unknown"} or camera_stale:
                _register_candidate(
                    store=camera.store,
                    camera=camera,
                    issue_code="camera_signal_unhealthy",
                    priority="high" if camera_status in {"offline", "error"} else "medium",
                    recommended_action="Ajustar posicionamento (15-25 graus), checar energia/rede e validar novo snapshot após ajuste.",
                    metadata={
                        "rule_id": "rule_camera_signal_unhealthy_v1",
                        "camera_status": camera_status,
                        "camera_last_seen_at": camera.last_seen_at.isoformat() if camera.last_seen_at else None,
                    },
                )

        # Rule 3: conversion identity null-rate high in last 24h.
        store_ids = [str(store.id) for store in stores]
        if store_ids and len(created_items) < max_actions:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      store_id::text,
                      COUNT(*) AS total_count,
                      COUNT(*) FILTER (
                        WHERE metric_type IS NULL OR metric_type = '' OR roi_entity_id IS NULL OR roi_entity_id = ''
                      ) AS null_count
                    FROM public.conversion_metrics
                    WHERE ts_bucket >= %s
                      AND store_id::text = ANY(%s)
                    GROUP BY store_id
                    """,
                    [day_ago, store_ids],
                )
                rows = cursor.fetchall()
            by_store = {str(store.id): store for store in stores}
            for row in rows:
                if len(created_items) >= max_actions:
                    break
                store_id, total_count, null_count = row
                total = int(total_count or 0)
                nulls = int(null_count or 0)
                if total <= 0:
                    continue
                null_rate = (nulls / total) if total else 0.0
                if null_rate < 0.20:
                    continue
                store_obj = by_store.get(str(store_id))
                if not store_obj:
                    continue
                _register_candidate(
                    store=store_obj,
                    issue_code="conversion_identity_null_rate_high",
                    priority="critical" if null_rate >= 0.40 else "high",
                    recommended_action="Revisar ROI/metric_type no edge e publicar nova configuração para reduzir nulos em conversion_metrics.",
                    metadata={
                        "rule_id": "rule_conversion_identity_null_rate_v1",
                        "period_hours": 24,
                        "null_rate": round(null_rate, 4),
                        "null_count": nulls,
                        "total_count": total,
                    },
                )

        # Rule 4: PDV integration desired but no sales signal in 7d.
        if len(created_items) < max_actions:
            week_ago = now - timedelta(days=7)
            stores_with_pdv_interest = [store for store in stores if bool(getattr(store, "pos_integration_interest", False))]
            if stores_with_pdv_interest:
                store_ids_interest = [store.id for store in stores_with_pdv_interest]
                stores_with_recent_pdv = set(
                    str(item)
                    for item in PosTransactionEvent.objects.filter(
                        store_id__in=store_ids_interest,
                        occurred_at__gte=week_ago,
                    ).values_list("store_id", flat=True).distinct()
                )
                for store in stores_with_pdv_interest:
                    if len(created_items) >= max_actions:
                        break
                    if str(store.id) in stores_with_recent_pdv:
                        continue
                    _register_candidate(
                        store=store,
                        issue_code="pdv_signal_missing_7d",
                        priority="medium",
                        recommended_action="Conectar PDV/gateway real para elevar confiabilidade da conversão oficial e reduzir proxy.",
                        metadata={
                            "rule_id": "rule_pdv_signal_missing_v1",
                            "period_days": 7,
                        },
                    )

        # Rule 5: vision has recent signal but journey funnel has no first_metrics_received.
        if store_ids and len(created_items) < max_actions:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    WITH vision_recent AS (
                      SELECT
                        store_id::text AS store_id,
                        COUNT(*)::int AS vision_events,
                        MAX(ts) AS last_vision_ts
                      FROM public.vision_atomic_events
                      WHERE ts >= %s
                        AND store_id::text = ANY(%s)
                      GROUP BY 1
                    ),
                    first_metrics AS (
                      SELECT DISTINCT payload->>'store_id' AS store_id
                      FROM public.journey_events
                      WHERE event_name = 'first_metrics_received'
                        AND payload ? 'store_id'
                    )
                    SELECT
                      vr.store_id,
                      vr.vision_events,
                      vr.last_vision_ts
                    FROM vision_recent vr
                    LEFT JOIN first_metrics fm ON fm.store_id = vr.store_id
                    WHERE fm.store_id IS NULL
                    """,
                    [day_ago, store_ids],
                )
                rows = cursor.fetchall()
            by_store = {str(store.id): store for store in stores}
            for row in rows:
                if len(created_items) >= max_actions:
                    break
                store_id, vision_events, last_vision_ts = row
                store_obj = by_store.get(str(store_id))
                if not store_obj:
                    continue
                events_total = int(vision_events or 0)
                _register_candidate(
                    store=store_obj,
                    issue_code="vision_funnel_reconciliation_gap_24h",
                    priority="critical" if events_total >= 100 else "high",
                    recommended_action="Executar reconciliação de funil (first_metrics_received) para alinhar visão com jornada e desbloquear métricas de ativação.",
                    sla_due_hours=4,
                    metadata={
                        "rule_id": "rule_vision_funnel_reconciliation_gap_v1",
                        "period_hours": 24,
                        "vision_events": events_total,
                        "last_vision_ts": last_vision_ts.isoformat() if last_vision_ts else None,
                    },
                )

        return Response(
            {
                "dry_run": dry_run,
                "max_actions": max_actions,
                "created_total": len(created_items),
                "created": created_items,
                "skipped_total": len(skipped_items),
                "skipped": skipped_items[:200],
            },
            status=status.HTTP_200_OK,
        )


class CalibrationImpactSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_admin = _is_internal_admin(request.user)
        scoped_org_ids = {str(item) for item in get_user_org_ids(request.user)} if not is_admin else set()
        if not is_admin and not scoped_org_ids:
            return Response(
                {
                    "period": "30d",
                    "from": None,
                    "to": None,
                    "totals": {
                        "actions_total": 0,
                        "actions_validated": 0,
                        "results_total": 0,
                        "results_passed": 0,
                        "pass_rate": None,
                        "avg_delta": None,
                    },
                    "by_issue": [],
                },
                status=status.HTTP_200_OK,
            )

        start, end, period = _resolve_period_window(request.GET.get("period"))
        store_id = str(request.GET.get("store_id") or "").strip() or None

        actions_qs = CalibrationAction.objects.filter(created_at__gte=start, created_at__lt=end)
        if not is_admin:
            actions_qs = actions_qs.filter(org_id__in=scoped_org_ids)
        if store_id:
            actions_qs = actions_qs.filter(store_id=store_id)

        action_ids = list(actions_qs.values_list("id", flat=True))
        if not action_ids:
            return Response(
                {
                    "period": period,
                    "from": start.isoformat(),
                    "to": end.isoformat(),
                    "totals": {
                        "actions_total": 0,
                        "actions_validated": 0,
                        "results_total": 0,
                        "results_passed": 0,
                        "pass_rate": None,
                        "avg_delta": None,
                    },
                    "by_issue": [],
                },
                status=status.HTTP_200_OK,
            )

        results_qs = CalibrationResult.objects.filter(action_id__in=action_ids)
        totals = results_qs.aggregate(
            results_total=Count("id"),
            results_passed=Count("id", filter=models.Q(passed=True)),
            avg_delta=Avg("delta_value"),
        )
        actions_total = len(action_ids)
        actions_validated = actions_qs.filter(status="validated").count()
        results_total = int(totals.get("results_total") or 0)
        results_passed = int(totals.get("results_passed") or 0)
        pass_rate = round((results_passed / results_total), 4) if results_total > 0 else None
        avg_delta = float(totals.get("avg_delta")) if totals.get("avg_delta") is not None else None

        by_issue_rows = (
            actions_qs.values("issue_code")
            .annotate(
                actions_total=Count("id"),
                actions_validated=Count("id", filter=models.Q(status="validated")),
            )
            .order_by("-actions_total")
        )
        by_issue = []
        for row in by_issue_rows:
            issue_code = str(row.get("issue_code") or "")
            issue_action_ids = list(
                actions_qs.filter(issue_code=issue_code).values_list("id", flat=True)
            )
            issue_results_qs = CalibrationResult.objects.filter(action_id__in=issue_action_ids)
            issue_aggr = issue_results_qs.aggregate(
                results_total=Count("id"),
                results_passed=Count("id", filter=models.Q(passed=True)),
                avg_delta=Avg("delta_value"),
            )
            issue_results_total = int(issue_aggr.get("results_total") or 0)
            issue_results_passed = int(issue_aggr.get("results_passed") or 0)
            issue_pass_rate = (
                round((issue_results_passed / issue_results_total), 4)
                if issue_results_total > 0
                else None
            )
            issue_avg_delta = (
                float(issue_aggr.get("avg_delta")) if issue_aggr.get("avg_delta") is not None else None
            )
            by_issue.append(
                {
                    "issue_code": issue_code,
                    "actions_total": int(row.get("actions_total") or 0),
                    "actions_validated": int(row.get("actions_validated") or 0),
                    "results_total": issue_results_total,
                    "results_passed": issue_results_passed,
                    "pass_rate": issue_pass_rate,
                    "avg_delta": issue_avg_delta,
                }
            )

        return Response(
            {
                "period": period,
                "from": start.isoformat(),
                "to": end.isoformat(),
                "totals": {
                    "actions_total": actions_total,
                    "actions_validated": actions_validated,
                    "results_total": results_total,
                    "results_passed": results_passed,
                    "pass_rate": pass_rate,
                    "avg_delta": avg_delta,
                },
                "by_issue": by_issue,
            },
            status=status.HTTP_200_OK,
        )
