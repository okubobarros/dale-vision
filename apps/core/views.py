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
