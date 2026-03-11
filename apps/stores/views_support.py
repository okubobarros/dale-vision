from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cameras.permissions import ALLOWED_READ_ROLES, require_store_role
from apps.core.models import AuditLog, Store, SupportAccessGrant, SupportAccessRequest
from apps.stores.services.user_uuid import ensure_user_uuid


def _is_internal_admin(user) -> bool:
    return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))


def _request_to_dict(row: SupportAccessRequest) -> dict:
    return {
        "id": str(row.id),
        "store_id": str(row.store_id),
        "requester_user_uuid": str(row.requester_user_uuid),
        "requester_email": row.requester_email,
        "requester_name": row.requester_name,
        "reason": row.reason,
        "status": row.status,
        "requested_at": row.requested_at.isoformat() if row.requested_at else None,
        "handled_at": row.handled_at.isoformat() if row.handled_at else None,
        "handled_by_user_uuid": str(row.handled_by_user_uuid) if row.handled_by_user_uuid else None,
        "handled_notes": row.handled_notes,
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
    }


class StoreSupportRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)
        user_uuid = ensure_user_uuid(request.user)
        rows = (
            SupportAccessRequest.objects.filter(store_id=store_id, requester_user_uuid=user_uuid)
            .order_by("-requested_at")[:10]
        )
        return Response([_request_to_dict(row) for row in rows], status=status.HTTP_200_OK)

    def post(self, request, store_id):
        require_store_role(request.user, str(store_id), ALLOWED_READ_ROLES)

        reason = str((request.data or {}).get("reason") or "").strip()
        user_uuid = ensure_user_uuid(request.user)
        email = getattr(request.user, "email", None)
        name = (
            str(getattr(request.user, "get_full_name", lambda: "")() or "").strip()
            or getattr(request.user, "username", None)
        )

        existing = (
            SupportAccessRequest.objects.filter(
                store_id=store_id,
                requester_user_uuid=user_uuid,
                status="pending",
            )
            .order_by("-requested_at")
            .first()
        )
        if existing:
            return Response(
                {
                    "ok": True,
                    "message": "Você já possui um pedido pendente para esta loja.",
                    "request": _request_to_dict(existing),
                },
                status=status.HTTP_200_OK,
            )

        row = SupportAccessRequest.objects.create(
            store_id=store_id,
            requester_user_uuid=user_uuid,
            requester_email=email,
            requester_name=name,
            reason=reason or "Solicitação de apoio para câmeras/ROI",
            status="pending",
            requested_at=timezone.now(),
            created_at=timezone.now(),
            updated_at=timezone.now(),
        )
        store = Store.objects.filter(id=store_id).values("org_id").first()
        AuditLog.objects.create(
            org_id=store["org_id"] if store else None,
            store_id=store_id,
            actor_user_id=user_uuid,
            action="support_request_created",
            payload={
                "request_id": str(row.id),
                "reason": row.reason,
            },
            created_at=timezone.now(),
        )
        return Response(
            {
                "ok": True,
                "message": "Pedido enviado ao suporte/admin da plataforma.",
                "request": _request_to_dict(row),
            },
            status=status.HTTP_201_CREATED,
        )


class AdminSupportRequestListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_internal_admin(request.user):
            return Response(
                {"code": "PERMISSION_DENIED", "message": "Acesso restrito ao admin interno."},
                status=status.HTTP_403_FORBIDDEN,
            )
        status_filter = str(request.GET.get("status") or "pending").strip().lower()
        qs = SupportAccessRequest.objects.select_related("store").order_by("-requested_at")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        rows = []
        for row in qs[:200]:
            item = _request_to_dict(row)
            item["store_name"] = getattr(row.store, "name", None)
            rows.append(item)
        return Response(rows, status=status.HTTP_200_OK)


class AdminSupportRequestGrantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        if not _is_internal_admin(request.user):
            return Response(
                {"code": "PERMISSION_DENIED", "message": "Acesso restrito ao admin interno."},
                status=status.HTTP_403_FORBIDDEN,
            )
        row = SupportAccessRequest.objects.filter(id=request_id).first()
        if not row:
            return Response(
                {"code": "NOT_FOUND", "message": "Solicitação não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        payload = request.data or {}
        duration_minutes = int(payload.get("duration_minutes") or 120)
        duration_minutes = max(15, min(duration_minutes, 480))
        target_user_uuid = str(payload.get("target_user_uuid") or row.requester_user_uuid)
        notes = str(payload.get("notes") or "").strip()

        now = timezone.now()
        expires = now + timedelta(minutes=duration_minutes)
        admin_uuid = ensure_user_uuid(request.user)

        grant = SupportAccessGrant.objects.create(
            request=row,
            store_id=row.store_id,
            user_uuid=target_user_uuid,
            granted_by_user_uuid=admin_uuid,
            role="manager",
            starts_at=now,
            expires_at=expires,
            active=True,
            created_at=now,
            updated_at=now,
        )

        row.status = "granted"
        row.handled_at = now
        row.handled_by_user_uuid = admin_uuid
        row.handled_notes = notes or f"Acesso temporário liberado por {duration_minutes} minutos."
        row.expires_at = expires
        row.updated_at = now
        row.save(
            update_fields=[
                "status",
                "handled_at",
                "handled_by_user_uuid",
                "handled_notes",
                "expires_at",
                "updated_at",
            ]
        )

        store = Store.objects.filter(id=row.store_id).values("org_id").first()
        AuditLog.objects.create(
            org_id=store["org_id"] if store else None,
            store_id=row.store_id,
            actor_user_id=admin_uuid,
            action="support_access_granted",
            payload={
                "request_id": str(row.id),
                "grant_id": str(grant.id),
                "target_user_uuid": target_user_uuid,
                "duration_minutes": duration_minutes,
                "expires_at": expires.isoformat(),
            },
            created_at=now,
        )

        return Response(
            {
                "ok": True,
                "message": "Acesso temporário concedido.",
                "request": _request_to_dict(row),
                "grant": {
                    "id": str(grant.id),
                    "user_uuid": str(grant.user_uuid),
                    "store_id": str(grant.store_id),
                    "expires_at": grant.expires_at.isoformat(),
                },
            },
            status=status.HTTP_200_OK,
        )


class AdminSupportRequestCloseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        if not _is_internal_admin(request.user):
            return Response(
                {"code": "PERMISSION_DENIED", "message": "Acesso restrito ao admin interno."},
                status=status.HTTP_403_FORBIDDEN,
            )
        row = SupportAccessRequest.objects.filter(id=request_id).first()
        if not row:
            return Response(
                {"code": "NOT_FOUND", "message": "Solicitação não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        notes = str((request.data or {}).get("notes") or "").strip()
        now = timezone.now()
        admin_uuid = ensure_user_uuid(request.user)

        row.status = "closed"
        row.handled_at = now
        row.handled_by_user_uuid = admin_uuid
        row.handled_notes = notes or row.handled_notes
        row.updated_at = now
        row.save(
            update_fields=[
                "status",
                "handled_at",
                "handled_by_user_uuid",
                "handled_notes",
                "updated_at",
            ]
        )
        SupportAccessGrant.objects.filter(request=row, active=True).update(
            active=False,
            updated_at=now,
            expires_at=now,
        )

        store = Store.objects.filter(id=row.store_id).values("org_id").first()
        AuditLog.objects.create(
            org_id=store["org_id"] if store else None,
            store_id=row.store_id,
            actor_user_id=admin_uuid,
            action="support_request_closed",
            payload={"request_id": str(row.id)},
            created_at=now,
        )

        return Response(
            {"ok": True, "message": "Solicitação encerrada.", "request": _request_to_dict(row)},
            status=status.HTTP_200_OK,
        )
