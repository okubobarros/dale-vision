# apps/alerts/views.py
from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import (
    DemoLead,
    AlertRule,
    DetectionEvent,
    EventMedia,
    NotificationLog,
    Store,
)
from .serializers import (
    DemoLeadSerializer,
    AlertRuleSerializer,
    DetectionEventSerializer,
    EventMediaSerializer,
    NotificationLogSerializer,
)
from .services import send_event_to_n8n


# =========================
# DEMO LEAD (FORM PÚBLICO)
# =========================
class DemoLeadCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = DemoLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save(status="new", created_at=timezone.now())

        # notifica n8n (pipeline comercial)
        send_event_to_n8n({
            "type": "demo_lead",
            "lead_id": str(lead.id),
            "org_name": lead.org_name,
            "contact_name": lead.contact_name,
            "email": lead.email,
            "whatsapp": lead.whatsapp,
            "segment": lead.segment,
            "best_time": lead.best_time,
            "stores_count": lead.stores_count,
            "city": lead.city,
            "state": lead.state,
            "camera_brands": lead.camera_brands,
            "has_rtsp": lead.has_rtsp,
        })

        return Response(DemoLeadSerializer(lead).data, status=status.HTTP_201_CREATED)


# =========================
# ALERT RULES (CRUD + INGEST)
# =========================
class AlertRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AlertRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        store_id = self.request.query_params.get("store_id")
        qs = AlertRule.objects.all()
        if store_id:
            qs = qs.filter(store_id=store_id)
        return qs.order_by("-updated_at")

    @action(detail=False, methods=["post"], url_path="ingest")
    def ingest(self, request):
        """
        Ingest completo:
        1) valida payload
        2) acha regras candidatas
        3) aplica cooldown (dedupe)
        4) cria detection_event (sempre)
        5) cria event_media (se clip/snapshot)
        6) cria notification_logs por canal (email/whatsapp/dashboard)
        7) chama n8n somente se email/whatsapp enabled
        """
        store_id = request.data.get("store_id")
        camera_id = request.data.get("camera_id")
        zone_id = request.data.get("zone_id")
        event_type = request.data.get("event_type")
        severity = request.data.get("severity")
        title = request.data.get("title") or "Evento detectado"
        description = request.data.get("description") or request.data.get("message") or ""
        metadata = request.data.get("metadata") or {}
        occurred_at = request.data.get("occurred_at")  # opcional iso
        clip_url = request.data.get("clip_url")
        snapshot_url = request.data.get("snapshot_url")

        if not store_id or not event_type or not severity:
            return Response(
                {"detail": "store_id, event_type, severity são obrigatórios"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            store = Store.objects.get(id=store_id)
        except Store.DoesNotExist:
            raise ValidationError({"detail": "store_id inválido"})
        org_id = store.org_id

        now = timezone.now()
        occ = now
        # se vier string iso, tenta parse; se falhar, usa now
        if isinstance(occurred_at, str):
            try:
                occ = timezone.datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
                if timezone.is_naive(occ):
                    occ = timezone.make_aware(occ)
            except Exception:
                occ = now

        # regras candidatas (por store e, se existir, por zone e tipo)
        rules = AlertRule.objects.filter(store_id=store_id, active=True)
        # opcional: filtrar por zone e type se você quer estrito
        # (recomendado usar, porque seu schema tem unique(store_id, zone_id, type))
        rules = rules.filter(type=event_type)
        if zone_id:
            rules = rules.filter(zone_id=zone_id)

        # se não existir regra, ainda assim cria evento (para histórico)
        rule_used = None
        suppressed_by_rule_id = None
        suppressed_reason = None

        # Decide se deve suprimir por cooldown com base em regra
        should_send = False
        channels = {"dashboard": True, "email": False, "whatsapp": False}
        destinations = request.data.get("destinations") or {}  # {email, whatsapp}

        if rules.exists():
            rule_used = rules.first()
            channels = rule_used.channels or channels
            cooldown = rule_used.cooldown_minutes or 0
            since = now - timedelta(minutes=cooldown)

            recently_sent = NotificationLog.objects.filter(
                store_id=store_id,
                rule_id=rule_used.id,
                channel__in=["email", "whatsapp"],
                sent_at__gte=since,
                status__in=["sent", "queued"],
            ).exists()

            if recently_sent:
                suppressed_by_rule_id = rule_used.id
                suppressed_reason = f"Cooldown ativo ({cooldown} min)"
            else:
                # dashboard sempre true, email/whatsapp conforme channels
                should_send = bool(channels.get("email") or channels.get("whatsapp"))

        # 4) cria detection_event sempre
        event = DetectionEvent.objects.create(
            org_id=org_id,
            store_id=store_id,
            camera_id=camera_id,
            zone_id=zone_id,
            type=event_type,
            severity=severity,
            status="open",
            title=title,
            description=description,
            occurred_at=occ,
            metadata=metadata,
            suppressed_by_rule_id=suppressed_by_rule_id,
            suppressed_reason=suppressed_reason,
            created_at=now,
        )

        # 5) event_media
        if clip_url:
            EventMedia.objects.create(
                event_id=event.id,
                media_type="clip",
                url=clip_url,
                created_at=now,
            )
        if snapshot_url:
            EventMedia.objects.create(
                event_id=event.id,
                media_type="snapshot",
                url=snapshot_url,
                created_at=now,
            )

        # 6) notification logs + 7) n8n
        n8n_result = None
        if suppressed_by_rule_id:
            # registra que foi suprimido (log dashboard)
            NotificationLog.objects.create(
                org_id=event.org_id,
                store_id=store_id,
                event_id=event.id,
                rule_id=suppressed_by_rule_id,
                channel="dashboard",
                destination=None,
                provider="internal",
                status="suppressed",
                error=suppressed_reason,
                sent_at=now,
            )
        else:
            # dashboard log sempre
            NotificationLog.objects.create(
                org_id=event.org_id,
                store_id=store_id,
                event_id=event.id,
                rule_id=rule_used.id if rule_used else None,
                channel="dashboard",
                destination=None,
                provider="internal",
                status="sent",
                sent_at=now,
            )

            if should_send:
                payload = {
                    "type": "alert",
                    "org_id": str(event.org_id) if event.org_id else None,
                    "store_id": str(event.store_id),
                    "event_id": str(event.id),
                    "severity": event.severity,
                    "event_type": event.type,
                    "title": event.title,
                    "description": event.description,
                    "occurred_at": event.occurred_at.isoformat(),
                    "channels": channels,
                    "destinations": destinations,
                    "media": EventMediaSerializer(EventMedia.objects.filter(event_id=event.id), many=True).data,
                    "metadata": event.metadata,
                }
                n8n_result = send_event_to_n8n(payload)

                for ch in ["email", "whatsapp"]:
                    if channels.get(ch):
                        NotificationLog.objects.create(
                            org_id=event.org_id,
                            store_id=store_id,
                            event_id=event.id,
                            rule_id=rule_used.id if rule_used else None,
                            channel=ch,
                            destination=destinations.get(ch),
                            provider="n8n",
                            status="sent" if (n8n_result and n8n_result.get("ok")) else "failed",
                            provider_message_id=(n8n_result or {}).get("data", {}).get("id")
                                if isinstance((n8n_result or {}).get("data"), dict) else None,
                            error=None if (n8n_result and n8n_result.get("ok")) else str(n8n_result),
                            sent_at=now,
                        )

        return Response(
            {
                "event": DetectionEventSerializer(event).data,
                "n8n": n8n_result,
                "suppressed": bool(suppressed_by_rule_id),
            },
            status=status.HTTP_201_CREATED,
        )


# =========================
# EVENTS (LIST + RESOLVE/IGNORE + MEDIA)
# =========================
class DetectionEventViewSet(viewsets.ModelViewSet):
    serializer_class = DetectionEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        store_id = self.request.query_params.get("store_id")
        status_q = self.request.query_params.get("status")
        qs = DetectionEvent.objects.all().order_by("-occurred_at")
        if store_id:
            qs = qs.filter(store_id=store_id)
        if status_q:
            qs = qs.filter(status=status_q)
        return qs

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        event = self.get_object()
        event.status = "resolved"
        event.resolved_at = timezone.now()
        event.resolved_by_user_id = getattr(request.user, "id", None)
        event.save(update_fields=["status", "resolved_at", "resolved_by_user_id"])
        return Response(DetectionEventSerializer(event).data)

    @action(detail=True, methods=["post"], url_path="ignore")
    def ignore(self, request, pk=None):
        event = self.get_object()
        event.status = "ignored"
        event.save(update_fields=["status"])
        return Response(DetectionEventSerializer(event).data)

    @action(detail=True, methods=["post"], url_path="media")
    def add_media(self, request, pk=None):
        event = self.get_object()
        serializer = EventMediaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media = serializer.save(event_id=event.id, created_at=timezone.now())
        return Response(EventMediaSerializer(media).data, status=status.HTTP_201_CREATED)


# =========================
# NOTIFICATION LOGS (AUDITORIA)
# =========================
class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        store_id = self.request.query_params.get("store_id")
        event_id = self.request.query_params.get("event_id")
        qs = NotificationLog.objects.all().order_by("-sent_at")
        if store_id:
            qs = qs.filter(store_id=store_id)
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs


