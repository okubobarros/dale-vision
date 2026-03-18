import logging
from datetime import timedelta
from zoneinfo import ZoneInfo
from uuid import UUID

from django.conf import settings
from django.db import connection
from django.db.models import Q
from django.core.exceptions import FieldError
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.stores.services.user_orgs import get_user_org_ids
from apps.core.services.onboarding_progress import (
    OnboardingProgressService,
    get_service_for_user_store,
    STEPS_ORDER,
)
from apps.core.models import Store, Organization, Camera, OnboardingProgress
from apps.cameras.models import CameraROIConfig
from apps.cameras.permissions import get_user_role_for_store, ALLOWED_READ_ROLES
from apps.stores.views_edge_status import compute_store_edge_status_snapshot

logger = logging.getLogger(__name__)

STAGE_PROGRESS = {
    "no_store": 0,
    "add_cameras": 20,
    "validate_cameras": 40,
    "setup_roi": 60,
    "collecting_data": 80,
    "active": 100,
}

STAGE_LABELS = {
    "no_store": {
        "title": "Crie sua primeira loja",
        "description": "Cadastre uma loja para começarmos a coletar dados.",
        "cta_label": "Criar loja",
        "cta_url": "/app/stores",
        "blocking_items": [
            {"type": "store", "label": "Criar loja", "url": "/app/stores"},
        ],
    },
    "add_cameras": {
        "title": "Adicionar câmeras",
        "description": "Cadastre ao menos uma câmera para iniciar a coleta.",
        "cta_label": "Adicionar câmeras",
        "cta_url": "/app/cameras",
        "blocking_items": [
            {"type": "camera", "label": "Cadastrar câmeras", "url": "/app/cameras"},
        ],
    },
    "validate_cameras": {
        "title": "Validar câmeras",
        "description": "Verifique o status das câmeras e finalize a validação.",
        "cta_label": "Validar câmeras",
        "cta_url": "/app/cameras",
        "blocking_items": [
            {"type": "camera_validation", "label": "Validar câmeras", "url": "/app/cameras"},
        ],
    },
    "setup_roi": {
        "title": "Configurar ROI",
        "description": "Defina as áreas de interesse para gerar insights.",
        "cta_label": "Configurar ROI",
        "cta_url": "/app/cameras",
        "blocking_items": [
            {"type": "roi", "label": "Configurar ROI", "url": "/app/cameras"},
        ],
    },
    "collecting_data": {
        "title": "Coletando dados",
        "description": "Estamos aguardando os primeiros dados em tempo real.",
        "cta_label": "Ver dashboard",
        "cta_url": "/app/dashboard",
        "blocking_items": [
            {"type": "data", "label": "Aguardar coleta", "url": "/app/dashboard"},
        ],
    },
    "active": {
        "title": "Operação ativa",
        "description": "Dados recentes disponíveis. Explore insights e ações.",
        "cta_label": "Ver insights",
        "cta_url": "/app/analytics",
        "blocking_items": [],
    },
}


def _get_org_timezone(org: Organization | None):
    if not org:
        return timezone.get_current_timezone()
    tz_name = getattr(org, "timezone", None) or settings.TIME_ZONE
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return timezone.get_current_timezone()


def _store_access_allowed(user, store_id: str) -> bool:
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    role = get_user_role_for_store(user, str(store_id))
    return role in ALLOWED_READ_ROLES


def _get_active_cameras(store_id: str):
    try:
        return Camera.objects.filter(store_id=store_id, active=True)
    except FieldError:
        return Camera.objects.filter(store_id=store_id)


def _has_unvalidated_cameras(store_id: str) -> bool:
    qs = _get_active_cameras(store_id)
    return qs.filter(
        Q(status__in=["unknown"]) | Q(last_seen_at__isnull=True)
    ).exists()


def _has_missing_roi(store_id: str) -> bool:
    camera_ids = list(_get_active_cameras(store_id).values_list("id", flat=True))
    if not camera_ids:
        return False
    configured_ids = set(
        str(cid)
        for cid in CameraROIConfig.objects.filter(camera_id__in=camera_ids)
        .values_list("camera_id", flat=True)
    )
    return any(str(cam_id) not in configured_ids for cam_id in camera_ids)


def _has_recent_metrics(store_id: str, since_ts) -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT 1
                FROM public.traffic_metrics
                WHERE store_id = %s AND ts_bucket >= %s
                LIMIT 1
                """,
                [str(store_id), since_ts],
            )
            traffic_ok = cursor.fetchone() is not None

            cursor.execute(
                """
                SELECT 1
                FROM public.conversion_metrics
                WHERE store_id = %s AND ts_bucket >= %s
                LIMIT 1
                """,
                [str(store_id), since_ts],
            )
            conversion_ok = cursor.fetchone() is not None
        return traffic_ok and conversion_ok
    except Exception:
        logger.exception("[ONBOARDING] failed to query recent metrics store_id=%s", str(store_id))
        return False


def _build_cta_url(base_url: str, store_id: str | None):
    if not store_id:
        return base_url
    if "?" in base_url:
        return f"{base_url}&store_id={store_id}"
    return f"{base_url}?store_id={store_id}"


def _normalize_stage_payload(stage: str, store_id: str | None):
    data = STAGE_LABELS.get(stage, STAGE_LABELS["collecting_data"])
    return {
        "stage": stage,
        "title": data["title"],
        "description": data["description"],
        "cta_label": data["cta_label"],
        "cta_url": _build_cta_url(data["cta_url"], store_id),
        "blocking_items": [
            {**item, "url": _build_cta_url(item["url"], store_id)}
            for item in data.get("blocking_items", [])
        ],
    }


def _upsert_onboarding_progress(org_id: str, stage: str, store_id: str | None):
    now = timezone.now()
    progress_percent = STAGE_PROGRESS.get(stage, 0)
    defaults = {
        "completed": stage == "active",
        "completed_at": now if stage == "active" else None,
        "status": "completed" if stage == "active" else "in_progress",
        "progress_percent": progress_percent,
        "meta": {"store_id": store_id, "stage": stage},
        "updated_at": now,
        "created_at": now,
    }
    try:
        base_qs = OnboardingProgress.objects.filter(org_id=org_id)
        if store_id:
            base_qs = base_qs.filter(store_id=store_id)
        else:
            base_qs = base_qs.filter(store_id__isnull=True)
        (
            base_qs
            .filter(step__in=list(STAGE_PROGRESS.keys()))
            .exclude(step=stage)
            .delete()
        )
        OnboardingProgress.objects.update_or_create(
            org_id=org_id,
            store_id=store_id,
            step=stage,
            defaults=defaults,
        )
    except FieldError:
        (
            OnboardingProgress.objects.filter(org_id=org_id, step__in=list(STAGE_PROGRESS.keys()))
            .exclude(step=stage)
            .delete()
        )
        OnboardingProgress.objects.update_or_create(
            org_id=org_id,
            step=stage,
            defaults=defaults,
        )
    except Exception:
        logger.exception("[ONBOARDING] failed to upsert progress org_id=%s stage=%s", str(org_id), stage)


class OnboardingProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get("store_id")
        if store_id:
            service = get_service_for_user_store(request.user, store_id)
            if not service:
                return Response({"detail": "Sem acesso à store."}, status=status.HTTP_403_FORBIDDEN)
        else:
            org_ids = get_user_org_ids(request.user)
            if not org_ids:
                return Response({"steps": {}, "next_step": None})
            service = OnboardingProgressService(str(org_ids[0]))

        progress = service.get_progress()
        next_step = service.next_step()
        return Response({"steps": progress, "next_step": next_step, "ordered_steps": STEPS_ORDER})


class OnboardingStepCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payload = request.data or {}
        step = payload.get("step") or payload.get("step_key") or payload.get("step_id")
        if isinstance(step, str):
            step = step.strip()
        meta = payload.get("meta") or {}
        store_id = payload.get("store_id")

        if not step:
            return Response({"detail": "step obrigatório."}, status=status.HTTP_400_BAD_REQUEST)
        if step not in STEPS_ORDER:
            return Response({"detail": "step inválido."}, status=status.HTTP_400_BAD_REQUEST)
        if meta is not None and not isinstance(meta, dict):
            return Response({"detail": "meta inválido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if store_id:
                service = get_service_for_user_store(request.user, store_id)
                if not service:
                    return Response({"detail": "Sem acesso à store."}, status=status.HTTP_403_FORBIDDEN)
            else:
                org_ids = get_user_org_ids(request.user)
                if not org_ids:
                    return Response({"detail": "Usuário sem org."}, status=status.HTTP_400_BAD_REQUEST)
                service = OnboardingProgressService(str(org_ids[0]))

            try:
                existing = OnboardingProgress.objects.filter(
                    org_id=service.org_id,
                    store_id=service.store_id if service.store_id else None,
                    step=step,
                    completed=True,
                ).first()
            except FieldError:
                existing = OnboardingProgress.objects.filter(
                    org_id=service.org_id,
                    step=step,
                    completed=True,
                ).first()
            if existing:
                return Response(
                    {
                        "ok": True,
                        "already_completed": True,
                        "step": step,
                        "next_step": service.next_step(),
                    },
                    status=status.HTTP_200_OK,
                )

            result = service.complete_step(step, meta=meta or {})
            return Response(
                {
                    "ok": True,
                    "already_completed": False,
                    "step": result.get("step"),
                    "completed": result.get("completed"),
                    "completed_at": result.get("completed_at"),
                    "status": result.get("status"),
                    "progress_percent": result.get("progress_percent"),
                    "meta": result.get("meta") or {},
                    "next_step": service.next_step(),
                },
                status=status.HTTP_200_OK,
            )
        except ValueError:
            return Response({"detail": "step inválido."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("[ONBOARDING] step complete failed payload=%s", payload)
            return Response(
                {"ok": False, "detail": "Não foi possível completar o step."},
                status=status.HTTP_200_OK,
            )


class OnboardingNextStepView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get("store_id")
        if not store_id:
            return Response(
                {"ok": False, "error": "store_id_invalid"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            UUID(str(store_id))
        except Exception:
            return Response(
                {"ok": False, "error": "store_id_invalid"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        store = None
        org = None
        try:
            store = Store.objects.filter(id=store_id).first()
            if not store:
                return Response(
                    {"ok": False, "error": "store_not_found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if not _store_access_allowed(request.user, store_id):
                return Response(
                    {"ok": False, "error": "forbidden"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            org = Organization.objects.filter(id=store.org_id).first()
        except Exception:
            logger.exception(
                "[ONBOARDING] next-step lookup failed user_id=%s store_id=%s",
                getattr(request.user, "id", None),
                str(store_id),
            )
            return Response(
                {"ok": True, "next_step": None},
                status=status.HTTP_200_OK,
            )

        try:
            org_tz = _get_org_timezone(org)
            now_local = timezone.localtime(timezone.now(), org_tz)
            recent_minutes = int(getattr(settings, "ONBOARDING_RECENT_MINUTES", 15))
            since_ts = now_local - timedelta(minutes=recent_minutes)

            stage = "active"
            active_cameras_count = _get_active_cameras(store.id).count()
            if active_cameras_count == 0:
                stage = "add_cameras"
            elif _has_unvalidated_cameras(store.id):
                stage = "validate_cameras"
            elif _has_missing_roi(store.id):
                stage = "setup_roi"
            elif not _has_recent_metrics(store.id, since_ts):
                stage = "collecting_data"

            _upsert_onboarding_progress(str(store.org_id), stage, str(store.id))

            stage_payload = _normalize_stage_payload(stage, str(store.id))
            try:
                next_step_service = OnboardingProgressService(
                    str(store.org_id),
                    store_id=str(store.id),
                )
                next_step = next_step_service.next_step()
            except Exception:
                logger.exception(
                    "[ONBOARDING] next-step compute failed user_id=%s store_id=%s",
                    getattr(request.user, "id", None),
                    str(store_id),
                )
                next_step = None
            completed = next_step is None

            health_payload = {
                "edge_status": "unknown",
                "cameras_total": 0,
                "cameras_online": 0,
                "cameras_offline": 0,
            }
            try:
                edge_payload, _reason = compute_store_edge_status_snapshot(store.id)
                cameras_total = int(edge_payload.get("cameras_total") or 0)
                cameras_online = int(edge_payload.get("cameras_online") or 0)
                cameras_offline = int(edge_payload.get("cameras_offline") or 0)
                if cameras_total and cameras_offline == 0:
                    cameras_offline = max(cameras_total - cameras_online, 0)
                health_payload = {
                    "edge_status": edge_payload.get("store_status") or "unknown",
                    "cameras_total": cameras_total,
                    "cameras_online": cameras_online,
                    "cameras_offline": cameras_offline,
                }
            except Exception:
                logger.exception(
                    "[ONBOARDING] next-step health failed user_id=%s store_id=%s",
                    getattr(request.user, "id", None),
                    str(store_id),
                )

            stage_payload["health"] = health_payload
            stage_payload["ok"] = True
            stage_payload["next_step"] = next_step
            stage_payload["completed"] = completed
            return Response(stage_payload)
        except Exception:
            logger.exception(
                "[ONBOARDING] next-step failed user_id=%s store_id=%s",
                getattr(request.user, "id", None),
                str(store_id),
            )
            return Response(
                {"ok": True, "next_step": None},
                status=status.HTTP_200_OK,
            )
