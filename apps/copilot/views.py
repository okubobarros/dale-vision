import uuid
import logging

from django.db import models, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cameras.permissions import ALLOWED_MANAGE_ROLES, ALLOWED_READ_ROLES, require_store_role
from apps.core.models import Store
from apps.stores.services.user_uuid import ensure_user_uuid

from .models import (
    CopilotConversation,
    StoreProfile,
    CopilotMessage,
    CopilotOperationalInsight,
    CopilotReport72h,
)
from .serializers import (
    CopilotChatCreateSerializer,
    CopilotMessageSerializer,
    CopilotOperationalInsightSerializer,
    CopilotReport72hSerializer,
    StoreProfileSerializer,
    CopilotStaffPlanActionSerializer,
)
from .services import (
    evaluate_report_readiness,
    get_latest_context_snapshot,
    materialize_dashboard_context,
    materialize_operational_insights,
    materialize_report_72h,
)

logger = logging.getLogger(__name__)


def _get_store_or_404(store_id):
    store = Store.objects.filter(id=store_id).first()
    if not store:
        return None, Response(
            {"code": "STORE_NOT_FOUND", "message": "Loja não encontrada."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return store, None


class CopilotDashboardContextView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)
        force_refresh = str(request.query_params.get("force", "0")).lower() in {"1", "true", "yes"}
        snapshot = None if force_refresh else get_latest_context_snapshot(store_id)
        if snapshot:
            return Response(snapshot.snapshot_json, status=status.HTTP_200_OK)

        snapshot = materialize_dashboard_context(store_id)
        if not snapshot:
            return Response(
                {"code": "STORE_NOT_FOUND", "message": "Loja não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(snapshot.snapshot_json, status=status.HTTP_200_OK)


class CopilotInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        refresh = str(request.query_params.get("refresh", "0")).lower() in {"1", "true", "yes"}
        if refresh:
            materialize_operational_insights(store_id, window_hours=24)

        now = timezone.now()
        items = (
            CopilotOperationalInsight.objects.filter(
                store_id=store_id,
                status="active",
            )
            .filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gte=now))
            .order_by("-created_at")[:20]
        )

        return Response(
            {"items": CopilotOperationalInsightSerializer(items, many=True).data},
            status=status.HTTP_200_OK,
        )


class CopilotReport72hView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        refresh = str(request.query_params.get("refresh", "0")).lower() in {"1", "true", "yes"}
        row = materialize_report_72h(store_id) if refresh else (
            CopilotReport72h.objects.filter(store_id=store_id)
            .order_by("-generated_at", "-created_at")
            .first()
        )
        if not row:
            row = materialize_report_72h(store_id)

        readiness = evaluate_report_readiness(store)

        if not row:
            return Response(
                {
                    "id": str(uuid.uuid4()),
                    "org_id": str(store.org_id),
                    "store_id": str(store_id),
                    "status": "pending",
                    "generated_at": None,
                    "summary": None,
                    "sections": [],
                    "readiness": readiness,
                    "next_refresh_suggested_seconds": 300,
                },
                status=status.HTTP_200_OK,
            )

        payload = CopilotReport72hSerializer(row).data
        payload["readiness"] = readiness
        payload["next_refresh_suggested_seconds"] = 300 if row.status != "ready" else 3600
        payload["status_detail"] = readiness.get("message")
        return Response(payload, status=status.HTTP_200_OK)


class CopilotConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)
        user_uuid = ensure_user_uuid(request.user)
        limit = min(max(int(request.query_params.get("limit", 50)), 1), 200)

        conversation = (
            CopilotConversation.objects.filter(store_id=store_id, user_uuid=user_uuid)
            .order_by("-updated_at")
            .first()
        )
        if not conversation:
            return Response({"items": []}, status=status.HTTP_200_OK)

        messages = conversation.messages.order_by("-created_at")[:limit]
        data = CopilotMessageSerializer(messages, many=True).data
        data.reverse()
        return Response({"items": data}, status=status.HTTP_200_OK)

    def post(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)
        user_uuid = ensure_user_uuid(request.user)

        serializer = CopilotChatCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]
        session_id = serializer.validated_data.get("session_id") or uuid.uuid4().hex
        context = serializer.validated_data.get("context") or {}
        now = timezone.now()

        with transaction.atomic():
            conversation, _ = CopilotConversation.objects.get_or_create(
                store_id=store_id,
                user_uuid=user_uuid,
                session_id=session_id,
                defaults={
                    "org_id": store.org_id,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            conversation.updated_at = now
            conversation.save(update_fields=["updated_at"])

            message = CopilotMessage.objects.create(
                conversation=conversation,
                role="user",
                content=content,
                context_json=context,
                metadata_json={"source": "dashboard"},
                created_at=now,
            )

        return Response(
            {
                "ok": True,
                "session_id": session_id,
                "message": CopilotMessageSerializer(message).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CopilotStaffPlanActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_MANAGE_ROLES)

        serializer = CopilotStaffPlanActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff_planned_week = serializer.validated_data["staff_planned_week"]
        reason = serializer.validated_data.get("reason") or ""
        source = serializer.validated_data.get("source") or "store_view_manual_action"
        now = timezone.now()
        previous_value = int(store.employees_count or 0)

        user_uuid = ensure_user_uuid(request.user)
        session_id = f"staff-plan-{store_id}"

        try:
            with transaction.atomic():
                store.employees_count = int(staff_planned_week)
                store.updated_at = now
                store.save(update_fields=["employees_count", "updated_at"])

                conversation, _ = CopilotConversation.objects.get_or_create(
                    store_id=store_id,
                    user_uuid=user_uuid,
                    session_id=session_id,
                    defaults={
                        "org_id": store.org_id,
                        "created_at": now,
                        "updated_at": now,
                    },
                )
                conversation.updated_at = now
                conversation.save(update_fields=["updated_at"])

                user_message = (
                    f"Atualizar staff semanal planejado para {staff_planned_week} na loja {store.name}. "
                    f"Motivo: {reason or 'não informado'}."
                )
                CopilotMessage.objects.create(
                    conversation=conversation,
                    role="user",
                    content=user_message,
                    context_json={
                        "action": "staff_plan_update",
                        "previous_value": previous_value,
                        "new_value": int(staff_planned_week),
                        "source": source,
                    },
                    metadata_json={
                        "source": source,
                        "action": "staff_plan_update",
                    },
                    created_at=now,
                )
                CopilotMessage.objects.create(
                    conversation=conversation,
                    role="assistant",
                    content=(
                        f"Staff semanal planejado atualizado para {staff_planned_week} "
                        f"(antes: {previous_value})."
                    ),
                    context_json={
                        "action": "staff_plan_update_confirmation",
                        "previous_value": previous_value,
                        "new_value": int(staff_planned_week),
                    },
                    metadata_json={
                        "action": "staff_plan_update_confirmation",
                        "source": "copilot_action",
                    },
                    created_at=now,
                )
        except Exception:
            logger.exception(
                "Falha ao aplicar atualização de staff semanal via Copiloto",
                extra={"store_id": str(store_id), "user_id": getattr(request.user, "id", None)},
            )
            return Response(
                {
                    "code": "STAFF_PLAN_UPDATE_FAILED",
                    "message": "Falha ao atualizar staff semanal via Copiloto.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "ok": True,
                "store_id": str(store_id),
                "previous_staff_planned_week": previous_value,
                "staff_planned_week": int(staff_planned_week),
                "reason": reason or None,
                "source": source,
                "method": {
                    "id": "copilot_staff_plan_update",
                    "version": "copilot_staff_plan_update_v1_2026-03-13",
                },
            },
            status=status.HTTP_200_OK,
        )


class CopilotStoreProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)
        row = StoreProfile.objects.filter(store_id=store_id).first()
        if not row:
            payload = {
                "id": None,
                "org_id": str(store.org_id),
                "store_id": str(store_id),
                "business_model": "default",
                "has_salao": False,
                "has_pos_integration": False,
                "opening_hours": {},
                "timezone": "America/Sao_Paulo",
                "defaults": {},
                "created_at": None,
                "updated_at": None,
            }
            return Response(payload, status=status.HTTP_200_OK)
        return Response(StoreProfileSerializer(row).data, status=status.HTTP_200_OK)

    def put(self, request, store_id):
        return self._upsert(request, store_id)

    def patch(self, request, store_id):
        return self._upsert(request, store_id, partial=True)

    def _upsert(self, request, store_id, partial=False):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_MANAGE_ROLES)
        now = timezone.now()
        row = StoreProfile.objects.filter(store_id=store_id).first()
        if not row:
            row = StoreProfile(
                org_id=store.org_id,
                store_id=store.id,
                created_at=now,
                updated_at=now,
            )

        serializer = StoreProfileSerializer(row, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        row.business_model = data.get("business_model", row.business_model)
        row.has_salao = data.get("has_salao", row.has_salao)
        row.has_pos_integration = data.get("has_pos_integration", row.has_pos_integration)
        row.opening_hours_json = data.get("opening_hours_json", row.opening_hours_json)
        row.timezone_name = data.get("timezone_name", row.timezone_name)
        row.defaults_json = data.get("defaults_json", row.defaults_json)
        row.updated_at = now
        row.save()
        return Response(StoreProfileSerializer(row).data, status=status.HTTP_200_OK)
