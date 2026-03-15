import uuid
import logging
from datetime import timedelta

from django.db import models, transaction
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cameras.permissions import ALLOWED_MANAGE_ROLES, ALLOWED_READ_ROLES, require_store_role
from apps.core.models import Store
from apps.stores.services.user_uuid import ensure_user_uuid

from .models import (
    ActionOutcome,
    CopilotConversation,
    StoreProfile,
    CopilotMessage,
    CopilotOperationalInsight,
    CopilotReport72h,
    ValueLedgerDaily,
)
from .serializers import (
    CopilotActionOutcomeCreateSerializer,
    CopilotActionOutcomeUpdateSerializer,
    CopilotActionOutcomeSerializer,
    CopilotChatCreateSerializer,
    CopilotMessageSerializer,
    CopilotOperationalInsightSerializer,
    CopilotReport72hSerializer,
    ValueLedgerDailySerializer,
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


def _sync_value_ledger_from_outcome(outcome: ActionOutcome):
    ledger_date = timezone.localtime(outcome.dispatched_at).date() if outcome.dispatched_at else timezone.localdate()
    defaults = {
        "value_recovered_brl": 0,
        "value_at_risk_brl": 0,
        "actions_dispatched": 0,
        "actions_completed": 0,
        "confidence_score_avg": 0,
        "method_version": "value_ledger_v1_2026-03-15",
        "created_at": timezone.now(),
        "updated_at": timezone.now(),
    }
    row, _ = ValueLedgerDaily.objects.get_or_create(
        org_id=outcome.org_id,
        store_id=outcome.store_id,
        ledger_date=ledger_date,
        defaults=defaults,
    )

    outcomes_qs = ActionOutcome.objects.filter(
        org_id=outcome.org_id,
        store_id=outcome.store_id,
        dispatched_at__date=ledger_date,
    )
    agg = outcomes_qs.aggregate(
        expected_total=Sum("impact_expected_brl"),
        recovered_total=Sum("impact_realized_brl"),
        actions_total=Count("id"),
        actions_completed=Sum(
            models.Case(
                models.When(status="completed", then=1),
                default=0,
                output_field=models.IntegerField(),
            )
        ),
        confidence_avg=Avg("confidence_score"),
    )

    row.value_at_risk_brl = float(agg.get("expected_total") or 0)
    row.value_recovered_brl = float(agg.get("recovered_total") or 0)
    row.actions_dispatched = int(agg.get("actions_total") or 0)
    row.actions_completed = int(agg.get("actions_completed") or 0)
    row.confidence_score_avg = float(agg.get("confidence_avg") or 0)
    row.updated_at = timezone.now()
    row.save(
        update_fields=[
            "value_at_risk_brl",
            "value_recovered_brl",
            "actions_dispatched",
            "actions_completed",
            "confidence_score_avg",
            "updated_at",
        ]
    )
    return row


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


class CopilotActionOutcomeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        limit = min(max(int(request.query_params.get("limit", 30)), 1), 200)
        status_filter = str(request.query_params.get("status") or "").strip().lower()
        qs = ActionOutcome.objects.filter(store_id=store_id).order_by("-dispatched_at", "-created_at")
        if status_filter in {"dispatched", "completed", "failed", "canceled"}:
            qs = qs.filter(status=status_filter)
        items = qs[:limit]

        summary = qs.aggregate(
            dispatched=Count("id"),
            completed=Sum(
                models.Case(
                    models.When(status="completed", then=1),
                    default=0,
                    output_field=models.IntegerField(),
                )
            ),
            expected=Sum("impact_expected_brl"),
            realized=Sum("impact_realized_brl"),
            confidence_avg=Avg("confidence_score"),
        )
        return Response(
            {
                "store_id": str(store_id),
                "summary": {
                    "actions_dispatched": int(summary.get("dispatched") or 0),
                    "actions_completed": int(summary.get("completed") or 0),
                    "impact_expected_brl": float(summary.get("expected") or 0),
                    "impact_realized_brl": float(summary.get("realized") or 0),
                    "confidence_score_avg": float(summary.get("confidence_avg") or 0),
                },
                "items": CopilotActionOutcomeSerializer(items, many=True).data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_MANAGE_ROLES)

        serializer = CopilotActionOutcomeCreateSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        now = timezone.now()

        outcome = ActionOutcome.objects.create(
            org_id=store.org_id,
            store_id=store.id,
            action_event_id=validated.get("action_event_id"),
            insight_id=validated["insight_id"],
            action_type=validated.get("action_type") or "whatsapp_delegation",
            channel=validated.get("channel") or "whatsapp",
            source=validated.get("source") or "copilot_decision_center",
            status=validated.get("status") or "dispatched",
            baseline_json=validated.get("baseline") or {},
            outcome_json=validated.get("outcome") or {},
            impact_expected_brl=float(validated.get("impact_expected_brl") or 0),
            impact_realized_brl=float(validated.get("impact_realized_brl") or 0),
            confidence_score=int(validated.get("confidence_score") or 0),
            dispatched_at=validated.get("dispatched_at") or now,
            completed_at=validated.get("completed_at"),
            created_at=now,
            updated_at=now,
        )
        _sync_value_ledger_from_outcome(outcome)
        return Response(CopilotActionOutcomeSerializer(outcome).data, status=status.HTTP_201_CREATED)


class CopilotActionOutcomeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, store_id, outcome_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_MANAGE_ROLES)

        outcome = ActionOutcome.objects.filter(id=outcome_id, store_id=store_id).first()
        if not outcome:
            return Response(
                {"code": "ACTION_OUTCOME_NOT_FOUND", "message": "Action outcome não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CopilotActionOutcomeUpdateSerializer(data=request.data or {}, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        now = timezone.now()

        if "status" in data:
            outcome.status = data["status"]
        if "outcome" in data:
            outcome.outcome_json = data["outcome"] or {}
        if "impact_realized_brl" in data:
            outcome.impact_realized_brl = float(data["impact_realized_brl"] or 0)
        if "confidence_score" in data:
            outcome.confidence_score = int(data["confidence_score"] or 0)

        explicit_completed_at = data.get("completed_at")
        if explicit_completed_at is not None:
            outcome.completed_at = explicit_completed_at
        elif outcome.status == "completed" and not outcome.completed_at:
            outcome.completed_at = now

        outcome.updated_at = now
        outcome.save(
            update_fields=[
                "status",
                "outcome_json",
                "impact_realized_brl",
                "confidence_score",
                "completed_at",
                "updated_at",
            ]
        )
        _sync_value_ledger_from_outcome(outcome)
        return Response(CopilotActionOutcomeSerializer(outcome).data, status=status.HTTP_200_OK)


class CopilotValueLedgerDailyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        days = min(max(int(request.query_params.get("days", 30)), 1), 180)
        from_date = timezone.localdate() - timedelta(days=days - 1)
        rows = (
            ValueLedgerDaily.objects.filter(store_id=store_id, ledger_date__gte=from_date)
            .order_by("-ledger_date")
        )
        totals = rows.aggregate(
            value_recovered=Sum("value_recovered_brl"),
            value_at_risk=Sum("value_at_risk_brl"),
            actions_dispatched=Sum("actions_dispatched"),
            actions_completed=Sum("actions_completed"),
            confidence_avg=Avg("confidence_score_avg"),
        )
        return Response(
            {
                "store_id": str(store_id),
                "days": days,
                "totals": {
                    "value_recovered_brl": float(totals.get("value_recovered") or 0),
                    "value_at_risk_brl": float(totals.get("value_at_risk") or 0),
                    "actions_dispatched": int(totals.get("actions_dispatched") or 0),
                    "actions_completed": int(totals.get("actions_completed") or 0),
                    "confidence_score_avg": float(totals.get("confidence_avg") or 0),
                },
                "items": ValueLedgerDailySerializer(rows, many=True).data,
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
