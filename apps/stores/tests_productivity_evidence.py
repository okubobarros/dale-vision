from datetime import datetime
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.stores.views import StoreViewSet


class StoreProductivityEvidenceTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True, is_staff=False, is_superuser=False)
        self.store = MagicMock()
        self.store.id = "11111111-1111-1111-1111-111111111111"
        self.store.org_id = "org-1"
        self.store.name = "Loja Teste"

    def _call_view(self, hour_bucket: str):
        view = StoreViewSet.as_view({"get": "productivity_evidence"})
        request = self.factory.get(
            f"/api/v1/stores/{self.store.id}/productivity/evidence/",
            {"hour_bucket": hour_bucket},
        )
        force_authenticate(request, user=self.user)
        return view(request, pk=self.store.id)

    @patch("apps.stores.views._get_org_timezone")
    @patch("apps.stores.views.StoreViewSet._require_subscription_for_store")
    @patch("apps.stores.views.require_store_role")
    @patch("apps.stores.views.StoreViewSet.get_object")
    @patch("apps.stores.views.DetectionEvent")
    def test_evidence_response(self, detection_model, get_object_mock, _require_role, _require_sub, _tz):
        get_object_mock.return_value = self.store
        _tz.return_value = datetime.now().astimezone().tzinfo

        detection_model.objects.filter.return_value.order_by.return_value.values.return_value = [
            {
                "id": "event-1",
                "title": "Evento teste",
                "severity": "warning",
                "status": "open",
                "occurred_at": datetime(2026, 2, 27, 10, 30, 0),
                "camera_id": None,
                "zone_id": None,
                "metadata": {},
                "type": "idle",
            }
        ]

        response = self._call_view("2026-02-27T10:00:00-03:00")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("store_id"), str(self.store.id))
        self.assertEqual(len(response.data.get("events", [])), 1)
