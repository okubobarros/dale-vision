from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.copilot.views import CopilotStoreProfileView


class CopilotStoreProfileViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CopilotStoreProfileView.as_view()

    @patch("apps.copilot.views.StoreProfile.objects.filter")
    @patch("apps.copilot.views.require_store_role")
    @patch("apps.copilot.views._get_store_or_404")
    def test_get_returns_default_payload_when_profile_is_missing(
        self,
        mock_get_store,
        _mock_require_role,
        mock_filter,
    ):
        store_id = uuid4()
        store = SimpleNamespace(id=store_id, org_id=uuid4())
        mock_get_store.return_value = (store, None)
        mock_filter.return_value.first.return_value = None

        request = self.factory.get(f"/api/v1/copilot/stores/{store_id}/profile/")
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))

        response = self.view(request, store_id=store_id)
        assert response.status_code == 200
        assert response.data["store_id"] == str(store_id)
        assert response.data["business_model"] == "default"
        assert response.data["timezone"] == "America/Sao_Paulo"

    @patch("apps.copilot.views.StoreProfileSerializer")
    @patch("apps.copilot.views.StoreProfile.objects.filter")
    @patch("apps.copilot.views.require_store_role")
    @patch("apps.copilot.views._get_store_or_404")
    def test_patch_updates_existing_profile(
        self,
        mock_get_store,
        _mock_require_role,
        mock_filter,
        mock_serializer_cls,
    ):
        store_id = uuid4()
        org_id = uuid4()
        store = SimpleNamespace(id=store_id, org_id=org_id)
        row = SimpleNamespace(
            business_model="default",
            has_salao=False,
            has_pos_integration=False,
            opening_hours_json={},
            timezone_name="America/Sao_Paulo",
            defaults_json={},
            save=MagicMock(),
        )
        mock_get_store.return_value = (store, None)
        mock_filter.return_value.first.return_value = row

        input_serializer = MagicMock()
        input_serializer.validated_data = {
            "business_model": "cafe",
            "has_salao": True,
            "has_pos_integration": True,
            "opening_hours_json": {"monday": {"open": "08:00", "close": "18:00"}},
            "timezone_name": "America/Sao_Paulo",
            "defaults_json": {"ticket_medio_brl": 30},
        }
        output_serializer = MagicMock()
        output_serializer.data = {
            "store_id": str(store_id),
            "business_model": "cafe",
            "has_salao": True,
            "has_pos_integration": True,
        }
        mock_serializer_cls.side_effect = [input_serializer, output_serializer]

        request = self.factory.patch(
            f"/api/v1/copilot/stores/{store_id}/profile/",
            {"business_model": "cafe", "has_salao": True, "has_pos_integration": True},
            format="json",
        )
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True))

        response = self.view(request, store_id=store_id)
        assert response.status_code == 200
        assert response.data["business_model"] == "cafe"
        assert row.business_model == "cafe"
        assert row.has_salao is True
        assert row.has_pos_integration is True
        row.save.assert_called_once()
