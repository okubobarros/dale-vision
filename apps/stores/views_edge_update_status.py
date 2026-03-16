from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cameras.permissions import ALLOWED_READ_ROLES, require_store_role
from apps.core.models import Store
from apps.edge.models import EdgeUpdateEvent, EdgeUpdatePolicy


def _version_tuple(value: str | None) -> tuple[int, ...]:
    import re

    parts = re.findall(r"\d+", str(value or ""))
    if not parts:
        return (0,)
    return tuple(int(p) for p in parts)


def _resolve_current_version(event: EdgeUpdateEvent | None) -> str | None:
    if not event:
        return None
    status = str(getattr(event, "status", "") or "")
    from_version = getattr(event, "from_version", None)
    to_version = getattr(event, "to_version", None)
    if status in {"failed", "rolled_back"}:
        return from_version or to_version
    return to_version or from_version


def _resolve_version_gap(current_version: str | None, target_version: str | None) -> str:
    if not current_version or not target_version:
        return "unknown"
    if _version_tuple(current_version) >= _version_tuple(target_version):
        return "up_to_date"
    return "outdated"


class StoreEdgeUpdateStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        policy = (
            EdgeUpdatePolicy.objects.filter(store_id=store_id, active=True)
            .order_by("-updated_at")
            .first()
        )
        latest_event = EdgeUpdateEvent.objects.filter(store_id=store_id).order_by("-timestamp").first()

        if latest_event and latest_event.timestamp:
            age_seconds = max(0, int((timezone.now() - latest_event.timestamp).total_seconds()))
        else:
            age_seconds = None

        current_version = _resolve_current_version(latest_event)
        target_version = policy.target_version if policy else None
        version_gap = _resolve_version_gap(current_version, target_version)

        update_health = "no_data"
        if latest_event:
            if latest_event.status == "healthy":
                update_health = "healthy"
            elif latest_event.status in {"failed", "rolled_back"}:
                update_health = "degraded"
            else:
                update_health = "in_progress"

        return Response(
            {
                "store_id": str(store_id),
                "store_name": store.name,
                "policy": {
                    "active": bool(policy),
                    "channel": policy.channel if policy else "stable",
                    "target_version": target_version,
                    "current_version": current_version,
                    "version_gap": version_gap,
                    "current_min_supported": policy.current_min_supported if policy else None,
                    "rollout_window": {
                        "start_local": policy.rollout_start_local if policy else "02:00",
                        "end_local": policy.rollout_end_local if policy else "05:00",
                        "timezone": policy.rollout_timezone if policy else "America/Sao_Paulo",
                    },
                    "health_gate": {
                        "max_boot_seconds": policy.health_max_boot_seconds if policy else 120,
                        "require_heartbeat_seconds": policy.health_require_heartbeat_seconds if policy else 180,
                        "require_camera_health_count": policy.health_require_camera_health_count if policy else 3,
                    },
                    "rollback_policy": {
                        "enabled": policy.rollback_enabled if policy else True,
                        "max_failed_attempts": policy.rollback_max_failed_attempts if policy else 1,
                    },
                    "updated_at": policy.updated_at.isoformat() if policy and policy.updated_at else None,
                },
                "latest_update_event": (
                    {
                        "event_id": str(latest_event.id),
                        "agent_id": latest_event.agent_id,
                        "from_version": latest_event.from_version,
                        "to_version": latest_event.to_version,
                        "status": latest_event.status,
                        "event": latest_event.event,
                        "phase": latest_event.phase,
                        "attempt": latest_event.attempt,
                        "elapsed_ms": latest_event.elapsed_ms,
                        "reason_code": latest_event.reason_code,
                        "reason_detail": latest_event.reason_detail,
                        "timestamp": latest_event.timestamp.isoformat() if latest_event.timestamp else None,
                        "age_seconds": age_seconds,
                    }
                    if latest_event
                    else None
                ),
                "rollout_health": {
                    "status": update_health,
                    "recommended_action": (
                        "Sem dados de update para esta loja."
                        if update_health == "no_data"
                        else (
                            "Último update saudável."
                            if update_health == "healthy"
                            else (
                                "Update em andamento."
                                if update_health == "in_progress"
                                else "Falha/rollback detectado. Revisar reason_code e acionar runbook."
                            )
                        )
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )
