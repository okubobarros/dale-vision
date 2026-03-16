from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Store
from apps.edge.models import EdgeUpdateEvent, EdgeUpdatePolicy
from apps.stores.services.user_orgs import get_user_org_ids


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


def _classify_rollout_health(event_status: str | None) -> str:
    if not event_status:
        return "no_data"
    if event_status == "healthy":
        return "healthy"
    if event_status in {"failed", "rolled_back"}:
        return "degraded"
    return "in_progress"


class NetworkEdgeUpdateRolloutSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_ids = get_user_org_ids(request.user)
        if not org_ids:
            return Response(
                {
                    "scope": "network",
                    "totals": {
                        "stores": 0,
                        "with_policy": 0,
                        "channel": {"stable": 0, "canary": 0},
                        "version_gap": {"up_to_date": 0, "outdated": 0, "unknown": 0},
                        "health": {
                            "healthy": 0,
                            "degraded": 0,
                            "in_progress": 0,
                            "no_data": 0,
                        },
                    },
                    "rollout_health": {
                        "status": "no_data",
                        "recommended_action": "Sem lojas vinculadas ao usuário.",
                    },
                    "critical_stores": [],
                    "generated_at": timezone.now().isoformat(),
                },
                status=status.HTTP_200_OK,
            )

        store_rows = list(Store.objects.filter(org_id__in=org_ids).values("id", "name"))
        if not store_rows:
            return Response(
                {
                    "scope": "network",
                    "totals": {
                        "stores": 0,
                        "with_policy": 0,
                        "channel": {"stable": 0, "canary": 0},
                        "version_gap": {"up_to_date": 0, "outdated": 0, "unknown": 0},
                        "health": {
                            "healthy": 0,
                            "degraded": 0,
                            "in_progress": 0,
                            "no_data": 0,
                        },
                    },
                    "rollout_health": {
                        "status": "no_data",
                        "recommended_action": "Nenhuma loja cadastrada para esta rede.",
                    },
                    "critical_stores": [],
                    "generated_at": timezone.now().isoformat(),
                },
                status=status.HTTP_200_OK,
            )

        store_index = {str(row["id"]): row.get("name") for row in store_rows}
        store_ids = list(store_index.keys())

        policy_rows = list(
            EdgeUpdatePolicy.objects.filter(store_id__in=store_ids, active=True)
            .order_by("store_id", "-updated_at")
        )
        policy_by_store: dict[str, EdgeUpdatePolicy] = {}
        for row in policy_rows:
            key = str(row.store_id)
            if key not in policy_by_store:
                policy_by_store[key] = row

        # Scan capped to keep response fast even with long event history.
        event_rows = list(
            EdgeUpdateEvent.objects.filter(store_id__in=store_ids)
            .order_by("store_id", "-timestamp")[:5000]
        )
        latest_event_by_store: dict[str, EdgeUpdateEvent] = {}
        for row in event_rows:
            key = str(row.store_id)
            if key not in latest_event_by_store:
                latest_event_by_store[key] = row

        totals = {
            "stores": len(store_ids),
            "with_policy": 0,
            "channel": {"stable": 0, "canary": 0},
            "version_gap": {"up_to_date": 0, "outdated": 0, "unknown": 0},
            "health": {
                "healthy": 0,
                "degraded": 0,
                "in_progress": 0,
                "no_data": 0,
            },
        }

        critical_stores: list[dict] = []
        for store_id in store_ids:
            policy = policy_by_store.get(store_id)
            event = latest_event_by_store.get(store_id)
            current_version = _resolve_current_version(event)
            target_version = getattr(policy, "target_version", None)
            version_gap = _resolve_version_gap(current_version, target_version)
            health = _classify_rollout_health(getattr(event, "status", None))
            totals["health"][health] += 1
            totals["version_gap"][version_gap] += 1

            if policy:
                totals["with_policy"] += 1
                channel = str(policy.channel or "stable")
                if channel not in totals["channel"]:
                    channel = "stable"
                totals["channel"][channel] += 1

            if health in {"degraded", "in_progress"}:
                critical_stores.append(
                    {
                        "store_id": store_id,
                        "store_name": store_index.get(store_id),
                        "health": health,
                        "channel": getattr(policy, "channel", "stable") if policy else "stable",
                        "current_version": current_version,
                        "target_version": target_version,
                        "version_gap": version_gap,
                        "last_event": getattr(event, "event", None),
                        "last_status": getattr(event, "status", None),
                        "reason_code": getattr(event, "reason_code", None),
                        "timestamp": event.timestamp.isoformat() if event and event.timestamp else None,
                    }
                )

        if totals["health"]["degraded"] > 0:
            rollout_status = "degraded"
            action = "Lojas com falha/rollback detectado. Priorizar runbook e estabilização."
        elif totals["health"]["in_progress"] > 0:
            rollout_status = "attention"
            action = "Rollout em andamento. Acompanhar health gate das lojas em progresso."
        elif totals["health"]["healthy"] > 0:
            rollout_status = "healthy"
            action = "Rollout estável nas lojas com atualização concluída."
        else:
            rollout_status = "no_data"
            action = "Sem eventos recentes de update para a rede."

        critical_stores.sort(
            key=lambda row: (
                0 if row.get("health") == "degraded" else 1,
                row.get("timestamp") or "",
            ),
            reverse=True,
        )

        return Response(
            {
                "scope": "network",
                "totals": totals,
                "rollout_health": {
                    "status": rollout_status,
                    "recommended_action": action,
                },
                "critical_stores": critical_stores[:15],
                "generated_at": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )
