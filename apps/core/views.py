import requests
from decimal import Decimal, InvalidOperation
from datetime import timedelta
from django.conf import settings
from django.db import connection
from django.db.models import Count, Sum
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.test.testcases import DatabaseOperationForbidden
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from apps.core.integrations import supabase_storage
from apps.core import models
from apps.stores.services.user_orgs import get_user_org_ids
from apps.core.services.event_receipts import (
    build_pdv_receipt_id,
    insert_event_receipt_if_new,
    mark_event_receipt_failed,
    mark_event_receipt_processed,
)
from apps.core.services.journey_events import log_journey_event
from apps.core.services.pdv_health import get_pdv_ingestion_health
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
            "days_mode": goal.days_mode if goal else "calendar",
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

        days_mode = str(request.data.get("days_mode") or "calendar").strip().lower()
        if days_mode not in {"calendar", "business"}:
            return Response(
                {"detail": "days_mode deve ser calendar|business."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        goal, _ = models.UserSalesGoal.objects.get_or_create(
            user=request.user,
            month=month,
            defaults={
                "target_revenue": target_value,
                "days_mode": days_mode,
                "currency": "BRL",
            },
        )
        goal.target_revenue = target_value
        goal.days_mode = days_mode
        goal.updated_at = timezone.now()
        goal.save(update_fields=["target_revenue", "days_mode", "updated_at"])

        return Response(self._build_payload(request, month), status=status.HTTP_200_OK)


class PdvIntegrationInterestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        store_id = str(request.data.get("store_id") or "").strip()
        pdv_system = str(request.data.get("pdv_system") or "").strip()
        contact_email = str(request.data.get("contact_email") or "").strip()
        contact_phone = str(request.data.get("contact_phone") or "").strip()

        if not store_id or not pdv_system or not contact_email:
            return Response(
                {"detail": "store_id, pdv_system e contact_email são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        store = models.Store.objects.filter(id=store_id).first()
        if not store:
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        record = models.PdvIntegrationInterest.objects.create(
            user=request.user,
            store=store,
            pdv_system=pdv_system,
            contact_email=contact_email,
            contact_phone=contact_phone or None,
            status="requested",
        )

        return Response(
            {
                "id": str(record.id),
                "status": record.status,
                "store_id": str(store.id),
                "pdv_system": record.pdv_system,
                "contact_email": record.contact_email,
                "contact_phone": record.contact_phone,
                "created_at": record.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class PdvTransactionIngestView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _can_access_store(user, store) -> bool:
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            return True
        try:
            org_ids = get_user_org_ids(user)
            return str(store.org_id) in {str(org_id) for org_id in org_ids}
        except Exception:
            return False

    @staticmethod
    def _parse_datetime(raw_value):
        if raw_value in (None, ""):
            return None
        dt = parse_datetime(str(raw_value).replace("Z", "+00:00"))
        if dt is None:
            return None
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        return dt

    def post(self, request):
        store_id = str(request.data.get("store_id") or "").strip()
        source_system = str(request.data.get("source_system") or "").strip().lower()
        transaction_id = str(request.data.get("transaction_id") or "").strip()
        occurred_at = self._parse_datetime(request.data.get("occurred_at"))
        currency = str(request.data.get("currency") or "BRL").strip().upper()[:3] or "BRL"
        payment_method = str(request.data.get("payment_method") or "").strip() or None
        metadata = request.data.get("metadata") or {}

        if not store_id or not source_system or not transaction_id or occurred_at is None:
            return Response(
                {"detail": "store_id, source_system, transaction_id e occurred_at são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        receipt_id = build_pdv_receipt_id(
            store_id=store_id,
            source_system=source_system,
            transaction_id=transaction_id,
        )
        payload_raw = {
            "store_id": store_id,
            "source_system": source_system,
            "transaction_id": transaction_id,
            "occurred_at": occurred_at.isoformat(),
            "gross_amount": request.data.get("gross_amount"),
            "net_amount": request.data.get("net_amount"),
            "currency": currency,
            "payment_method": payment_method,
            "metadata": metadata if isinstance(metadata, dict) else {},
        }
        try:
            insert_event_receipt_if_new(
                event_id=receipt_id,
                event_name="pdv_transaction_ingest",
                source="pdv_integration",
                payload=payload_raw,
                meta={
                    "store_id": store_id,
                    "source_system": source_system,
                    "transaction_id": transaction_id,
                },
            )
        except DatabaseOperationForbidden:
            pass
        except Exception:
            pass

        try:
            gross_amount = Decimal(str(request.data.get("gross_amount")))
            if gross_amount <= 0:
                raise InvalidOperation("gross_amount_must_be_positive")
        except (InvalidOperation, TypeError, ValueError):
            mark_event_receipt_failed(event_id=receipt_id, error_message="invalid_gross_amount")
            return Response(
                {"detail": "gross_amount deve ser numérico e maior que zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        net_raw = request.data.get("net_amount")
        net_amount = None
        if net_raw not in (None, ""):
            try:
                net_amount = Decimal(str(net_raw))
            except (InvalidOperation, TypeError, ValueError):
                mark_event_receipt_failed(event_id=receipt_id, error_message="invalid_net_amount")
                return Response(
                    {"detail": "net_amount deve ser numérico quando informado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        store = models.Store.objects.filter(id=store_id).first()
        if not store:
            mark_event_receipt_failed(event_id=receipt_id, error_message="store_not_found")
            return Response({"detail": "Loja não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if not self._can_access_store(request.user, store):
            mark_event_receipt_failed(event_id=receipt_id, error_message="permission_denied")
            raise PermissionDenied("Sem permissão para registrar transações nesta loja.")

        payload_raw = {
            "store_id": store_id,
            "source_system": source_system,
            "transaction_id": transaction_id,
            "occurred_at": occurred_at.isoformat(),
            "gross_amount": str(gross_amount),
            "net_amount": str(net_amount) if net_amount is not None else None,
            "currency": currency,
            "payment_method": payment_method,
            "metadata": metadata if isinstance(metadata, dict) else {},
        }
        record, created = models.PosTransactionEvent.objects.get_or_create(
            store=store,
            source_system=source_system,
            transaction_id=transaction_id,
            defaults={
                "org_id": store.org_id,
                "occurred_at": occurred_at,
                "gross_amount": gross_amount,
                "net_amount": net_amount,
                "currency": currency,
                "payment_method": payment_method,
                "raw_payload": payload_raw,
                "created_at": timezone.now(),
                "updated_at": timezone.now(),
            },
        )
        if not created:
            record.occurred_at = occurred_at
            record.gross_amount = gross_amount
            record.net_amount = net_amount
            record.currency = currency
            record.payment_method = payment_method
            record.raw_payload = payload_raw
            record.updated_at = timezone.now()
            record.save(
                update_fields=[
                    "occurred_at",
                    "gross_amount",
                    "net_amount",
                    "currency",
                    "payment_method",
                    "raw_payload",
                    "updated_at",
                ]
            )

        mark_event_receipt_processed(event_id=receipt_id)
        return Response(
            {
                "ok": True,
                "created": bool(created),
                "id": str(record.id),
                "store_id": str(store.id),
                "org_id": str(store.org_id),
                "source_system": record.source_system,
                "transaction_id": record.transaction_id,
                "occurred_at": record.occurred_at.isoformat() if record.occurred_at else None,
                "gross_amount": float(record.gross_amount),
                "net_amount": float(record.net_amount) if record.net_amount is not None else None,
                "currency": record.currency,
                "payment_method": record.payment_method,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PdvTransactionSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = str(request.query_params.get("store_id") or "").strip() or None
        period = str(request.query_params.get("period") or "7d").strip().lower()

        days = 7
        if period.endswith("d"):
            try:
                days = int(period[:-1])
            except Exception:
                days = 7
        days = max(1, min(days, 365))
        start = timezone.now() - timedelta(days=days)

        qs = models.PosTransactionEvent.objects.filter(occurred_at__gte=start)
        if store_id:
            qs = qs.filter(store_id=store_id)

        if not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
            org_ids = {str(org_id) for org_id in get_user_org_ids(request.user)}
            qs = qs.filter(org_id__in=org_ids)

        totals = qs.aggregate(
            transactions_total=Count("id"),
            gross_total=Sum("gross_amount"),
            net_total=Sum("net_amount"),
            stores_total=Count("store", distinct=True),
        )
        transactions_total = int(totals.get("transactions_total") or 0)
        gross_total = float(totals.get("gross_total") or 0)
        net_total = float(totals.get("net_total") or 0)
        avg_ticket = float(gross_total / transactions_total) if transactions_total > 0 else None

        return Response(
            {
                "period": f"{days}d",
                "from": start.isoformat(),
                "to": timezone.now().isoformat(),
                "store_id": store_id,
                "transactions_total": transactions_total,
                "gross_total": gross_total,
                "net_total": net_total,
                "avg_ticket": avg_ticket,
                "stores_total": int(totals.get("stores_total") or 0),
            },
            status=status.HTTP_200_OK,
        )


class PdvIngestionHealthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = str(request.query_params.get("period") or "7d").strip().lower()
        store_id = str(request.query_params.get("store_id") or "").strip() or None

        days = 7
        if period.endswith("d"):
            try:
                days = int(period[:-1])
            except Exception:
                days = 7
        days = max(1, min(days, 365))
        start = timezone.now() - timedelta(days=days)

        if getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False):
            scoped_store_ids = [store_id] if store_id else []
        else:
            org_ids = {str(org_id) for org_id in get_user_org_ids(request.user)}
            store_qs = models.Store.objects.filter(org_id__in=org_ids)
            if store_id:
                if not store_qs.filter(id=store_id).exists():
                    raise PermissionDenied("Sem permissão para consultar esta loja.")
                scoped_store_ids = [store_id]
            else:
                scoped_store_ids = [str(sid) for sid in store_qs.values_list("id", flat=True)]

        payload = get_pdv_ingestion_health(start=start, store_ids=scoped_store_ids)
        payload["period"] = f"{days}d"
        payload["store_id"] = store_id
        payload["scope_stores"] = len(scoped_store_ids) if scoped_store_ids else None
        return Response(payload, status=status.HTTP_200_OK)


class DataCompletenessView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = str(request.query_params.get("period") or "30d").strip().lower()
        days = 30
        if period.endswith("d"):
            try:
                days = int(period[:-1])
            except Exception:
                days = 30
        days = max(1, min(days, 365))
        start = timezone.now() - timedelta(days=days)

        store_id = str(request.query_params.get("store_id") or "").strip() or None
        scope_org_ids = []
        scope_store_ids = []

        if getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False):
            if store_id:
                scope_store_ids = [store_id]
        else:
            org_ids = [str(org_id) for org_id in get_user_org_ids(request.user)]
            if not org_ids:
                return Response(
                    {
                        "period": f"{days}d",
                        "from": start.isoformat(),
                        "to": timezone.now().isoformat(),
                        "tables": [],
                        "overall_null_rate": 0.0,
                    },
                    status=status.HTTP_200_OK,
                )
            scope_org_ids = org_ids
            store_qs = models.Store.objects.filter(org_id__in=org_ids)
            if store_id:
                if not store_qs.filter(id=store_id).exists():
                    raise PermissionDenied("Sem permissão para consultar esta loja.")
                scope_store_ids = [store_id]
            else:
                scope_store_ids = [str(sid) for sid in store_qs.values_list("id", flat=True)]

        checks = [
            {
                "table": "pos_transaction_events",
                "label": "POS Transactions",
                "ts_column": "occurred_at",
                "scope_mode": "store",
                "fields": [
                    "store_id",
                    "source_system",
                    "transaction_id",
                    "occurred_at",
                    "gross_amount",
                ],
            },
            {
                "table": "journey_events",
                "label": "Journey Events",
                "ts_column": "created_at",
                "scope_mode": "org_or_global",
                "fields": ["event_name", "created_at"],
            },
            {
                "table": "traffic_metrics",
                "label": "Traffic Metrics",
                "ts_column": "ts_bucket",
                "scope_mode": "store",
                "fields": ["store_id", "ts_bucket", "footfall", "camera_role", "ownership"],
            },
            {
                "table": "conversion_metrics",
                "label": "Conversion Metrics",
                "ts_column": "ts_bucket",
                "scope_mode": "store",
                "fields": ["store_id", "ts_bucket", "queue_avg_seconds", "checkout_events", "camera_role", "ownership"],
            },
        ]

        def _field_expr(field: str) -> str:
            if field == "event_name":
                return "COALESCE(NULLIF(TRIM(event_name::text), ''), NULL) IS NULL"
            if field in {"source_system", "transaction_id", "camera_role", "ownership"}:
                return f"COALESCE(NULLIF(TRIM({field}::text), ''), NULL) IS NULL"
            return f"{field} IS NULL"

        rows = []
        total_samples = 0
        total_missing = 0

        with connection.cursor() as cursor:
            for check in checks:
                base_where = [f"{check['ts_column']} >= %s"]
                params = [start]

                if check["scope_mode"] == "store" and scope_store_ids:
                    base_where.append("store_id = ANY(%s)")
                    params.append(scope_store_ids)
                elif check["scope_mode"] == "store" and not (
                    getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)
                ):
                    base_where.append("1 = 0")

                if check["scope_mode"] == "org_or_global":
                    if scope_org_ids:
                        base_where.append("(org_id::text = ANY(%s) OR org_id IS NULL)")
                        params.append(scope_org_ids)
                    elif not (
                        getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)
                    ):
                        base_where.append("1 = 0")

                where_clause = " AND ".join(base_where)
                cursor.execute(
                    f"""
                    SELECT COUNT(*)::int
                    FROM public.{check["table"]}
                    WHERE {where_clause}
                    """,
                    params,
                )
                total_rows = int((cursor.fetchone() or [0])[0] or 0)
                fields_payload = []
                table_samples = 0
                table_missing = 0

                for field in check["fields"]:
                    missing_expr = _field_expr(field)
                    cursor.execute(
                        f"""
                        SELECT COUNT(*)::int
                        FROM public.{check["table"]}
                        WHERE {where_clause}
                          AND ({missing_expr})
                        """,
                        params,
                    )
                    missing_count = int((cursor.fetchone() or [0])[0] or 0)
                    null_rate = round((missing_count / total_rows), 4) if total_rows > 0 else 0.0
                    fields_payload.append(
                        {
                            "field": field,
                            "missing_count": missing_count,
                            "null_rate": null_rate,
                        }
                    )
                    table_samples += total_rows
                    table_missing += missing_count

                table_null_rate = round((table_missing / table_samples), 4) if table_samples > 0 else 0.0
                rows.append(
                    {
                        "table": check["table"],
                        "label": check["label"],
                        "rows_total": total_rows,
                        "null_rate": table_null_rate,
                        "fields": fields_payload,
                    }
                )
                total_samples += table_samples
                total_missing += table_missing

        overall_null_rate = round((total_missing / total_samples), 4) if total_samples > 0 else 0.0
        return Response(
            {
                "period": f"{days}d",
                "from": start.isoformat(),
                "to": timezone.now().isoformat(),
                "store_id": store_id,
                "tables": rows,
                "overall_null_rate": overall_null_rate,
                "quality_score": max(0, min(100, round(100 - (overall_null_rate * 100)))),
            },
            status=status.HTTP_200_OK,
        )


def _load_ingestion_funnel_gap_rows(*, start, end, store_id: str | None = None, limit: int = 200):
    query = """
        WITH vision_recent AS (
            SELECT
                vae.store_id::text AS store_id,
                COUNT(*)::int AS vision_events,
                MAX(vae.ts) AS last_vision_ts
            FROM public.vision_atomic_events vae
            WHERE vae.ts >= %s
              AND vae.ts < %s
            GROUP BY 1
        ),
        first_metrics AS (
            SELECT DISTINCT je.payload->>'store_id' AS store_id
            FROM public.journey_events je
            WHERE je.event_name = 'first_metrics_received'
              AND je.payload ? 'store_id'
        )
        SELECT
            s.id::text AS store_id,
            s.org_id::text AS org_id,
            s.name AS store_name,
            vr.vision_events AS vision_events,
            vr.last_vision_ts AS last_vision_ts
        FROM vision_recent vr
        JOIN public.stores s ON s.id::text = vr.store_id
        LEFT JOIN first_metrics fm ON fm.store_id = vr.store_id
        WHERE fm.store_id IS NULL
    """
    params: list[object] = [start, end]
    if store_id:
        query += " AND s.id::text = %s"
        params.append(store_id)
    query += " ORDER BY vr.vision_events DESC, vr.last_vision_ts DESC LIMIT %s"
    params.append(limit)

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        cols = [col[0] for col in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]


class AdminIngestionFunnelGapView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _assert_internal_admin(user):
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            return
        raise PermissionDenied("Acesso restrito ao time interno (staff/superuser).")

    @staticmethod
    def _serialize_rows(rows):
        payload = []
        for row in rows:
            payload.append(
                {
                    "store_id": str(row.get("store_id")),
                    "org_id": str(row.get("org_id")) if row.get("org_id") else None,
                    "store_name": row.get("store_name"),
                    "vision_events": int(row.get("vision_events") or 0),
                    "last_vision_ts": row.get("last_vision_ts").isoformat() if row.get("last_vision_ts") else None,
                }
            )
        return payload

    @staticmethod
    def _resolve_window_hours(raw_value):
        try:
            value = int(raw_value or 24)
        except Exception:
            value = 24
        return max(1, min(value, 24 * 14))

    @staticmethod
    def _resolve_limit(raw_value):
        try:
            value = int(raw_value or 200)
        except Exception:
            value = 200
        return max(1, min(value, 5000))

    def get(self, request):
        self._assert_internal_admin(request.user)
        window_hours = self._resolve_window_hours(request.query_params.get("window_hours"))
        limit = self._resolve_limit(request.query_params.get("limit"))
        store_id = str(request.query_params.get("store_id") or "").strip() or None
        end = timezone.now()
        start = end - timedelta(hours=window_hours)
        rows = _load_ingestion_funnel_gap_rows(start=start, end=end, store_id=store_id, limit=limit)

        return Response(
            {
                "window_hours": window_hours,
                "from": start.isoformat(),
                "to": end.isoformat(),
                "store_id": store_id,
                "rows_total": len(rows),
                "rows": self._serialize_rows(rows),
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        self._assert_internal_admin(request.user)
        window_hours = self._resolve_window_hours(request.data.get("window_hours"))
        limit = self._resolve_limit(request.data.get("limit"))
        requested_store_id = str(request.data.get("store_id") or "").strip() or None
        end = timezone.now()
        start = end - timedelta(hours=window_hours)
        rows = _load_ingestion_funnel_gap_rows(
            start=start,
            end=end,
            store_id=requested_store_id,
            limit=limit,
        )

        inserted = 0
        repaired_store_ids = []
        for row in rows:
            store_id = str(row.get("store_id"))
            org_id = str(row.get("org_id")) if row.get("org_id") else None
            last_vision_ts = row.get("last_vision_ts")
            event = log_journey_event(
                org_id=org_id,
                event_name="first_metrics_received",
                payload={
                    "store_id": store_id,
                    "ts_bucket": last_vision_ts.isoformat() if last_vision_ts else None,
                    "source": "admin_ingestion_funnel_gap_repair",
                    "window_hours": window_hours,
                },
                source="app",
            )
            if event:
                inserted += 1
                repaired_store_ids.append(store_id)

        return Response(
            {
                "window_hours": window_hours,
                "from": start.isoformat(),
                "to": end.isoformat(),
                "store_id": requested_store_id,
                "candidates_total": len(rows),
                "repaired_total": inserted,
                "repaired_store_ids": repaired_store_ids,
            },
            status=status.HTTP_200_OK,
        )


def _load_pipeline_observability_rows(*, start, end, store_id: str | None = None, limit: int = 200):
    query = """
        WITH receipts AS (
            SELECT
                COALESCE(
                    NULLIF(er.raw->'data'->>'store_id', ''),
                    NULLIF(er.raw->>'store_id', ''),
                    NULLIF(er.meta->>'store_id', '')
                ) AS store_id,
                COALESCE(
                    NULLIF(er.raw->'data'->>'camera_id', ''),
                    NULLIF(er.raw->>'camera_id', ''),
                    NULLIF(er.raw->'data'->>'external_id', ''),
                    NULLIF(er.meta->>'camera_id', ''),
                    'unknown'
                ) AS camera_key,
                COUNT(*)::int AS frames_received,
                COUNT(*) FILTER (
                    WHERE er.processed_at IS NOT NULL
                      AND COALESCE(NULLIF(TRIM(er.last_error), ''), NULL) IS NULL
                )::int AS events_accepted,
                AVG(
                    EXTRACT(EPOCH FROM (COALESCE(er.processed_at, er.updated_at, now()) - er.ts)) * 1000.0
                ) AS latency_ms_avg,
                MAX(er.ts) AS latest_receipt_at
            FROM public.event_receipts er
            WHERE er.ts >= %s
              AND er.ts < %s
              AND er.source = 'edge'
              AND (
                er.event_name LIKE 'vision.%%'
                OR er.event_name = 'retail.event.v1'
                OR er.event_name LIKE 'retail.%%'
                OR er.event_name LIKE 'retail_%%'
              )
            GROUP BY 1, 2
        ),
        vision AS (
            SELECT
                vae.store_id::text AS store_id,
                COALESCE(vae.camera_id::text, 'unknown') AS camera_key,
                COUNT(*)::int AS events_generated,
                MAX(vae.ts) AS latest_vision_at
            FROM public.vision_atomic_events vae
            WHERE vae.ts >= %s
              AND vae.ts < %s
            GROUP BY 1, 2
        )
        SELECT
            COALESCE(r.store_id, v.store_id) AS store_id,
            s.name AS store_name,
            COALESCE(NULLIF(r.camera_key, ''), NULLIF(v.camera_key, ''), 'unknown') AS camera_key,
            c.name AS camera_name,
            COALESCE(r.frames_received, 0) AS frames_received,
            COALESCE(r.events_accepted, 0) AS events_accepted,
            COALESCE(v.events_generated, 0) AS events_generated,
            CASE
                WHEN COALESCE(r.frames_received, 0) > 0
                THEN ROUND(
                    ((COALESCE(r.frames_received, 0) - COALESCE(r.events_accepted, 0))::numeric
                    / COALESCE(r.frames_received, 1)::numeric),
                    4
                )
                ELSE NULL
            END AS drop_rate,
            ROUND(COALESCE(r.latency_ms_avg, 0)::numeric, 2) AS latency_ms_avg,
            GREATEST(COALESCE(r.latest_receipt_at, 'epoch'::timestamp), COALESCE(v.latest_vision_at, 'epoch'::timestamp)) AS latest_event_at
        FROM receipts r
        FULL OUTER JOIN vision v
          ON v.store_id = r.store_id
         AND v.camera_key = r.camera_key
        LEFT JOIN public.stores s
          ON s.id::text = COALESCE(r.store_id, v.store_id)
        LEFT JOIN public.cameras c
          ON c.id::text = COALESCE(NULLIF(r.camera_key, ''), NULLIF(v.camera_key, ''))
        WHERE COALESCE(r.store_id, v.store_id) IS NOT NULL
    """
    params: list[object] = [start, end, start, end]
    if store_id:
        query += " AND COALESCE(r.store_id, v.store_id) = %s"
        params.append(store_id)
    query += """
        ORDER BY
          COALESCE(r.frames_received, 0) DESC,
          COALESCE(v.events_generated, 0) DESC,
          latest_event_at DESC
        LIMIT %s
    """
    params.append(limit)
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        cols = [col[0] for col in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]


class AdminPipelineObservabilityView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _assert_internal_admin(user):
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            return
        raise PermissionDenied("Acesso restrito ao time interno (staff/superuser).")

    @staticmethod
    def _resolve_window_hours(raw_value):
        try:
            value = int(raw_value or 24)
        except Exception:
            value = 24
        return max(1, min(value, 24 * 14))

    @staticmethod
    def _resolve_limit(raw_value):
        try:
            value = int(raw_value or 200)
        except Exception:
            value = 200
        return max(1, min(value, 2000))

    @staticmethod
    def _serialize_rows(rows):
        payload = []
        for row in rows:
            frames_received = int(row.get("frames_received") or 0)
            events_accepted = int(row.get("events_accepted") or 0)
            events_generated = int(row.get("events_generated") or 0)
            drop_rate = row.get("drop_rate")
            payload.append(
                {
                    "store_id": str(row.get("store_id")) if row.get("store_id") else None,
                    "store_name": row.get("store_name"),
                    "camera_id": str(row.get("camera_key")) if row.get("camera_key") else None,
                    "camera_name": row.get("camera_name"),
                    "frames_received": frames_received,
                    "events_accepted": events_accepted,
                    "events_generated": events_generated,
                    "drop_rate": float(drop_rate) if drop_rate is not None else None,
                    "latency_ms_avg": float(row.get("latency_ms_avg") or 0),
                    "latest_event_at": row.get("latest_event_at").isoformat() if row.get("latest_event_at") else None,
                }
            )
        return payload

    def get(self, request):
        self._assert_internal_admin(request.user)
        window_hours = self._resolve_window_hours(request.query_params.get("window_hours"))
        limit = self._resolve_limit(request.query_params.get("limit"))
        store_id = str(request.query_params.get("store_id") or "").strip() or None
        end = timezone.now()
        start = end - timedelta(hours=window_hours)
        rows = _load_pipeline_observability_rows(start=start, end=end, store_id=store_id, limit=limit)
        serialized = self._serialize_rows(rows)

        frames_received_total = sum(item["frames_received"] for item in serialized)
        events_accepted_total = sum(item["events_accepted"] for item in serialized)
        events_generated_total = sum(item["events_generated"] for item in serialized)
        drop_rate_total = (
            round((frames_received_total - events_accepted_total) / frames_received_total, 4)
            if frames_received_total > 0
            else None
        )
        latency_values = [item["latency_ms_avg"] for item in serialized if item["latency_ms_avg"] > 0]
        latency_ms_avg = round(sum(latency_values) / len(latency_values), 2) if latency_values else None

        return Response(
            {
                "window_hours": window_hours,
                "from": start.isoformat(),
                "to": end.isoformat(),
                "store_id": store_id,
                "totals": {
                    "rows_total": len(serialized),
                    "frames_received": frames_received_total,
                    "events_accepted": events_accepted_total,
                    "events_generated": events_generated_total,
                    "drop_rate": drop_rate_total,
                    "latency_ms_avg": latency_ms_avg,
                },
                "rows": serialized,
            },
            status=status.HTTP_200_OK,
        )


def _load_cv_quality_baseline_rows(*, start, end, store_id: str | None = None, limit: int = 300):
    query = """
        SELECT
            ca.store_id::text AS store_id,
            s.name AS store_name,
            ca.camera_id::text AS camera_id,
            c.name AS camera_name,
            cr.metric_name AS metric_name,
            COUNT(*)::int AS samples_total,
            COUNT(*) FILTER (WHERE cr.passed = TRUE)::int AS passed_total,
            AVG(cr.delta_value) AS avg_delta,
            MAX(COALESCE(cr.validated_at, cr.updated_at, cr.created_at)) AS latest_validated_at
        FROM public.calibration_results cr
        JOIN public.calibration_actions ca ON ca.id = cr.action_id
        LEFT JOIN public.stores s ON s.id = ca.store_id
        LEFT JOIN public.cameras c ON c.id = ca.camera_id
        WHERE COALESCE(cr.validated_at, cr.updated_at, cr.created_at) >= %s
          AND COALESCE(cr.validated_at, cr.updated_at, cr.created_at) < %s
    """
    params: list[object] = [start, end]
    if store_id:
        query += " AND ca.store_id::text = %s"
        params.append(store_id)
    query += """
        GROUP BY 1,2,3,4,5
        ORDER BY samples_total DESC, latest_validated_at DESC
        LIMIT %s
    """
    params.append(limit)
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        cols = [col[0] for col in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]


class AdminCvQualityBaselineView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _assert_internal_admin(user):
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            return
        raise PermissionDenied("Acesso restrito ao time interno (staff/superuser).")

    @staticmethod
    def _resolve_period(raw_period: str | None):
        period = str(raw_period or "7d").strip().lower()
        now = timezone.now()
        if period == "30d":
            return now - timedelta(days=30), now, "30d"
        return now - timedelta(days=7), now, "7d"

    @staticmethod
    def _resolve_limit(raw_value):
        try:
            value = int(raw_value or 300)
        except Exception:
            value = 300
        return max(1, min(value, 2000))

    @staticmethod
    def _serialize_rows(rows):
        payload = []
        for row in rows:
            samples_total = int(row.get("samples_total") or 0)
            passed_total = int(row.get("passed_total") or 0)
            pass_rate = round((passed_total / samples_total), 4) if samples_total > 0 else None
            payload.append(
                {
                    "store_id": str(row.get("store_id")) if row.get("store_id") else None,
                    "store_name": row.get("store_name"),
                    "camera_id": str(row.get("camera_id")) if row.get("camera_id") else None,
                    "camera_name": row.get("camera_name"),
                    "metric_name": row.get("metric_name"),
                    "samples_total": samples_total,
                    "passed_total": passed_total,
                    "pass_rate": pass_rate,
                    "avg_delta": float(row.get("avg_delta")) if row.get("avg_delta") is not None else None,
                    "latest_validated_at": row.get("latest_validated_at").isoformat() if row.get("latest_validated_at") else None,
                }
            )
        return payload

    def get(self, request):
        self._assert_internal_admin(request.user)
        start, end, period = self._resolve_period(request.query_params.get("period"))
        store_id = str(request.query_params.get("store_id") or "").strip() or None
        limit = self._resolve_limit(request.query_params.get("limit"))
        rows = _load_cv_quality_baseline_rows(start=start, end=end, store_id=store_id, limit=limit)
        serialized = self._serialize_rows(rows)

        samples_total = sum(item["samples_total"] for item in serialized)
        passed_total = sum(item["passed_total"] for item in serialized)
        pass_rate = round((passed_total / samples_total), 4) if samples_total > 0 else None
        avg_delta_values = [item["avg_delta"] for item in serialized if item["avg_delta"] is not None]
        avg_delta = round(sum(avg_delta_values) / len(avg_delta_values), 4) if avg_delta_values else None

        return Response(
            {
                "period": period,
                "from": start.isoformat(),
                "to": end.isoformat(),
                "store_id": store_id,
                "totals": {
                    "rows_total": len(serialized),
                    "samples_total": samples_total,
                    "passed_total": passed_total,
                    "pass_rate": pass_rate,
                    "avg_delta": avg_delta,
                },
                "rows": serialized,
            },
            status=status.HTTP_200_OK,
        )


def _compute_release_gate_summary():
    now = timezone.now()
    start_30d = now - timedelta(days=30)
    start_24h = now - timedelta(hours=24)

    with connection.cursor() as cursor:
        # Check 1: critical null rate on mandatory fields.
        cursor.execute(
            """
            WITH journey AS (
                SELECT
                  COUNT(*) FILTER (WHERE event_name = 'signup_completed')::int AS signup_count,
                  COUNT(*) FILTER (
                    WHERE event_name = 'signup_completed'
                      AND COALESCE(NULLIF(TRIM(payload->>'user_id'), ''), NULL) IS NULL
                  )::int AS signup_missing_user_id,
                  COUNT(*) FILTER (WHERE event_name = 'store_created')::int AS store_count,
                  COUNT(*) FILTER (
                    WHERE event_name = 'store_created'
                      AND COALESCE(NULLIF(TRIM(payload->>'store_id'), ''), NULL) IS NULL
                  )::int AS store_missing_store_id,
                  COUNT(*) FILTER (WHERE event_name = 'camera_added')::int AS camera_count,
                  COUNT(*) FILTER (
                    WHERE event_name = 'camera_added'
                      AND (
                        COALESCE(NULLIF(TRIM(payload->>'store_id'), ''), NULL) IS NULL
                        OR COALESCE(NULLIF(TRIM(payload->>'camera_id'), ''), NULL) IS NULL
                      )
                  )::int AS camera_missing_required,
                  COUNT(*) FILTER (WHERE event_name = 'roi_saved')::int AS roi_count,
                  COUNT(*) FILTER (
                    WHERE event_name = 'roi_saved'
                      AND (
                        COALESCE(NULLIF(TRIM(payload->>'store_id'), ''), NULL) IS NULL
                        OR COALESCE(NULLIF(TRIM(payload->>'camera_id'), ''), NULL) IS NULL
                        OR COALESCE(NULLIF(TRIM(payload->>'roi_version'), ''), NULL) IS NULL
                      )
                  )::int AS roi_missing_required,
                  COUNT(*) FILTER (WHERE event_name = 'first_metrics_received')::int AS first_metrics_count,
                  COUNT(*) FILTER (
                    WHERE event_name = 'first_metrics_received'
                      AND COALESCE(NULLIF(TRIM(payload->>'store_id'), ''), NULL) IS NULL
                  )::int AS first_metrics_missing_store_id
                FROM public.journey_events
                WHERE created_at >= %s
            ),
            conversion AS (
                SELECT
                  COUNT(*)::int AS rows_total,
                  COUNT(*) FILTER (
                    WHERE COALESCE(NULLIF(TRIM(metric_type::text), ''), NULL) IS NULL
                  )::int AS metric_type_missing,
                  COUNT(*) FILTER (
                    WHERE COALESCE(NULLIF(TRIM(roi_entity_id::text), ''), NULL) IS NULL
                  )::int AS roi_entity_missing
                FROM public.conversion_metrics
                WHERE ts_bucket >= %s
            ),
            traffic AS (
                SELECT
                  COUNT(*)::int AS rows_total,
                  COUNT(*) FILTER (
                    WHERE COALESCE(NULLIF(TRIM(camera_role::text), ''), NULL) IS NULL
                  )::int AS camera_role_missing,
                  COUNT(*) FILTER (
                    WHERE COALESCE(NULLIF(TRIM(ownership::text), ''), NULL) IS NULL
                  )::int AS ownership_missing
                FROM public.traffic_metrics
                WHERE ts_bucket >= %s
            )
            SELECT
              -- samples
              (
                j.signup_count
                + j.store_count
                + (j.camera_count * 2)
                + (j.roi_count * 3)
                + j.first_metrics_count
                + (c.rows_total * 2)
                + (t.rows_total * 2)
              )::bigint AS critical_samples,
              -- missing
              (
                j.signup_missing_user_id
                + j.store_missing_store_id
                + j.camera_missing_required
                + j.roi_missing_required
                + j.first_metrics_missing_store_id
                + c.metric_type_missing
                + c.roi_entity_missing
                + t.camera_role_missing
                + t.ownership_missing
              )::bigint AS critical_missing
            FROM journey j
            CROSS JOIN conversion c
            CROSS JOIN traffic t
            """,
            [start_30d, start_30d, start_30d],
        )
        critical_row = cursor.fetchone() or [0, 0]
        critical_samples = int(critical_row[0] or 0)
        critical_missing = int(critical_row[1] or 0)
        null_rate_critical = (critical_missing / critical_samples) if critical_samples > 0 else None

        # Check 2: pipeline success in last 24h.
        cursor.execute(
            """
            SELECT
              COUNT(*)::int AS received_total,
              COUNT(*) FILTER (
                WHERE processed_at IS NOT NULL
                  AND COALESCE(NULLIF(TRIM(last_error), ''), NULL) IS NULL
              )::int AS accepted_total
            FROM public.event_receipts
            WHERE source = 'edge'
              AND ts >= %s
              AND (
                event_name LIKE 'vision.%%'
                OR event_name = 'retail.event.v1'
                OR event_name LIKE 'retail.%%'
                OR event_name LIKE 'retail_%%'
              )
            """,
            [start_24h],
        )
        pipeline_row = cursor.fetchone() or [0, 0]
        received_total = int(pipeline_row[0] or 0)
        accepted_total = int(pipeline_row[1] or 0)
        pipeline_success = (accepted_total / received_total) if received_total > 0 else None

        # Check 3: funnel non-zero on active stores with signal.
        cursor.execute(
            """
            WITH active_signal_stores AS (
                SELECT DISTINCT s.id::text AS store_id
                FROM public.stores s
                LEFT JOIN public.vision_atomic_events vae
                  ON vae.store_id::text = s.id::text
                 AND vae.ts >= %s
                WHERE s.status IN ('active', 'trial')
                  AND (
                    s.last_seen_at >= %s
                    OR vae.store_id IS NOT NULL
                  )
            ),
            funnel_stores AS (
                SELECT DISTINCT je.payload->>'store_id' AS store_id
                FROM public.journey_events je
                WHERE je.event_name = 'first_metrics_received'
                  AND je.created_at >= %s
                  AND je.payload ? 'store_id'
            )
            SELECT
              (SELECT COUNT(*)::int FROM active_signal_stores) AS active_signal_total,
              (
                SELECT COUNT(*)::int
                FROM active_signal_stores a
                JOIN funnel_stores f ON f.store_id = a.store_id
              ) AS active_with_funnel_total
            """,
            [start_24h, start_24h, start_30d],
        )
        funnel_row = cursor.fetchone() or [0, 0]
        active_signal_total = int(funnel_row[0] or 0)
        active_with_funnel_total = int(funnel_row[1] or 0)

    thresholds = {
        "null_rate_critical_max": 0.02,
        "pipeline_success_min": 0.99,
    }
    checks = {
        "null_rate_critical": {
            "value": null_rate_critical,
            "threshold": thresholds["null_rate_critical_max"],
            "operator": "<=",
            "pass": bool(null_rate_critical is not None and null_rate_critical <= thresholds["null_rate_critical_max"]),
            "samples": critical_samples,
            "missing": critical_missing,
        },
        "pipeline_success": {
            "value": pipeline_success,
            "threshold": thresholds["pipeline_success_min"],
            "operator": ">=",
            "pass": bool(pipeline_success is not None and pipeline_success >= thresholds["pipeline_success_min"]),
            "received_total": received_total,
            "accepted_total": accepted_total,
        },
        "funnel_non_zero_active_store": {
            "value": active_with_funnel_total,
            "threshold": active_signal_total,
            "operator": "==",
            "pass": bool(active_signal_total > 0 and active_with_funnel_total >= active_signal_total),
            "active_signal_total": active_signal_total,
            "active_with_funnel_total": active_with_funnel_total,
        },
    }
    overall_pass = bool(
        checks["null_rate_critical"]["pass"]
        and checks["pipeline_success"]["pass"]
        and checks["funnel_non_zero_active_store"]["pass"]
    )
    return {
        "generated_at": now.isoformat(),
        "window": {
            "from_30d": start_30d.isoformat(),
            "from_24h": start_24h.isoformat(),
            "to": now.isoformat(),
        },
        "thresholds": thresholds,
        "checks": checks,
        "overall_pass": overall_pass,
        "status": "go" if overall_pass else "no_go",
    }


class AdminReleaseGateView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _assert_internal_admin(user):
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            return
        raise PermissionDenied("Acesso restrito ao time interno (staff/superuser).")

    def get(self, request):
        self._assert_internal_admin(request.user)
        payload = _compute_release_gate_summary()
        return Response(payload, status=status.HTTP_200_OK)
