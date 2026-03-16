from datetime import datetime, timezone as dt_timezone

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Store
from apps.edge.models import EdgeUpdateEvent, EdgeUpdatePolicy
from apps.stores.services.user_orgs import get_user_org_ids


TERMINAL_STATUSES = {"healthy", "failed", "rolled_back"}


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


def _build_attempt_metrics(event_rows: list[EdgeUpdateEvent], allowed_store_ids: set[str] | None = None) -> dict:
    # Group by logical attempt identity to avoid inflating rates with per-phase events.
    attempts: dict[tuple[str, int, str, str], list[EdgeUpdateEvent]] = {}
    for row in event_rows:
        store_id = str(row.store_id)
        if allowed_store_ids is not None and store_id not in allowed_store_ids:
            continue
        attempt_no = int(getattr(row, "attempt", None) or 1)
        key = (
            store_id,
            attempt_no,
            str(getattr(row, "to_version", None) or ""),
            str(getattr(row, "agent_id", None) or ""),
        )
        attempts.setdefault(key, []).append(row)

    total_attempts = len(attempts)
    successful_attempts = 0
    failed_attempts = 0
    rollback_attempts = 0
    incomplete_attempts = 0
    durations: list[int] = []

    for events in attempts.values():
        ordered = sorted(
            events,
            key=lambda ev: ev.timestamp or datetime.min.replace(tzinfo=dt_timezone.utc),
        )
        statuses = {str(getattr(ev, "status", "") or "") for ev in ordered}
        event_names = {str(getattr(ev, "event", "") or "") for ev in ordered}

        final_status = None
        if "failed" in statuses or "edge_update_failed" in event_names:
            final_status = "failed"
            failed_attempts += 1
        elif "rolled_back" in statuses or "edge_update_rolled_back" in event_names:
            final_status = "rolled_back"
            rollback_attempts += 1
        elif "healthy" in statuses:
            final_status = "healthy"
            successful_attempts += 1
        else:
            incomplete_attempts += 1

        first_ts = ordered[0].timestamp if ordered else None
        last_ts = ordered[-1].timestamp if ordered else None
        if first_ts and last_ts and final_status in TERMINAL_STATUSES:
            durations.append(max(0, int((last_ts - first_ts).total_seconds())))

    success_rate = round((successful_attempts / total_attempts) * 100, 2) if total_attempts else 0.0
    failure_rate = round((failed_attempts / total_attempts) * 100, 2) if total_attempts else 0.0
    rollback_rate = round((rollback_attempts / total_attempts) * 100, 2) if total_attempts else 0.0
    avg_duration_seconds = round(sum(durations) / len(durations), 2) if durations else None

    return {
        "attempts_total": total_attempts,
        "attempts_successful": successful_attempts,
        "attempts_failed": failed_attempts,
        "attempts_rolled_back": rollback_attempts,
        "attempts_incomplete": incomplete_attempts,
        "success_rate_pct": success_rate,
        "failure_rate_pct": failure_rate,
        "rollback_rate_pct": rollback_rate,
        "avg_duration_seconds": avg_duration_seconds,
    }


class NetworkEdgeUpdateRolloutSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        channel_filter = str(request.query_params.get("channel") or "").strip().lower()
        if channel_filter not in {"stable", "canary"}:
            channel_filter = None

        org_ids = get_user_org_ids(request.user)
        if not org_ids:
            return Response(
                {
                    "scope": "network",
                    "filters": {"channel": channel_filter or "all"},
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
                    "rollout_metrics": {
                        "attempts_total": 0,
                        "attempts_successful": 0,
                        "attempts_failed": 0,
                        "attempts_rolled_back": 0,
                        "attempts_incomplete": 0,
                        "success_rate_pct": 0.0,
                        "failure_rate_pct": 0.0,
                        "rollback_rate_pct": 0.0,
                        "avg_duration_seconds": None,
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
                    "filters": {"channel": channel_filter or "all"},
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
                    "rollout_metrics": {
                        "attempts_total": 0,
                        "attempts_successful": 0,
                        "attempts_failed": 0,
                        "attempts_rolled_back": 0,
                        "attempts_incomplete": 0,
                        "success_rate_pct": 0.0,
                        "failure_rate_pct": 0.0,
                        "rollback_rate_pct": 0.0,
                        "avg_duration_seconds": None,
                    },
                    "critical_stores": [],
                    "generated_at": timezone.now().isoformat(),
                },
                status=status.HTTP_200_OK,
            )

        store_index = {str(row["id"]): row.get("name") for row in store_rows}
        store_ids = list(store_index.keys())

        policy_filter = {"store_id__in": store_ids, "active": True}
        if channel_filter:
            policy_filter["channel"] = channel_filter
        policy_rows = list(EdgeUpdatePolicy.objects.filter(**policy_filter).order_by("store_id", "-updated_at"))
        policy_by_store: dict[str, EdgeUpdatePolicy] = {}
        for row in policy_rows:
            key = str(row.store_id)
            if key not in policy_by_store:
                policy_by_store[key] = row

        if channel_filter:
            store_ids = [store_id for store_id in store_ids if store_id in policy_by_store]
            store_index = {store_id: store_index[store_id] for store_id in store_ids}

        # Scan capped to keep response fast even with long event history.
        event_rows = list(
            EdgeUpdateEvent.objects.filter(store_id__in=store_ids)
            .order_by("store_id", "-timestamp")[:5000]
        )
        rollout_metrics = _build_attempt_metrics(event_rows, allowed_store_ids=set(store_ids))
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
                "filters": {"channel": channel_filter or "all"},
                "totals": totals,
                "rollout_health": {
                    "status": rollout_status,
                    "recommended_action": action,
                },
                "rollout_metrics": rollout_metrics,
                "critical_stores": critical_stores[:15],
                "generated_at": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )
