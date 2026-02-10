# apps/alerts/views.py
import logging
from datetime import timedelta
from uuid import UUID, uuid4
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from apps.core.models import StoreManager


from django.utils import timezone
from django.db.utils import DataError
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import (
    AlertRule,
    DetectionEvent,
    EventMedia,
    NotificationLog,
    Store,
    JourneyEvent,
)

from .serializers import (
    AlertRuleSerializer,
    DetectionEventSerializer,
    EventMediaSerializer,
    NotificationLogSerializer,
    JourneyEventSerializer,
)

from .services import send_event_to_n8n

logger = logging.getLogger(__name__)


# =========================
# CORE STORES (UUID) - para o frontend filtrar alerts corretamente
# GET /api/alerts/stores/
# =========================
class CoreStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ("id", "name")


class CoreStoreListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Store.objects.all().order_by("name")
        return Response(CoreStoreSerializer(qs, many=True).data)


# =========================
# Helpers
# =========================
def is_uuid(value: str) -> bool:
    try:
        UUID(str(value))
        return True
    except Exception:
        return False

def _dest_to_text(dest):
    """
    notification_logs.destination é TEXT.
    - string -> string
    - lista -> CSV
    - None -> None
    """
    if dest is None:
        return None
    if isinstance(dest, list):
        return ",".join([str(x).strip() for x in dest if str(x).strip()])
    return str(dest).strip()


def require_uuid_param(name: str, value: str):
    if not is_uuid(value):
        raise ValidationError({name: f'{name} deve ser um UUID válido (core.Store). Recebido: "{value}".'})

def resolve_email_destinations(*, store_id, explicit_email=None):
    """
    Resolve e-mails automaticamente:
    - Se explicit_email foi fornecido (request), retorna ele.
    - Senão, tenta StoreManager -> User.email (owner/admin/manager).
    Retorna lista de emails (dedup).
    """
    if explicit_email:
        # aceita string ou lista
        if isinstance(explicit_email, list):
            return [e for e in explicit_email if e]
        return [explicit_email]

    User = get_user_model()

    # Ajuste roles conforme seu ORG_ROLE / StoreManager model
    qs = (
        StoreManager.objects
        .filter(store_id=store_id)
        .select_related("user")
    )

    # Se StoreManager tiver campo role, descomente e ajuste:
    # qs = qs.filter(role__in=["owner", "admin", "manager"])

    emails = []
    for sm in qs:
        email = getattr(sm.user, "email", None)
        if email:
            emails.append(email)

    # dedupe preservando ordem
    out = []
    for e in emails:
        if e not in out:
            out.append(e)
    return out


def get_store_plan_features(store: Store) -> dict:
    features = {"email": True, "whatsapp": False}

    default_features = getattr(settings, "DALE_PLAN_DEFAULT_FEATURES", None)
    if isinstance(default_features, dict):
        features.update(default_features)

    if getattr(settings, "DALE_WHATSAPP_ENABLED", False):
        features["whatsapp"] = True

    plan_code = getattr(store, "plan_code", None) or getattr(getattr(store, "org", None), "plan_code", None)
    _ = plan_code  # reservado para futura lógica por plano

    return features

# =========================
# DEMO LEAD (FORM PÚBLICO) — Opção A (DEDUPE por email/whatsapp)
# =========================
class DemoLeadCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        request_id = request.headers.get("X-Request-ID") or uuid4().hex
        now = timezone.now()

        def error_response(*, code: str, status_code: int, message: str = "", errors: dict | None = None):
            payload = {"ok": False, "code": code, "request_id": request_id}
            if message:
                payload["message"] = message
            if errors is not None:
                payload["errors"] = errors
            return Response(payload, status=status_code)

        try:
            raw_payload = request.data.copy() if hasattr(request.data, "copy") else request.data
            if isinstance(raw_payload, dict):
                payload = raw_payload
            elif hasattr(raw_payload, "dict"):
                payload = raw_payload.dict()
            else:
                payload = {}

            errors: dict[str, str] = {}

            def _require_str(field_name: str) -> str:
                value = str(payload.get(field_name) or "").strip()
                if not value:
                    errors[field_name] = "Campo obrigatório."
                return value

            contact_name = _require_str("contact_name")
            email = _require_str("email").lower()
            whatsapp = _require_str("whatsapp")
            operation_type = _require_str("operation_type")
            stores_range = _require_str("stores_range")
            cameras_range = _require_str("cameras_range")

            primary_goals = payload.get("primary_goals")
            if primary_goals is None:
                primary_goals = []
            if not isinstance(primary_goals, list):
                errors["primary_goals"] = "primary_goals deve ser uma lista."
                primary_goals = []
            if not primary_goals:
                errors["primary_goals"] = "Informe pelo menos 1 objetivo."

            qualified_score_raw = payload.get("qualified_score")
            qualified_score = 0
            if qualified_score_raw not in (None, ""):
                try:
                    qualified_score = int(qualified_score_raw)
                except Exception:
                    errors["qualified_score"] = "qualified_score inválido."

            utm = payload.get("utm")
            if utm is None:
                utm = {}
            if not isinstance(utm, dict):
                errors["utm"] = "utm inválido."
                utm = {}

            metadata = payload.get("metadata")
            if metadata is None:
                metadata = {}
            if not isinstance(metadata, dict):
                errors["metadata"] = "metadata inválido."
                metadata = {}

            if errors:
                return error_response(
                    code="VALIDATION_ERROR",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    errors=errors,
                )

            source = str(payload.get("source") or "").strip()
            try:
                db_conf = settings.DATABASES.get("default", {})
                logger.info(
                    "[DEMO] request_id=%s email=%s source=%s db_engine=%s db_host=%s db_name=%s",
                    request_id,
                    email or "n/a",
                    source or "n/a",
                    db_conf.get("ENGINE"),
                    db_conf.get("HOST"),
                    db_conf.get("NAME"),
                )
            except Exception:
                logger.exception("[DEMO] failed to log db config request_id=%s", request_id)

            lead_id = None
            deduped = False

            with transaction.atomic():
                with connection.cursor() as cursor:
                    columns = connection.introspection.get_table_description(cursor, "demo_leads")
                    column_names = {col.name for col in columns}

                    if "email" not in column_names:
                        return error_response(
                            code="INTERNAL_ERROR",
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            message="Schema inválido para demo_leads.",
                        )

                    cursor.execute(
                        """
                        SELECT id
                          FROM public.demo_leads
                         WHERE lower(email) = lower(%s)
                         ORDER BY created_at DESC
                         LIMIT 1
                        """,
                        [email],
                    )
                    row = cursor.fetchone()
                    if row and row[0]:
                        lead_id = str(row[0])
                        deduped = True
                    else:
                        payload_map = {
                            "id": str(uuid4()),
                            "contact_name": contact_name,
                            "email": email,
                            "whatsapp": whatsapp,
                            "operation_type": operation_type,
                            "stores_range": stores_range,
                            "cameras_range": cameras_range,
                            "camera_brands_json": payload.get("camera_brands_json") or [],
                            "pilot_city": payload.get("pilot_city"),
                            "pilot_state": payload.get("pilot_state"),
                            "primary_goal": payload.get("primary_goal")
                            or (primary_goals[0] if primary_goals else None),
                            "primary_goals": primary_goals,
                            "qualified_score": qualified_score,
                            "source": source or None,
                            "utm": utm,
                            "metadata": metadata,
                            "status": "new",
                            "created_at": now,
                            "updated_at": now,
                        }

                        insert_cols = [col for col in payload_map.keys() if col in column_names]
                        if not insert_cols:
                            return error_response(
                                code="INTERNAL_ERROR",
                                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                message="Schema inválido para demo_leads.",
                            )

                        values = [payload_map[col] for col in insert_cols]
                        placeholders = ", ".join(["%s"] * len(insert_cols))
                        col_list = ", ".join(insert_cols)

                        cursor.execute(
                            f"INSERT INTO public.demo_leads ({col_list}) VALUES ({placeholders}) RETURNING id",
                            values,
                        )
                        lead_row = cursor.fetchone()
                        lead_id = str(lead_row[0]) if lead_row else None

            if not lead_id:
                return error_response(
                    code="INTERNAL_ERROR",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    message="Falha ao salvar lead.",
                )

            logger.info(
                "[DEMO] request_id=%s lead_id=%s deduped=%s",
                request_id,
                lead_id,
                deduped,
            )

            if not deduped:
                try:
                    je = JourneyEvent.objects.create(
                        lead_id=lead_id,
                        org_id=None,
                        event_name="lead_created",
                        payload={
                            "event_category": "onboarding",
                            "source": "demo_form",
                            "lead_id": str(lead_id),
                            "email": email,
                            "whatsapp": whatsapp,
                            "operation_type": operation_type,
                            "stores_range": stores_range,
                            "cameras_range": cameras_range,
                            "primary_goal": payload.get("primary_goal"),
                            "primary_goals": primary_goals,
                            "qualified_score": qualified_score,
                        },
                        created_at=now,
                    )

                    resp = send_event_to_n8n(
                        event_name="lead_created",
                        event_id=str(je.id),
                        lead_id=str(lead_id),
                        org_id=None,
                        source="backend",
                        data={
                            "event_category": "onboarding",
                            "lead_id": str(lead_id),
                            "contact_name": contact_name,
                            "email": email,
                            "whatsapp": whatsapp,
                            "operation_type": operation_type,
                            "stores_range": stores_range,
                            "cameras_range": cameras_range,
                            "primary_goal": payload.get("primary_goal"),
                            "primary_goals": primary_goals,
                            "qualified_score": qualified_score,
                            "utm": utm,
                            "metadata": metadata,
                        },
                        meta={
                            "source": "demo_form",
                            "ip": request.META.get("REMOTE_ADDR"),
                            "user_agent": request.META.get("HTTP_USER_AGENT"),
                            "request_id": request_id,
                        },
                    )
                    if not resp.get("ok"):
                        logger.warning(
                            "[DEMO] request_id=%s n8n lead_created failed response=%s",
                            request_id,
                            resp,
                        )
                except Exception:
                    logger.exception("[DEMO] request_id=%s failed to emit lead_created event", request_id)

            return Response(
                {"ok": True, "id": lead_id, "deduped": deduped, "request_id": request_id},
                status=status.HTTP_200_OK if deduped else status.HTTP_201_CREATED,
            )
        except Exception:
            logger.exception("[DEMO] request_id=%s internal error", request_id)
            return error_response(
                code="INTERNAL_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="Erro interno ao processar o lead.",
            )


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
            require_uuid_param("store_id", store_id)
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
        7) chama n8n com envelope padronizado (alert_triggered/alert_suppressed)
        """
        store_id = request.data.get("store_id")
        camera_id = request.data.get("camera_id")
        zone_id = request.data.get("zone_id")
        event_type = request.data.get("event_type")

        # valida enum do banco sem 500
        if event_type:
            try:
                AlertRule.objects.filter(type=event_type).exists()
            except DataError:
                return Response(
                    {"event_type": f'event_type inválido para o enum do banco: "{event_type}".'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        severity = request.data.get("severity")
        title = request.data.get("title") or "Evento detectado"
        description = request.data.get("description") or request.data.get("message") or ""
        metadata = request.data.get("metadata")
        if not isinstance(metadata, dict):
            metadata = {}
        occurred_at = request.data.get("occurred_at")  # opcional iso
        clip_url = request.data.get("clip_url")
        snapshot_url = request.data.get("snapshot_url")
        destinations_in = request.data.get("destinations") or {}  # pode vir vazio
        destinations = dict(destinations_in)  # cópia segura

        # ✅ NOVO: receipt_id (para rastreio / idempotência ponta-a-ponta)
        receipt_id = request.data.get("receipt_id")  # opcional
        if receipt_id and not metadata.get("receipt_id"):
            metadata["receipt_id"] = receipt_id

        if not store_id or not event_type or not severity:
            return Response(
                {"detail": "store_id, event_type, severity são obrigatórios"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # store_id precisa ser UUID (core.Store)
        require_uuid_param("store_id", str(store_id))

        try:
            store = Store.objects.get(id=store_id)
        except Store.DoesNotExist:
            raise ValidationError({"detail": "store_id inválido"})

        org_id = store.org_id

        now = timezone.now()
        occ = now

        # parse occurred_at se vier ISO string
        if isinstance(occurred_at, str):
            try:
                occ = timezone.datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
                if timezone.is_naive(occ):
                    occ = timezone.make_aware(occ)
            except Exception:
                occ = now

        # regras candidatas (por store e, se existir, por zone e tipo)
        rules = AlertRule.objects.filter(store_id=store_id, active=True).filter(type=event_type)
        if zone_id and is_uuid(str(zone_id)):
            rules = rules.filter(zone_id=zone_id)

        rule_used = None
        suppressed_by_rule_id = None
        suppressed_reason = None
        cooldown_minutes = 0

        should_send = False
        channels = {"dashboard": True, "email": False, "whatsapp": False}
        rule_channels = {}

        if rules.exists():
            rule_used = rules.first()
            channels = rule_used.channels or channels
            rule_channels = dict(channels)
            cooldown_minutes = rule_used.cooldown_minutes or 0
            since = now - timedelta(minutes=cooldown_minutes)

            recently_sent = NotificationLog.objects.filter(
                store_id=store_id,
                rule_id=rule_used.id,
                channel__in=["email", "whatsapp"],
                sent_at__gte=since,
                status__in=["sent", "queued"],
            ).exists()

            if recently_sent:
                suppressed_by_rule_id = rule_used.id
                suppressed_reason = f"Cooldown ativo ({cooldown_minutes} min)"

        # Gating por plano (email base, whatsapp somente addon)
        allowed = get_store_plan_features(store)
        channels["email"] = bool(channels.get("email")) and bool(allowed.get("email"))
        channels["whatsapp"] = bool(channels.get("whatsapp")) and bool(allowed.get("whatsapp"))
        channels["dashboard"] = True

        # Resolve automaticamente email se a regra pedir e não vier no request
        if channels.get("email") and not destinations.get("email"):
            resolved_emails = resolve_email_destinations(
                store_id=store_id,
                explicit_email=None,
            )
            if resolved_emails:
                destinations["email"] = resolved_emails

        should_send = bool(channels.get("email") or channels.get("whatsapp"))
        if suppressed_by_rule_id:
            should_send = False

        # cria detection_event sempre
        event = DetectionEvent.objects.create(
            org_id=org_id,
            store_id=store_id,
            camera_id=camera_id,
            zone_id=zone_id if is_uuid(str(zone_id)) else None,
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

        # event_media
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

        # meta padronizado para n8n
        edge_meta = {"source": "alerts_ingest"}
        if receipt_id:
            edge_meta["receipt_id"] = receipt_id

        # helper pra extrair delivery id/status do n8n
        def _delivery_info(n8n_result: dict, channel: str):
            """
            Espera resposta padrão do n8n:
            {
              ok: true,
              deliveries: {
                whatsapp: { ok: true, id: "..." },
                email: { ok: true, id: "..." }
              }
            }
            """
            try:
                deliveries = (n8n_result or {}).get("data", {}).get("deliveries") or (n8n_result or {}).get("deliveries")
                if isinstance(deliveries, dict) and channel in deliveries and isinstance(deliveries[channel], dict):
                    ch = deliveries[channel]
                    return (bool(ch.get("ok")), ch.get("id"))
            except Exception:
                pass
            # fallback antigo
            provider_id = None
            try:
                d = (n8n_result or {}).get("data")
                if isinstance(d, dict):
                    provider_id = d.get("id")
            except Exception:
                provider_id = None
            return (bool(n8n_result and n8n_result.get("ok")), provider_id)

        # notification logs + n8n
        n8n_result = None

        if suppressed_by_rule_id:
            # dashboard log suppressed
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

            suppressed_payload = {
                "event_category": "alert",
                "store_id": str(event.store_id),
                "event_id": str(event.id),
                "rule_id": str(suppressed_by_rule_id),
                "cooldown_minutes": cooldown_minutes,
                "suppressed_reason": suppressed_reason,
                "channels": channels,
                "destinations": destinations,
                "metadata": event.metadata,
                "occurred_at": event.occurred_at.isoformat() if event.occurred_at else None,
            }
            if receipt_id:
                suppressed_payload["receipt_id"] = receipt_id

            journey_event = JourneyEvent.objects.create(
                lead_id=None,
                org_id=org_id,
                event_name="alert_suppressed",
                payload=suppressed_payload,
                created_at=now,
            )

            n8n_result = send_event_to_n8n(
                event_name="alert_suppressed",
                event_id=str(journey_event.id),
                lead_id=None,
                org_id=org_id,
                data=suppressed_payload,
                meta=edge_meta,
            )

        else:
            # dashboard log sent
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

            # canais bloqueados por plano -> log "skipped"
            for ch in ["email", "whatsapp"]:
                if rule_channels.get(ch) and not channels.get(ch):
                    NotificationLog.objects.create(
                        org_id=event.org_id,
                        store_id=store_id,
                        event_id=event.id,
                        rule_id=rule_used.id if rule_used else None,
                        channel=ch,
                        destination=_dest_to_text(destinations.get(ch)),
                        provider="internal",
                        status="skipped",
                        error="plan_not_allowed",
                        sent_at=now,
                    )

            if should_send:
                payload = {
                    "event_category": "alert",
                    "type": "alert",
                    "org_id": str(event.org_id) if event.org_id else None,
                    "store_id": str(event.store_id),
                    "event_id": str(event.id),
                    "severity": event.severity,
                    "event_type": event.type,
                    "title": event.title,
                    "description": event.description,
                    "occurred_at": event.occurred_at.isoformat(),
                    "receipt_id": request.data.get("receipt_id"),  # ✅ aqui
                    "channels": channels,
                    "destinations": destinations,
                    "media": EventMediaSerializer(
                        EventMedia.objects.filter(event_id=event.id),
                        many=True
                    ).data,
                    "metadata": event.metadata,
                }
                if receipt_id:
                    payload["receipt_id"] = receipt_id

                journey_event = JourneyEvent.objects.create(
                    lead_id=None,
                    org_id=org_id,
                    event_name="alert_triggered",
                    payload=payload,
                    created_at=now,
                )

                n8n_result = send_event_to_n8n(
                    event_name="alert_triggered",
                    event_id=str(journey_event.id),
                    lead_id=None,
                    org_id=org_id,
                    data=payload,
                    meta=edge_meta,
                )

                # logs por canal (email/whatsapp)
                for ch in ["email", "whatsapp"]:
                    if channels.get(ch):
                        ok, provider_message_id = _delivery_info(n8n_result, ch)
                        NotificationLog.objects.create(
                            org_id=event.org_id,
                            store_id=store_id,
                            event_id=event.id,
                            rule_id=rule_used.id if rule_used else None,
                            channel=ch,
                            destination=_dest_to_text(destinations.get(ch)),
                            provider="n8n",
                            status="sent" if ok else "failed",
                            provider_message_id=provider_message_id,
                            error=None if ok else str(n8n_result),
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
        severity_q = self.request.query_params.get("severity")
        occurred_from = self.request.query_params.get("occurred_from")
        occurred_to = self.request.query_params.get("occurred_to")

        qs = DetectionEvent.objects.all().order_by("-occurred_at")

        if store_id:
            require_uuid_param("store_id", store_id)
            qs = qs.filter(store_id=store_id)

        if status_q:
            if status_q not in ["open", "resolved", "ignored"]:
                raise ValidationError({"status": "status deve ser open|resolved|ignored"})
            qs = qs.filter(status=status_q)

        if severity_q:
            if severity_q not in ["critical", "warning", "info"]:
                raise ValidationError({"severity": "severity deve ser critical|warning|info"})
            qs = qs.filter(severity=severity_q)

        def _parse_dt(value: str, field: str):
            try:
                dt = timezone.datetime.fromisoformat(value.replace("Z", "+00:00"))
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
                return dt
            except Exception:
                raise ValidationError({field: "datetime inválido (use ISO 8601)"})

        if occurred_from:
            qs = qs.filter(occurred_at__gte=_parse_dt(occurred_from, "occurred_from"))
        if occurred_to:
            qs = qs.filter(occurred_at__lte=_parse_dt(occurred_to, "occurred_to"))

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
            require_uuid_param("store_id", store_id)
            qs = qs.filter(store_id=store_id)

        if event_id:
            require_uuid_param("event_id", event_id)
            qs = qs.filter(event_id=event_id)

        return qs


# =========================
# JOURNEY EVENTS (CRM)
# =========================
class JourneyEventViewSet(viewsets.ModelViewSet):
    serializer_class = JourneyEventSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = JourneyEvent.objects.all().order_by("-created_at")

        lead_id = self.request.query_params.get("lead_id")
        org_id = self.request.query_params.get("org_id")
        event_name = self.request.query_params.get("event_name")

        if lead_id:
            qs = qs.filter(lead_id=lead_id)
        if org_id:
            qs = qs.filter(org_id=org_id)
        if event_name:
            qs = qs.filter(event_name=event_name)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_at=timezone.now())
