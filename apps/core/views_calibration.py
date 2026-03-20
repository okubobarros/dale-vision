from __future__ import annotations

import uuid

from django.db.models import Count
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
    Store,
)
from apps.stores.services.user_orgs import get_user_org_ids
from apps.stores.services.user_uuid import ensure_user_uuid

ALLOWED_STATUSES = {"open", "in_progress", "waiting_validation", "validated", "rejected", "closed"}
ALLOWED_PRIORITIES = {"low", "medium", "high", "critical"}


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
