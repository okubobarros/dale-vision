from __future__ import annotations

from collections import defaultdict

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cameras.permissions import ALLOWED_READ_ROLES, require_store_role
from apps.core.models import Store
from apps.edge.models import EdgeUpdateEvent


SUCCESS_FLOW = {
    "edge_update_started",
    "edge_update_downloaded",
    "edge_update_verified",
    "edge_update_activated",
    "edge_update_healthy",
}


class StoreEdgeUpdateAttemptsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        try:
            limit = max(10, min(int(request.query_params.get("limit") or 200), 2000))
        except Exception:
            limit = 200

        rows = list(
            EdgeUpdateEvent.objects.filter(store_id=store_id)
            .order_by("-timestamp")[:limit]
            .values(
                "id",
                "agent_id",
                "from_version",
                "to_version",
                "channel",
                "status",
                "phase",
                "event",
                "attempt",
                "elapsed_ms",
                "reason_code",
                "reason_detail",
                "timestamp",
            )
        )

        grouped = defaultdict(list)
        for row in rows:
            key = (
                int(row.get("attempt") or 1),
                str(row.get("to_version") or ""),
                str(row.get("agent_id") or ""),
            )
            grouped[key].append(row)

        items = []
        for key, events_desc in grouped.items():
            events = sorted(events_desc, key=lambda item: item.get("timestamp") or "")
            statuses = {str(item.get("status") or "") for item in events}
            event_names = {str(item.get("event") or "") for item in events}
            reason_codes = sorted(
                {str(item.get("reason_code")) for item in events if item.get("reason_code")}
            )

            if "failed" in statuses or "edge_update_failed" in event_names:
                final_status = "failed"
            elif "rolled_back" in statuses or "edge_update_rolled_back" in event_names:
                final_status = "rolled_back"
            elif "healthy" in statuses and SUCCESS_FLOW.issubset(event_names):
                final_status = "healthy"
            else:
                final_status = "incomplete"

            first_ts = events[0].get("timestamp") if events else None
            last_ts = events[-1].get("timestamp") if events else None
            duration_seconds = None
            if first_ts and last_ts:
                duration_seconds = max(0, int((last_ts - first_ts).total_seconds()))

            first_event = events[0] if events else {}
            last_event = events[-1] if events else {}
            attempt_no, to_version, agent_id = key

            items.append(
                {
                    "attempt": attempt_no,
                    "agent_id": agent_id or None,
                    "channel": str(last_event.get("channel") or first_event.get("channel") or ""),
                    "from_version": str(first_event.get("from_version") or ""),
                    "to_version": to_version or None,
                    "final_status": final_status,
                    "first_event_at": first_ts.isoformat() if first_ts else None,
                    "last_event_at": last_ts.isoformat() if last_ts else None,
                    "duration_seconds": duration_seconds,
                    "event_count": len(events),
                    "reason_codes": reason_codes,
                    "events": [
                        {
                            "id": str(ev.get("id")),
                            "event": ev.get("event"),
                            "status": ev.get("status"),
                            "phase": ev.get("phase"),
                            "reason_code": ev.get("reason_code"),
                            "timestamp": ev.get("timestamp").isoformat() if ev.get("timestamp") else None,
                        }
                        for ev in events
                    ],
                }
            )

        items.sort(
            key=lambda item: (
                item.get("last_event_at") or "",
                item.get("attempt") or 0,
            ),
            reverse=True,
        )

        return Response(
            {
                "store_id": str(store_id),
                "store_name": store.name,
                "filters": {"limit": limit},
                "items": items[:50],
            },
            status=status.HTTP_200_OK,
        )
