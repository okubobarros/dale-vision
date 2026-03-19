from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.views import PdvIntegrationInterestView


class PdvIntegrationInterestViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = PdvIntegrationInterestView.as_view()
        self.user = SimpleNamespace(is_authenticated=True, id=123)

    @patch("apps.core.views.models.PdvIntegrationInterest.objects.create")
    @patch("apps.core.views.models.Store.objects.filter")
    def test_create_interest_ok(self, filter_store: MagicMock, create_interest: MagicMock):
        fake_store = SimpleNamespace(id="store-1")
        fake_record = SimpleNamespace(
            id="interest-1",
            status="requested",
            pdv_system="linx",
            contact_email="owner@example.com",
            contact_phone="5511999999999",
            created_at=SimpleNamespace(isoformat=lambda: "2026-03-19T10:00:00+00:00"),
        )
        filter_store.return_value.first.return_value = fake_store
        create_interest.return_value = fake_record

        request = self.factory.post(
            "/api/v1/integration/pdv/interest/",
            {
                "store_id": "store-1",
                "pdv_system": "linx",
                "contact_email": "owner@example.com",
                "contact_phone": "5511999999999",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = self.view(request)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "requested")
        self.assertEqual(response.data["store_id"], "store-1")

    def test_create_interest_requires_fields(self):
        request = self.factory.post(
            "/api/v1/integration/pdv/interest/",
            {"store_id": "store-1"},
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = self.view(request)
        self.assertEqual(response.status_code, 400)
