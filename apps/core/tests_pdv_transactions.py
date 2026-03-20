from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views import PdvTransactionIngestView, PdvTransactionSummaryView


class PdvTransactionIngestViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = PdvTransactionIngestView.as_view()
        self.user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=123)

    @patch("apps.core.views.models.Store.objects.filter")
    @patch("apps.core.views.get_user_org_ids", return_value=["org-1"])
    @patch("apps.core.views.models.PosTransactionEvent.objects.get_or_create")
    def test_ingest_creates_transaction(
        self,
        get_or_create_mock: MagicMock,
        _org_ids_mock: MagicMock,
        store_filter_mock: MagicMock,
    ):
        store = SimpleNamespace(id="store-1", org_id="org-1")
        event = SimpleNamespace(
            id="evt-1",
            source_system="linx",
            transaction_id="tx-123",
            occurred_at=datetime(2026, 3, 19, 15, 30, tzinfo=dt_timezone.utc),
            gross_amount=Decimal("129.90"),
            net_amount=Decimal("120.00"),
            currency="BRL",
            payment_method="credit_card",
        )
        store_filter_mock.return_value.first.return_value = store
        get_or_create_mock.return_value = (event, True)

        request = self.factory.post(
            "/api/v1/integration/pdv/events/",
            {
                "store_id": "store-1",
                "source_system": "linx",
                "transaction_id": "tx-123",
                "occurred_at": "2026-03-19T15:30:00Z",
                "gross_amount": 129.90,
                "net_amount": 120.00,
                "currency": "brl",
                "payment_method": "credit_card",
                "metadata": {"operator": "caixa-1"},
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = self.view(request)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["ok"])
        self.assertTrue(response.data["created"])
        self.assertEqual(response.data["store_id"], "store-1")
        self.assertEqual(response.data["source_system"], "linx")
        self.assertEqual(response.data["transaction_id"], "tx-123")
        self.assertEqual(response.data["gross_amount"], 129.9)

    def test_ingest_requires_required_fields(self):
        request = self.factory.post(
            "/api/v1/integration/pdv/events/",
            {
                "store_id": "store-1",
                "source_system": "linx",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = self.view(request)
        self.assertEqual(response.status_code, 400)

    @patch("apps.core.views.models.Store.objects.filter")
    @patch("apps.core.views.get_user_org_ids", return_value=["org-1"])
    @patch("apps.core.views.models.PosTransactionEvent.objects.get_or_create")
    def test_ingest_updates_existing_transaction(
        self,
        get_or_create_mock: MagicMock,
        _org_ids_mock: MagicMock,
        store_filter_mock: MagicMock,
    ):
        store = SimpleNamespace(id="store-1", org_id="org-1")
        record = MagicMock()
        record.id = "evt-2"
        record.source_system = "linx"
        record.transaction_id = "tx-999"
        record.occurred_at = datetime(2026, 3, 19, 16, 0, tzinfo=dt_timezone.utc)
        record.gross_amount = Decimal("49.90")
        record.net_amount = Decimal("45.00")
        record.currency = "BRL"
        record.payment_method = "pix"
        store_filter_mock.return_value.first.return_value = store
        get_or_create_mock.return_value = (record, False)

        request = self.factory.post(
            "/api/v1/integration/pdv/events/",
            {
                "store_id": "store-1",
                "source_system": "linx",
                "transaction_id": "tx-999",
                "occurred_at": "2026-03-19T16:00:00Z",
                "gross_amount": 49.90,
                "net_amount": 45.00,
                "currency": "BRL",
                "payment_method": "pix",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["created"])
        self.assertEqual(response.data["transaction_id"], "tx-999")
        record.save.assert_called_once()


class PdvTransactionSummaryViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = PdvTransactionSummaryView.as_view()
        self.user = SimpleNamespace(is_authenticated=True, is_staff=False, is_superuser=False, id=123)

    @patch("apps.core.views.get_user_org_ids", return_value=["org-1"])
    @patch("apps.core.views.models.PosTransactionEvent.objects.filter")
    def test_summary_returns_aggregates_for_org_scope(
        self,
        pos_filter_mock: MagicMock,
        _org_ids_mock: MagicMock,
    ):
        qs = MagicMock()
        qs.filter.return_value = qs
        qs.aggregate.return_value = {
            "transactions_total": 10,
            "gross_total": Decimal("1000.00"),
            "net_total": Decimal("950.00"),
            "stores_total": 2,
        }
        pos_filter_mock.return_value = qs

        request = self.factory.get("/api/v1/integration/pdv/summary/?period=30d")
        force_authenticate(request, user=self.user)

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["period"], "30d")
        self.assertEqual(response.data["transactions_total"], 10)
        self.assertEqual(response.data["gross_total"], 1000.0)
        self.assertEqual(response.data["net_total"], 950.0)
        self.assertEqual(response.data["avg_ticket"], 100.0)
        qs.filter.assert_any_call(org_id__in={"org-1"})
