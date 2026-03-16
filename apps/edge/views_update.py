import hashlib
import json

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import authenticate_edge_token
from .models import EdgeUpdateEvent, EdgeUpdatePolicy
from .serializers import EdgeUpdateReportSerializer


def _build_policy_fingerprint(policy: EdgeUpdatePolicy | None) -> str | None:
    if not policy:
        return None
    base = {
        "store_id": str(policy.store_id),
        "channel": policy.channel,
        "target_version": policy.target_version,
        "current_min_supported": policy.current_min_supported,
        "rollout_start_local": policy.rollout_start_local,
        "rollout_end_local": policy.rollout_end_local,
        "rollout_timezone": policy.rollout_timezone,
        "package_url": policy.package_url,
        "package_sha256": policy.package_sha256,
        "package_size_bytes": policy.package_size_bytes,
        "health_max_boot_seconds": policy.health_max_boot_seconds,
        "health_require_heartbeat_seconds": policy.health_require_heartbeat_seconds,
        "health_require_camera_health_count": policy.health_require_camera_health_count,
        "rollback_enabled": policy.rollback_enabled,
        "rollback_max_failed_attempts": policy.rollback_max_failed_attempts,
        "active": bool(policy.active),
    }
    raw = json.dumps(base, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


class EdgeUpdatePolicyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        auth_result = authenticate_edge_token(request)
        if not auth_result.ok:
            return Response(
                {
                    "code": auth_result.code or "edge_token_invalid",
                    "detail": auth_result.detail or "Edge token inválido.",
                },
                status=auth_result.status_code or status.HTTP_401_UNAUTHORIZED,
            )

        store_id = str(auth_result.store_id)
        agent_id = (request.headers.get("X-AGENT-ID") or "").strip() or None
        policy = (
            EdgeUpdatePolicy.objects.filter(store_id=store_id, active=True)
            .order_by("-updated_at")
            .first()
        )
        if not policy:
            return Response(
                {
                    "store_id": store_id,
                    "agent_id": agent_id,
                    "policy_id": None,
                    "policy_updated_at": None,
                    "policy_fingerprint": None,
                    "channel": "stable",
                    "target_version": None,
                    "current_min_supported": None,
                    "rollout_window": {
                        "start_local": "02:00",
                        "end_local": "05:00",
                        "timezone": "America/Sao_Paulo",
                    },
                    "package": None,
                    "health_gate": {
                        "max_boot_seconds": 120,
                        "require_heartbeat_seconds": 180,
                        "require_camera_health_count": 3,
                    },
                    "rollback_policy": {
                        "enabled": True,
                        "max_failed_attempts": 1,
                    },
                    "generated_at": timezone.now().isoformat(),
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "store_id": store_id,
                "agent_id": agent_id,
                "policy_id": str(policy.id),
                "policy_updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
                "policy_fingerprint": _build_policy_fingerprint(policy),
                "channel": policy.channel,
                "target_version": policy.target_version,
                "current_min_supported": policy.current_min_supported,
                "rollout_window": {
                    "start_local": policy.rollout_start_local,
                    "end_local": policy.rollout_end_local,
                    "timezone": policy.rollout_timezone,
                },
                "package": {
                    "url": policy.package_url,
                    "sha256": policy.package_sha256,
                    "size_bytes": policy.package_size_bytes,
                },
                "health_gate": {
                    "max_boot_seconds": policy.health_max_boot_seconds,
                    "require_heartbeat_seconds": policy.health_require_heartbeat_seconds,
                    "require_camera_health_count": policy.health_require_camera_health_count,
                },
                "rollback_policy": {
                    "enabled": policy.rollback_enabled,
                    "max_failed_attempts": policy.rollback_max_failed_attempts,
                },
                "generated_at": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class EdgeUpdateReportView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EdgeUpdateReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": "payload inválido", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        requested_store_id = str(data["store_id"]) if data.get("store_id") else None
        auth_result = authenticate_edge_token(request, requested_store_id=requested_store_id)
        if not auth_result.ok:
            return Response(
                {
                    "code": auth_result.code or "edge_token_invalid",
                    "detail": auth_result.detail or "Edge token inválido.",
                },
                status=auth_result.status_code or status.HTTP_401_UNAUTHORIZED,
            )

        store_id = requested_store_id or str(auth_result.store_id)
        idempotency_key = (data.get("idempotency_key") or "").strip()
        if idempotency_key:
            existing = (
                EdgeUpdateEvent.objects.filter(
                    store_id=store_id,
                    meta__idempotency_key=idempotency_key,
                )
                .order_by("-timestamp")
                .first()
            )
            if existing:
                return Response(
                    {
                        "ok": True,
                        "store_id": store_id,
                        "event_id": str(existing.id),
                        "status": existing.status,
                        "deduped": True,
                    },
                    status=status.HTTP_200_OK,
                )

        meta = data.get("meta") or {}
        if idempotency_key:
            meta = dict(meta)
            meta["idempotency_key"] = idempotency_key
        row = EdgeUpdateEvent.objects.create(
            store_id=store_id,
            agent_id=data.get("agent_id"),
            from_version=data.get("from_version"),
            to_version=data.get("to_version"),
            channel=data.get("channel"),
            status=data.get("status"),
            phase=data.get("phase"),
            event=data.get("event"),
            attempt=data.get("attempt") or 1,
            elapsed_ms=data.get("elapsed_ms"),
            reason_code=data.get("reason_code"),
            reason_detail=data.get("reason_detail"),
            meta=meta,
            timestamp=data.get("timestamp") or timezone.now(),
            created_at=timezone.now(),
        )
        return Response(
            {
                "ok": True,
                "store_id": store_id,
                "event_id": str(row.id),
                "status": row.status,
                "deduped": False,
            },
            status=status.HTTP_201_CREATED,
        )
