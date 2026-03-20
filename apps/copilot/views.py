import uuid
import logging
import os
from datetime import timedelta
from secrets import compare_digest

from django.db import models, transaction
from django.db.models import Avg, Count, Max, Sum
from django.utils import timezone
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cameras.permissions import ALLOWED_MANAGE_ROLES, ALLOWED_READ_ROLES, require_store_role
from apps.core.models import DetectionEvent, Store
from apps.stores.services.user_uuid import ensure_user_uuid
from apps.stores.services.user_orgs import get_user_org_ids

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
    CopilotActionOutcomeCallbackSerializer,
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


def _ledger_confidence_tier(confidence_score: float) -> str:
    score = float(confidence_score or 0)
    if score >= 80:
        return "official"
    if score >= 60:
        return "validated"
    return "estimated"


def _ledger_value_status(*, confidence_score: float, actions_completed: int, recovery_rate: float) -> str:
    tier = _ledger_confidence_tier(confidence_score)
    if tier == "official" and actions_completed >= 3 and recovery_rate >= 60:
        return "official"
    if tier in {"official", "validated"} and actions_completed >= 1:
        return "validated"
    return "estimated"


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


def _is_valid_n8n_service_token(request) -> bool:
    expected = (
        getattr(settings, "N8N_SERVICE_TOKEN", None)
        or os.getenv("N8N_SERVICE_TOKEN")
        or ""
    ).strip()
    provided = (
        request.headers.get("X-N8N-SERVICE-TOKEN")
        or request.headers.get("X-DALE-SERVICE-TOKEN")
        or ""
    ).strip()
    return bool(expected and provided and compare_digest(expected, provided))


def _build_daily_briefing_payload(
    *,
    org_ids: list[str] | None = None,
    store_id=None,
    store_name: str | None = None,
    owner_goal: str | None = None,
    notification_tone: str | None = None,
):
    today = timezone.localdate()

    ledger_qs = ValueLedgerDaily.objects.filter(ledger_date=today)
    outcomes_qs = ActionOutcome.objects.filter(dispatched_at__date=today)
    critical_events_qs = DetectionEvent.objects.filter(status="open", severity="critical")

    if org_ids:
        ledger_qs = ledger_qs.filter(org_id__in=org_ids)
        outcomes_qs = outcomes_qs.filter(org_id__in=org_ids)
        critical_events_qs = critical_events_qs.filter(org_id__in=org_ids)
    if store_id:
        ledger_qs = ledger_qs.filter(store_id=store_id)
        outcomes_qs = outcomes_qs.filter(store_id=store_id)
        critical_events_qs = critical_events_qs.filter(store_id=store_id)

    ledger_totals = ledger_qs.aggregate(
        value_recovered=Sum("value_recovered_brl"),
        value_at_risk=Sum("value_at_risk_brl"),
        actions_dispatched=Sum("actions_dispatched"),
        actions_completed=Sum("actions_completed"),
    )
    outcomes_totals = outcomes_qs.aggregate(
        actions_total=Count("id"),
        completed_total=Sum(
            models.Case(
                models.When(status="completed", then=1),
                default=0,
                output_field=models.IntegerField(),
            )
        ),
    )

    value_recovered_brl = float(ledger_totals.get("value_recovered") or 0)
    value_at_risk_brl = float(ledger_totals.get("value_at_risk") or 0)
    actions_dispatched = int(ledger_totals.get("actions_dispatched") or outcomes_totals.get("actions_total") or 0)
    actions_completed = int(ledger_totals.get("actions_completed") or outcomes_totals.get("completed_total") or 0)
    critical_open_total = int(critical_events_qs.count() or 0)

    completion_rate = (
        round((actions_completed / actions_dispatched) * 100, 1)
        if actions_dispatched > 0
        else 0.0
    )
    value_net_gap_brl = max(0.0, round(value_at_risk_brl - value_recovered_brl, 2))

    tone = str(notification_tone or "formal").strip().lower()
    is_friendly_tone = tone in {"friendly", "amigavel", "amigável"}

    if critical_open_total > 0 or value_net_gap_brl >= 1000:
        briefing_state = "critical"
        headline = (
            f"{critical_open_total} alerta(s) crítico(s) em aberto"
            if critical_open_total > 0
            else "Risco financeiro elevado detectado na operação"
        )
        message = (
            "Priorize intervenção imediata para conter perda de conversão e estabilizar atendimento."
            if not is_friendly_tone
            else "Atenção máxima agora: vamos agir rápido para proteger conversão e manter o time no controle."
        )
        if store_id:
            href = f"/app/alerts?store_id={store_id}"
        else:
            href = "/app/alerts"
        cta_label = "Resolver alertas críticos"
    elif value_net_gap_brl > 0 or (actions_dispatched > 0 and completion_rate < 60):
        briefing_state = "attention"
        headline = "Oportunidades de recuperação em aberto hoje"
        message = (
            "Há ações pendentes com potencial de recuperar valor no turno. "
            "Priorize execução nas lojas com maior impacto."
            if not is_friendly_tone
            else "Temos oportunidades claras de ganho neste turno. Foco nas lojas de maior impacto para fechar o dia melhor."
        )
        if store_id:
            href = f"/app/operations/stores/{store_id}"
        else:
            href = "/app/operations"
        cta_label = "Priorizar execução"
    else:
        briefing_state = "calm"
        headline = "Operação estável agora"
        message = (
            "A rede está sob controle. Use este momento para revisar metas e capturar novas oportunidades."
            if not is_friendly_tone
            else "Tudo está estável agora. Excelente momento para revisar metas e avançar em oportunidades."
        )
        if store_id:
            href = f"/app/reports?store_id={store_id}"
        else:
            href = "/app/reports"
        cta_label = "Revisar evolução"

    moment_of_pride = {
        "show": bool(
            (value_recovered_brl >= value_at_risk_brl and actions_completed >= 3)
            or value_recovered_brl >= 1500
        ),
        "title": "Momento de orgulho",
        "description": (
            f"Hoje você recuperou R$ {value_recovered_brl:.2f} em valor operacional."
            if value_recovered_brl > 0
            else "Sem valor recuperado registrado até o momento."
        ),
    }

    owner_goal_text = str(owner_goal or "").strip()
    if owner_goal_text:
        message = f"{message} Objetivo do dono em foco: {owner_goal_text}."

    return {
        "generated_at": timezone.now().isoformat(),
        "briefing_state": briefing_state,
        "headline": headline,
        "message": message,
        "store_id": str(store_id) if store_id else None,
        "store_name": store_name,
        "metrics": {
            "critical_open_total": critical_open_total,
            "actions_dispatched": actions_dispatched,
            "actions_completed": actions_completed,
            "completion_rate": completion_rate,
            "value_recovered_brl": value_recovered_brl,
            "value_at_risk_brl": value_at_risk_brl,
            "value_net_gap_brl": value_net_gap_brl,
        },
        "cta": {
            "label": cta_label,
            "href": href,
        },
        "moment_of_pride": moment_of_pride,
    }


class CopilotDailyBriefingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id_raw = str(request.query_params.get("store_id") or "").strip()
        org_ids = list(get_user_org_ids(request.user))
        is_internal = bool(
            getattr(request.user, "is_staff", False)
            or getattr(request.user, "is_superuser", False)
        )

        if store_id_raw:
            store, err = _get_store_or_404(store_id_raw)
            if err:
                return err
            require_store_role(request.user, str(store.id), ALLOWED_READ_ROLES)
            profile = StoreProfile.objects.filter(store_id=store.id).first()
            defaults = profile.defaults_json if profile and isinstance(profile.defaults_json, dict) else {}
            payload = _build_daily_briefing_payload(
                org_ids=[str(store.org_id)],
                store_id=store.id,
                store_name=store.name,
                owner_goal=str(defaults.get("owner_goal") or "").strip() or None,
                notification_tone=str(defaults.get("notification_tone") or "").strip() or None,
            )
            return Response(payload, status=status.HTTP_200_OK)

        if not org_ids and not is_internal:
            return Response(
                {
                    "generated_at": timezone.now().isoformat(),
                    "briefing_state": "calm",
                    "headline": "Sem escopo de loja para briefing",
                    "message": "Nenhuma organização vinculada ao usuário para compor recomendações.",
                    "store_id": None,
                    "store_name": None,
                    "metrics": {
                        "critical_open_total": 0,
                        "actions_dispatched": 0,
                        "actions_completed": 0,
                        "completion_rate": 0.0,
                        "value_recovered_brl": 0.0,
                        "value_at_risk_brl": 0.0,
                        "value_net_gap_brl": 0.0,
                    },
                    "cta": {
                        "label": "Selecionar loja",
                        "href": "/app/operations/stores",
                    },
                    "moment_of_pride": {
                        "show": False,
                        "title": "Momento de orgulho",
                        "description": "Sem dados suficientes para celebrar progresso hoje.",
                    },
                },
                status=status.HTTP_200_OK,
            )

        payload = _build_daily_briefing_payload(
            org_ids=[str(org_id) for org_id in org_ids] if org_ids else None
        )
        return Response(payload, status=status.HTTP_200_OK)


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
            delivered=Sum(
                models.Case(
                    models.When(delivery_status__in=["sent", "delivered", "read"], then=1),
                    default=0,
                    output_field=models.IntegerField(),
                )
            ),
            expected=Sum("impact_expected_brl"),
            realized=Sum("impact_realized_brl"),
            confidence_avg=Avg("confidence_score"),
        )
        actions_dispatched = int(summary.get("dispatched") or 0)
        actions_completed = int(summary.get("completed") or 0)
        actions_delivered = int(summary.get("delivered") or 0)
        impact_expected_brl = float(summary.get("expected") or 0)
        impact_realized_brl = float(summary.get("realized") or 0)
        completion_rate = round((actions_completed / actions_dispatched) * 100, 1) if actions_dispatched > 0 else 0.0
        delivery_rate = round((actions_delivered / actions_dispatched) * 100, 1) if actions_dispatched > 0 else 0.0
        recovery_rate = round((impact_realized_brl / impact_expected_brl) * 100, 1) if impact_expected_brl > 0 else 0.0
        return Response(
            {
                "store_id": str(store_id),
                "summary": {
                    "actions_dispatched": actions_dispatched,
                    "actions_delivered": actions_delivered,
                    "actions_completed": actions_completed,
                    "impact_expected_brl": impact_expected_brl,
                    "impact_realized_brl": impact_realized_brl,
                    "completion_rate": completion_rate,
                    "delivery_rate": delivery_rate,
                    "recovery_rate": recovery_rate,
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
            outcome_status=validated.get("outcome_status"),
            outcome_comment=(validated.get("outcome_comment") or None),
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
        if "outcome_status" in data:
            outcome.outcome_status = data.get("outcome_status")
        if "outcome_comment" in data:
            outcome.outcome_comment = data.get("outcome_comment") or None
        if "outcome" in data:
            outcome.outcome_json = data["outcome"] or {}
        if "impact_realized_brl" in data:
            outcome.impact_realized_brl = float(data["impact_realized_brl"] or 0)
        if "confidence_score" in data:
            outcome.confidence_score = int(data["confidence_score"] or 0)
        if "provider_message_id" in data:
            outcome.provider_message_id = data.get("provider_message_id") or None
        if "delivery_status" in data:
            outcome.delivery_status = data.get("delivery_status") or None
        if "delivery_error" in data:
            outcome.delivery_error = data.get("delivery_error") or None
        if "delivered_at" in data:
            outcome.delivered_at = data.get("delivered_at")
        if "failed_at" in data:
            outcome.failed_at = data.get("failed_at")

        explicit_completed_at = data.get("completed_at")
        if explicit_completed_at is not None:
            outcome.completed_at = explicit_completed_at
        elif outcome.status == "completed" and not outcome.completed_at:
            outcome.completed_at = now

        outcome.updated_at = now
        outcome.save(
            update_fields=[
                "status",
                "outcome_status",
                "outcome_comment",
                "outcome_json",
                "impact_realized_brl",
                "confidence_score",
                "provider_message_id",
                "delivery_status",
                "delivery_error",
                "delivered_at",
                "failed_at",
                "completed_at",
                "updated_at",
            ]
        )
        _sync_value_ledger_from_outcome(outcome)
        return Response(CopilotActionOutcomeSerializer(outcome).data, status=status.HTTP_200_OK)


class CopilotActionOutcomeCallbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not _is_valid_n8n_service_token(request):
            return Response(
                {"code": "FORBIDDEN", "message": "Token de serviço inválido."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CopilotActionOutcomeCallbackSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        event_id = data["event_id"]
        outcome = ActionOutcome.objects.filter(action_event_id=event_id).order_by("-dispatched_at").first()
        if not outcome:
            return Response(
                {"code": "ACTION_OUTCOME_NOT_FOUND", "message": "Outcome não encontrado para event_id informado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        now = timezone.now()
        delivery_status = (data.get("delivery_status") or "").strip().lower() or None
        provider_message_id = data.get("provider_message_id") or None
        delivery_error = data.get("delivery_error") or None
        callback_ts = data.get("ts")
        channel = (data.get("channel") or "").strip() or None
        action_dispatch_id = data.get("action_dispatch_id") or None

        outcome.provider_message_id = provider_message_id or outcome.provider_message_id
        outcome.delivery_status = delivery_status or outcome.delivery_status
        outcome.delivery_error = delivery_error
        if channel and not outcome.channel:
            outcome.channel = channel

        if delivery_status in {"delivered", "read", "sent"}:
            outcome.delivered_at = callback_ts or now
        if delivery_status in {"failed", "undelivered", "error"}:
            outcome.failed_at = callback_ts or now
            if outcome.status == "dispatched":
                outcome.status = "failed"
                if not outcome.completed_at:
                    outcome.completed_at = callback_ts or now

        meta = dict(outcome.outcome_json or {})
        if action_dispatch_id:
            meta["action_dispatch_id"] = action_dispatch_id
        if channel:
            meta["channel_callback"] = channel
        meta["delivery_callback_ts"] = (callback_ts or now).isoformat()
        outcome.outcome_json = meta
        outcome.updated_at = now
        outcome.save(
            update_fields=[
                "provider_message_id",
                "delivery_status",
                "delivery_error",
                "delivered_at",
                "failed_at",
                "status",
                "completed_at",
                "channel",
                "outcome_json",
                "updated_at",
            ]
        )
        _sync_value_ledger_from_outcome(outcome)
        return Response(
            {
                "ok": True,
                "event_id": str(event_id),
                "outcome_id": str(outcome.id),
                "status": outcome.status,
                "delivery_status": outcome.delivery_status,
            },
            status=status.HTTP_200_OK,
        )


class CopilotValueLedgerDailyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store, err = _get_store_or_404(store_id)
        if err:
            return err
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        days = min(max(int(request.query_params.get("days", 30)), 1), 730)
        from_date = timezone.localdate() - timedelta(days=days - 1)
        rows = (
            ValueLedgerDaily.objects.filter(store_id=store_id, ledger_date__gte=from_date)
            .order_by("-ledger_date")
        )
        latest_row = rows.first()
        slo_target_seconds = 900
        if latest_row and latest_row.updated_at:
            freshness_seconds = max(0, int((timezone.now() - latest_row.updated_at).total_seconds()))
            pipeline_status = "healthy" if freshness_seconds <= slo_target_seconds else "stale"
            slo_breached = freshness_seconds > slo_target_seconds
            recommended_action = (
                "Trilha de valor da loja em dia."
                if pipeline_status == "healthy"
                else "Ledger da loja desatualizado. Verificar dispatch/outcome e job de materializacao."
            )
        else:
            freshness_seconds = None
            pipeline_status = "no_data"
            slo_breached = False
            recommended_action = "Sem dados de ledger para esta loja no periodo selecionado."
        totals = rows.aggregate(
            value_recovered=Sum("value_recovered_brl"),
            value_at_risk=Sum("value_at_risk_brl"),
            actions_dispatched=Sum("actions_dispatched"),
            actions_completed=Sum("actions_completed"),
            confidence_avg=Avg("confidence_score_avg"),
        )
        value_recovered_brl = float(totals.get("value_recovered") or 0)
        value_at_risk_brl = float(totals.get("value_at_risk") or 0)
        value_net_gap_brl = max(0.0, round(value_at_risk_brl - value_recovered_brl, 2))
        actions_dispatched = int(totals.get("actions_dispatched") or 0)
        actions_completed = int(totals.get("actions_completed") or 0)
        completion_rate = round((actions_completed / actions_dispatched) * 100, 1) if actions_dispatched > 0 else 0.0
        recovery_rate = round((value_recovered_brl / value_at_risk_brl) * 100, 1) if value_at_risk_brl > 0 else 0.0
        confidence_score_avg = float(totals.get("confidence_avg") or 0)
        value_status = _ledger_value_status(
            confidence_score=confidence_score_avg,
            actions_completed=actions_completed,
            recovery_rate=recovery_rate,
        )
        serialized_items = ValueLedgerDailySerializer(rows, many=True).data
        status_summary = {"official": 0, "validated": 0, "estimated": 0}
        enriched_items = []
        for row, item in zip(rows, serialized_items):
            item_value_recovered = float(getattr(row, "value_recovered_brl", 0) or 0)
            item_value_at_risk = float(getattr(row, "value_at_risk_brl", 0) or 0)
            item_recovery_rate = (
                round((item_value_recovered / item_value_at_risk) * 100, 1)
                if item_value_at_risk > 0
                else 0.0
            )
            item_actions_completed = int(getattr(row, "actions_completed", 0) or 0)
            item_confidence = float(getattr(row, "confidence_score_avg", 0) or 0)
            item_status = _ledger_value_status(
                confidence_score=item_confidence,
                actions_completed=item_actions_completed,
                recovery_rate=item_recovery_rate,
            )
            status_summary[item_status] = int(status_summary.get(item_status, 0)) + 1
            enriched_items.append(
                {
                    **item,
                    "value_status": item_status,
                    "confidence_tier": _ledger_confidence_tier(item_confidence),
                    "recovery_rate": item_recovery_rate,
                }
            )
        return Response(
            {
                "store_id": str(store_id),
                "days": days,
                "method_version_current": getattr(latest_row, "method_version", "value_ledger_v1_2026-03-15"),
                "pipeline_health": {
                    "status": pipeline_status,
                    "freshness_seconds": freshness_seconds,
                    "last_updated_at": latest_row.updated_at.isoformat() if latest_row and latest_row.updated_at else None,
                    "stores_with_ledger": 1 if latest_row else 0,
                    "stores_total": 1,
                    "coverage_rate": 100 if latest_row else 0,
                    "slo_target_seconds": slo_target_seconds,
                    "slo_breached": slo_breached,
                    "recommended_action": recommended_action,
                },
                "totals": {
                    "value_recovered_brl": value_recovered_brl,
                    "value_at_risk_brl": value_at_risk_brl,
                    "value_net_gap_brl": value_net_gap_brl,
                    "actions_dispatched": actions_dispatched,
                    "actions_completed": actions_completed,
                    "completion_rate": completion_rate,
                    "recovery_rate": recovery_rate,
                    "confidence_score_avg": confidence_score_avg,
                    "value_status": value_status,
                    "confidence_tier": _ledger_confidence_tier(confidence_score_avg),
                },
                "value_status_summary": status_summary,
                "items": enriched_items,
            },
            status=status.HTTP_200_OK,
        )


class CopilotNetworkActionOutcomeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(max(int(request.query_params.get("limit", 30)), 1), 200)
        status_filter = str(request.query_params.get("status") or "").strip().lower()
        org_ids = list(get_user_org_ids(request.user))
        if not org_ids and not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
            return Response(
                {
                    "store_id": "all",
                    "summary": {
                        "actions_dispatched": 0,
                        "actions_completed": 0,
                        "impact_expected_brl": 0.0,
                        "impact_realized_brl": 0.0,
                        "completion_rate": 0.0,
                        "recovery_rate": 0.0,
                        "confidence_score_avg": 0.0,
                    },
                    "breakdown_by_store": [],
                    "items": [],
                },
                status=status.HTTP_200_OK,
            )

        qs = ActionOutcome.objects.all().order_by("-dispatched_at", "-created_at")
        if org_ids:
            qs = qs.filter(org_id__in=org_ids)
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
        actions_dispatched = int(summary.get("dispatched") or 0)
        actions_completed = int(summary.get("completed") or 0)
        impact_expected_brl = float(summary.get("expected") or 0)
        impact_realized_brl = float(summary.get("realized") or 0)
        completion_rate = round((actions_completed / actions_dispatched) * 100, 1) if actions_dispatched > 0 else 0.0
        recovery_rate = round((impact_realized_brl / impact_expected_brl) * 100, 1) if impact_expected_brl > 0 else 0.0
        breakdown_rows = list(
            qs.values("store_id")
            .annotate(
                actions_dispatched=Count("id"),
                actions_completed=Sum(
                    models.Case(
                        models.When(status="completed", then=1),
                        default=0,
                        output_field=models.IntegerField(),
                    )
                ),
                impact_expected_brl=Sum("impact_expected_brl"),
                impact_realized_brl=Sum("impact_realized_brl"),
                confidence_score_avg=Avg("confidence_score"),
            )
            .order_by("-impact_expected_brl")[:10]
        )
        store_name_map = {
            str(row["id"]): row["name"]
            for row in Store.objects.filter(id__in=[row.get("store_id") for row in breakdown_rows]).values("id", "name")
        }
        return Response(
            {
                "store_id": "all",
                "summary": {
                    "actions_dispatched": actions_dispatched,
                    "actions_completed": actions_completed,
                    "impact_expected_brl": impact_expected_brl,
                    "impact_realized_brl": impact_realized_brl,
                    "completion_rate": completion_rate,
                    "recovery_rate": recovery_rate,
                    "confidence_score_avg": float(summary.get("confidence_avg") or 0),
                },
                "breakdown_by_store": [
                    {
                        "store_id": str(row.get("store_id")),
                        "store_name": store_name_map.get(str(row.get("store_id"))),
                        "actions_dispatched": int(row.get("actions_dispatched") or 0),
                        "actions_completed": int(row.get("actions_completed") or 0),
                        "impact_expected_brl": float(row.get("impact_expected_brl") or 0),
                        "impact_realized_brl": float(row.get("impact_realized_brl") or 0),
                        "completion_rate": round(
                            (
                                (int(row.get("actions_completed") or 0) / int(row.get("actions_dispatched") or 0))
                                * 100
                            ),
                            1,
                        )
                        if int(row.get("actions_dispatched") or 0) > 0
                        else 0.0,
                        "recovery_rate": round(
                            (
                                (float(row.get("impact_realized_brl") or 0) / float(row.get("impact_expected_brl") or 0))
                                * 100
                            ),
                            1,
                        )
                        if float(row.get("impact_expected_brl") or 0) > 0
                        else 0.0,
                        "confidence_score_avg": float(row.get("confidence_score_avg") or 0),
                    }
                    for row in breakdown_rows
                ],
                "items": CopilotActionOutcomeSerializer(items, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class CopilotNetworkValueLedgerDailyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = min(max(int(request.query_params.get("days", 30)), 1), 730)
        coverage_min = min(max(int(request.query_params.get("coverage_min", 80)), 0), 100)
        stale_rate_max = min(max(int(request.query_params.get("stale_rate_max", 20)), 0), 100)
        no_data_rate_max = min(max(int(request.query_params.get("no_data_rate_max", 20)), 0), 100)
        from_date = timezone.localdate() - timedelta(days=days - 1)
        org_ids = list(get_user_org_ids(request.user))
        if not org_ids and not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
            return Response(
                {
                    "store_id": "all",
                    "days": days,
                    "method_version_current": "value_ledger_v1_2026-03-15",
                    "pipeline_health": {
                        "status": "no_data",
                        "freshness_seconds": None,
                        "last_updated_at": None,
                        "stores_with_ledger": 0,
                        "stores_total": 0,
                    "coverage_rate": 0,
                    "slo_target_seconds": 900,
                    "slo_breached": False,
                    "recommended_action": "Sem escopo de org para leitura de ledger.",
                },
                    "sprint2_acceptance": {
                        "decision": "NO-GO",
                        "coverage_min": coverage_min,
                        "stale_rate_max": stale_rate_max,
                        "no_data_rate_max": no_data_rate_max,
                        "coverage_rate": 0,
                        "stale_rate": 0,
                        "no_data_rate": 0,
                        "reason": "Sem escopo de organização para avaliação.",
                    },
                    "totals": {
                        "value_recovered_brl": 0.0,
                        "value_at_risk_brl": 0.0,
                        "value_net_gap_brl": 0.0,
                        "actions_dispatched": 0,
                        "actions_completed": 0,
                        "completion_rate": 0.0,
                        "recovery_rate": 0.0,
                        "confidence_score_avg": 0.0,
                        "value_status": "estimated",
                        "confidence_tier": "estimated",
                    },
                    "value_status_summary": {"official": 0, "validated": 0, "estimated": 0},
                    "breakdown_by_store": [],
                    "items": [],
                },
                status=status.HTTP_200_OK,
            )

        rows = ValueLedgerDaily.objects.filter(ledger_date__gte=from_date).order_by("-ledger_date")
        if org_ids:
            rows = rows.filter(org_id__in=org_ids)
        latest_row = rows.first()
        stores_total = Store.objects.filter(org_id__in=org_ids).values("id").distinct().count() if org_ids else 0
        stores_with_ledger = rows.values("store_id").distinct().count()
        totals = rows.aggregate(
            value_recovered=Sum("value_recovered_brl"),
            value_at_risk=Sum("value_at_risk_brl"),
            actions_dispatched=Sum("actions_dispatched"),
            actions_completed=Sum("actions_completed"),
            confidence_avg=Avg("confidence_score_avg"),
        )
        value_recovered_brl = float(totals.get("value_recovered") or 0)
        value_at_risk_brl = float(totals.get("value_at_risk") or 0)
        value_net_gap_brl = max(0.0, round(value_at_risk_brl - value_recovered_brl, 2))
        actions_dispatched = int(totals.get("actions_dispatched") or 0)
        actions_completed = int(totals.get("actions_completed") or 0)
        completion_rate = round((actions_completed / actions_dispatched) * 100, 1) if actions_dispatched > 0 else 0.0
        recovery_rate = round((value_recovered_brl / value_at_risk_brl) * 100, 1) if value_at_risk_brl > 0 else 0.0
        confidence_score_avg = float(totals.get("confidence_avg") or 0)
        value_status = _ledger_value_status(
            confidence_score=confidence_score_avg,
            actions_completed=actions_completed,
            recovery_rate=recovery_rate,
        )
        slo_target_seconds = 900
        if latest_row and latest_row.updated_at:
            freshness_seconds = max(0, int((timezone.now() - latest_row.updated_at).total_seconds()))
            pipeline_status = "healthy" if freshness_seconds <= slo_target_seconds else "stale"
            slo_breached = freshness_seconds > slo_target_seconds
            recommended_action = (
                "Trilha de valor em dia."
                if pipeline_status == "healthy"
                else "Atualizacao de ledger atrasada. Verificar job de materializacao e eventos de outcome."
            )
        else:
            freshness_seconds = None
            pipeline_status = "no_data"
            slo_breached = False
            recommended_action = "Sem dados de ledger no periodo. Validar dispatch e conclusao de acoes."
        coverage_rate = int(round((stores_with_ledger / stores_total) * 100)) if stores_total > 0 else 0
        last_updates = list(rows.values("store_id").annotate(last_updated_at=Max("updated_at")))
        stale_stores = 0
        for entry in last_updates:
            updated_at = entry.get("last_updated_at")
            if not updated_at:
                continue
            freshness = max(0, int((timezone.now() - updated_at).total_seconds()))
            if freshness > slo_target_seconds:
                stale_stores += 1
        no_data_stores = max(int(stores_total or 0) - int(stores_with_ledger or 0), 0)
        stale_rate = int(round((stale_stores / stores_total) * 100)) if stores_total > 0 else 0
        no_data_rate = int(round((no_data_stores / stores_total) * 100)) if stores_total > 0 else 0
        decision_go = (
            stores_total > 0
            and coverage_rate >= coverage_min
            and stale_rate <= stale_rate_max
            and no_data_rate <= no_data_rate_max
        )
        sprint2_reason = (
            "Critérios atendidos para fechamento operacional."
            if decision_go
            else "Critérios de aceite não atendidos. Priorizar lojas stale/no_data."
        )
        breakdown_rows = list(
            rows.values("store_id")
            .annotate(
                value_recovered_brl=Sum("value_recovered_brl"),
                value_at_risk_brl=Sum("value_at_risk_brl"),
                actions_dispatched=Sum("actions_dispatched"),
                actions_completed=Sum("actions_completed"),
                confidence_score_avg=Avg("confidence_score_avg"),
            )
            .order_by("-value_at_risk_brl")[:10]
        )
        status_summary = {"official": 0, "validated": 0, "estimated": 0}
        serialized_items = ValueLedgerDailySerializer(rows[:200], many=True).data
        enriched_items = []
        for item in serialized_items:
            item_value_recovered = float((item.get("value_recovered_brl") or 0))
            item_value_at_risk = float((item.get("value_at_risk_brl") or 0))
            item_recovery_rate = (
                round((item_value_recovered / item_value_at_risk) * 100, 1)
                if item_value_at_risk > 0
                else 0.0
            )
            item_actions_completed = int((item.get("actions_completed") or 0))
            item_confidence = float((item.get("confidence_score_avg") or 0))
            item_status = _ledger_value_status(
                confidence_score=item_confidence,
                actions_completed=item_actions_completed,
                recovery_rate=item_recovery_rate,
            )
            status_summary[item_status] = int(status_summary.get(item_status, 0)) + 1
            enriched_items.append(
                {
                    **item,
                    "value_status": item_status,
                    "confidence_tier": _ledger_confidence_tier(item_confidence),
                    "recovery_rate": item_recovery_rate,
                }
            )
        store_name_map = {
            str(row["id"]): row["name"]
            for row in Store.objects.filter(id__in=[row.get("store_id") for row in breakdown_rows]).values("id", "name")
        }
        return Response(
            {
                "store_id": "all",
                "days": days,
                "method_version_current": getattr(latest_row, "method_version", "value_ledger_v1_2026-03-15"),
                "pipeline_health": {
                    "status": pipeline_status,
                    "freshness_seconds": freshness_seconds,
                    "last_updated_at": latest_row.updated_at.isoformat() if latest_row and latest_row.updated_at else None,
                    "stores_with_ledger": int(stores_with_ledger or 0),
                    "stores_total": int(stores_total or 0),
                    "coverage_rate": coverage_rate,
                    "slo_target_seconds": slo_target_seconds,
                    "slo_breached": slo_breached,
                    "recommended_action": recommended_action,
                },
                "sprint2_acceptance": {
                    "decision": "GO" if decision_go else "NO-GO",
                    "coverage_min": coverage_min,
                    "stale_rate_max": stale_rate_max,
                    "no_data_rate_max": no_data_rate_max,
                    "coverage_rate": coverage_rate,
                    "stale_rate": stale_rate,
                    "no_data_rate": no_data_rate,
                    "reason": sprint2_reason,
                },
                "totals": {
                    "value_recovered_brl": value_recovered_brl,
                    "value_at_risk_brl": value_at_risk_brl,
                    "value_net_gap_brl": value_net_gap_brl,
                    "actions_dispatched": actions_dispatched,
                    "actions_completed": actions_completed,
                    "completion_rate": completion_rate,
                    "recovery_rate": recovery_rate,
                    "confidence_score_avg": confidence_score_avg,
                    "value_status": value_status,
                    "confidence_tier": _ledger_confidence_tier(confidence_score_avg),
                },
                "value_status_summary": status_summary,
                "breakdown_by_store": [
                    {
                        "store_id": str(row.get("store_id")),
                        "store_name": store_name_map.get(str(row.get("store_id"))),
                        "value_recovered_brl": float(row.get("value_recovered_brl") or 0),
                        "value_at_risk_brl": float(row.get("value_at_risk_brl") or 0),
                        "value_net_gap_brl": max(
                            0.0,
                            round(
                                float(row.get("value_at_risk_brl") or 0) - float(row.get("value_recovered_brl") or 0),
                                2,
                            ),
                        ),
                        "actions_dispatched": int(row.get("actions_dispatched") or 0),
                        "actions_completed": int(row.get("actions_completed") or 0),
                        "completion_rate": round(
                            (
                                (int(row.get("actions_completed") or 0) / int(row.get("actions_dispatched") or 0))
                                * 100
                            ),
                            1,
                        )
                        if int(row.get("actions_dispatched") or 0) > 0
                        else 0.0,
                        "recovery_rate": round(
                            (
                                (float(row.get("value_recovered_brl") or 0) / float(row.get("value_at_risk_brl") or 0))
                                * 100
                            ),
                            1,
                        )
                        if float(row.get("value_at_risk_brl") or 0) > 0
                        else 0.0,
                        "confidence_score_avg": float(row.get("confidence_score_avg") or 0),
                        "value_status": _ledger_value_status(
                            confidence_score=float(row.get("confidence_score_avg") or 0),
                            actions_completed=int(row.get("actions_completed") or 0),
                            recovery_rate=(
                                round(
                                    (
                                        (float(row.get("value_recovered_brl") or 0)
                                         / float(row.get("value_at_risk_brl") or 0))
                                        * 100
                                    ),
                                    1,
                                )
                                if float(row.get("value_at_risk_brl") or 0) > 0
                                else 0.0
                            ),
                        ),
                    }
                    for row in breakdown_rows
                ],
                "items": enriched_items,
            },
            status=status.HTTP_200_OK,
        )


class CopilotNetworkEfficiencyRankingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period_days = min(max(int(request.query_params.get("days", 30)), 1), 180)
        org_ids = list(get_user_org_ids(request.user))
        is_internal = bool(
            getattr(request.user, "is_staff", False)
            or getattr(request.user, "is_superuser", False)
        )
        if not org_ids and not is_internal:
            return Response(
                {
                    "period_days": period_days,
                    "anonymized": False,
                    "items": [],
                    "summary": {
                        "stores_total": 0,
                        "median_score": 0,
                        "best_score": 0,
                        "worst_score": 0,
                    },
                },
                status=status.HTTP_200_OK,
            )

        anonymized_param = str(request.query_params.get("anonymized") or "").strip().lower()
        if anonymized_param in {"1", "true", "yes"}:
            anonymized = True
        elif anonymized_param in {"0", "false", "no"}:
            anonymized = False
        else:
            sample_profile = (
                StoreProfile.objects.filter(org_id__in=org_ids).order_by("-updated_at").first()
                if org_ids
                else None
            )
            defaults = sample_profile.defaults_json if sample_profile and isinstance(sample_profile.defaults_json, dict) else {}
            anonymized = bool(defaults.get("ranking_anonymized", False))

        from_date = timezone.localdate() - timedelta(days=period_days - 1)
        stores_qs = Store.objects.all()
        if org_ids:
            stores_qs = stores_qs.filter(org_id__in=org_ids)
        stores = list(stores_qs.values("id", "name"))
        store_ids = [row["id"] for row in stores]
        if not store_ids:
            return Response(
                {
                    "period_days": period_days,
                    "anonymized": anonymized,
                    "items": [],
                    "summary": {
                        "stores_total": 0,
                        "median_score": 0,
                        "best_score": 0,
                        "worst_score": 0,
                    },
                },
                status=status.HTTP_200_OK,
            )

        events_agg = (
            DetectionEvent.objects.filter(store_id__in=store_ids, created_at__date__gte=from_date)
            .values("store_id")
            .annotate(
                critical_open=Sum(
                    models.Case(
                        models.When(severity="critical", status="open", then=1),
                        default=0,
                        output_field=models.IntegerField(),
                    )
                ),
                warning_open=Sum(
                    models.Case(
                        models.When(severity="warning", status="open", then=1),
                        default=0,
                        output_field=models.IntegerField(),
                    )
                ),
                total_events=Count("id"),
            )
        )
        outcomes_agg = (
            ActionOutcome.objects.filter(store_id__in=store_ids, dispatched_at__date__gte=from_date)
            .values("store_id")
            .annotate(
                actions_dispatched=Count("id"),
                actions_completed=Sum(
                    models.Case(
                        models.When(status="completed", then=1),
                        default=0,
                        output_field=models.IntegerField(),
                    )
                ),
                impact_expected_brl=Sum("impact_expected_brl"),
                impact_realized_brl=Sum("impact_realized_brl"),
                confidence_avg=Avg("confidence_score"),
            )
        )
        ledger_agg = (
            ValueLedgerDaily.objects.filter(store_id__in=store_ids, ledger_date__gte=from_date)
            .values("store_id")
            .annotate(
                value_recovered_brl=Sum("value_recovered_brl"),
                value_at_risk_brl=Sum("value_at_risk_brl"),
                confidence_score_avg=Avg("confidence_score_avg"),
            )
        )

        events_map = {str(row["store_id"]): row for row in events_agg}
        outcomes_map = {str(row["store_id"]): row for row in outcomes_agg}
        ledger_map = {str(row["store_id"]): row for row in ledger_agg}

        items = []
        for row in stores:
            store_id = str(row["id"])
            event = events_map.get(store_id, {})
            outcome = outcomes_map.get(store_id, {})
            ledger = ledger_map.get(store_id, {})

            critical_open = int(event.get("critical_open") or 0)
            warning_open = int(event.get("warning_open") or 0)
            actions_dispatched = int(outcome.get("actions_dispatched") or 0)
            actions_completed = int(outcome.get("actions_completed") or 0)
            impact_expected_brl = float(outcome.get("impact_expected_brl") or 0)
            impact_realized_brl = float(outcome.get("impact_realized_brl") or 0)
            completion_rate = round((actions_completed / actions_dispatched) * 100, 1) if actions_dispatched > 0 else 0.0
            recovery_rate = round((impact_realized_brl / impact_expected_brl) * 100, 1) if impact_expected_brl > 0 else 0.0
            confidence_score_avg = float(
                ledger.get("confidence_score_avg")
                or outcome.get("confidence_avg")
                or 0
            )
            score = (
                100
                - (critical_open * 18)
                - (warning_open * 8)
                + min(20.0, recovery_rate * 0.2)
                + min(12.0, completion_rate * 0.12)
                + min(10.0, confidence_score_avg * 0.1)
            )
            score = max(0, min(100, round(score)))
            if score >= 75:
                performance_band = "leader"
            elif score >= 50:
                performance_band = "stable"
            else:
                performance_band = "at_risk"

            contribution_factors = [
                {
                    "key": "critical_open",
                    "label": "Alertas críticos abertos",
                    "value": critical_open,
                },
                {
                    "key": "completion_rate",
                    "label": "Taxa de conclusão",
                    "value": completion_rate,
                },
                {
                    "key": "recovery_rate",
                    "label": "Taxa de recuperação financeira",
                    "value": recovery_rate,
                },
            ]

            items.append(
                {
                    "store_id": store_id,
                    "store_name": row.get("name") or "Loja",
                    "efficiency_score": score,
                    "performance_band": performance_band,
                    "metrics": {
                        "critical_open": critical_open,
                        "warning_open": warning_open,
                        "actions_dispatched": actions_dispatched,
                        "actions_completed": actions_completed,
                        "completion_rate": completion_rate,
                        "recovery_rate": recovery_rate,
                        "confidence_score_avg": confidence_score_avg,
                        "value_recovered_brl": float(ledger.get("value_recovered_brl") or 0),
                        "value_at_risk_brl": float(ledger.get("value_at_risk_brl") or 0),
                    },
                    "contribution_factors": contribution_factors,
                }
            )

        items.sort(key=lambda item: item["efficiency_score"], reverse=True)
        for idx, item in enumerate(items, start=1):
            item["rank"] = idx
            if anonymized:
                item["display_name"] = f"Loja #{idx}"
            else:
                item["display_name"] = item["store_name"]

        scores = [int(item["efficiency_score"]) for item in items]
        if scores:
            ordered_scores = sorted(scores)
            mid = len(ordered_scores) // 2
            median_score = ordered_scores[mid] if len(ordered_scores) % 2 == 1 else round((ordered_scores[mid - 1] + ordered_scores[mid]) / 2)
        else:
            median_score = 0

        return Response(
            {
                "period_days": period_days,
                "anonymized": anonymized,
                "items": items,
                "summary": {
                    "stores_total": len(items),
                    "median_score": median_score,
                    "best_score": max(scores) if scores else 0,
                    "worst_score": min(scores) if scores else 0,
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
