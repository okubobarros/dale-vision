import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from apps.core.integrations import supabase_storage
from apps.core import models
from .serializers import DemoLeadSerializer

class DemoLeadViewSet(viewsets.ModelViewSet):
    queryset = models.DemoLead.objects.all().order_by("-created_at")
    serializer_class = DemoLeadSerializer
    permission_classes = [AllowAny]  # lead público

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()

        # dispara n8n (não bloqueia o MVP: se falhar, lead fica salvo)
        webhook = getattr(settings, "N8N_ALERTS_WEBHOOK", None)
        if webhook:
            try:
                requests.post(
                    webhook,
                    timeout=8,
                    json={
                        "type": "demo_lead",
                        "lead_id": str(lead.id),
                        "name": getattr(lead, "name", None),
                        "email": getattr(lead, "email", None),
                        "whatsapp": getattr(lead, "whatsapp", None),
                        "best_time": getattr(lead, "best_time", None),
                        "segment": getattr(lead, "segment", None),
                        "stores_count": getattr(lead, "stores_count", None),
                        "notes": getattr(lead, "notes", None),
                    },
                )
            except Exception:
                pass

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StorageStatusView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        if not (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)):
            raise PermissionDenied("Sem permissão.")
        status_payload = supabase_storage.get_config_status()
        return Response(status_payload, status=status.HTTP_200_OK)


class SalesProgressView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _resolve_month(raw_month):
        if not raw_month:
            return timezone.localdate().strftime("%Y-%m")
        month = str(raw_month).strip()
        if len(month) != 7 or month[4] != "-":
            return None
        year_part = month[:4]
        month_part = month[5:]
        if not (year_part.isdigit() and month_part.isdigit()):
            return None
        if int(month_part) < 1 or int(month_part) > 12:
            return None
        return month

    def _build_payload(self, request, month):
        goal = (
            models.UserSalesGoal.objects.filter(user=request.user, month=month)
            .order_by("-updated_at")
            .first()
        )
        target_revenue = float(goal.target_revenue) if goal else 0
        last_sync_at = goal.updated_at.isoformat() if goal else None
        return {
            "state": "not_configured",
            "current_revenue": 0,
            "target_revenue": target_revenue,
            "currency": goal.currency if goal else "BRL",
            "last_sync_at": last_sync_at,
            "month": month,
            "source": "user_goal",
        }

    def get(self, request):
        month = self._resolve_month(request.query_params.get("month"))
        if not month:
            return Response(
                {"detail": "Parâmetro month inválido. Use o formato YYYY-MM."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(self._build_payload(request, month), status=status.HTTP_200_OK)

    def post(self, request):
        month = self._resolve_month(request.data.get("month"))
        if not month:
            return Response(
                {"detail": "Parâmetro month inválido. Use o formato YYYY-MM."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_revenue = request.data.get("target_revenue")
        try:
            target_value = float(target_revenue)
        except (TypeError, ValueError):
            return Response(
                {"detail": "target_revenue deve ser numérico."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_value <= 0:
            return Response(
                {"detail": "target_revenue deve ser maior que zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        goal, _ = models.UserSalesGoal.objects.get_or_create(
            user=request.user,
            month=month,
            defaults={
                "target_revenue": target_value,
                "currency": "BRL",
            },
        )
        goal.target_revenue = target_value
        goal.updated_at = timezone.now()
        goal.save(update_fields=["target_revenue", "updated_at"])

        return Response(self._build_payload(request, month), status=status.HTTP_200_OK)
