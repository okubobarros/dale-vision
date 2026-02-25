from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from unittest.mock import patch, MagicMock

from apps.core.views import StorageStatusView

class StorageStatusViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_storage_status_requires_staff(self):
        view = StorageStatusView.as_view({"get": "list"})
        request = self.factory.get("/api/v1/system/storage-status/")
        force_authenticate(request, user=MagicMock(is_authenticated=True, is_staff=False, is_superuser=False))

        response = view(request)

        self.assertEqual(response.status_code, 403)

    @patch("apps.core.views.supabase_storage.get_config_status", return_value={
        "configured": True,
        "bucket": "camera-snapshots",
        "supabase_url_present": True,
        "service_role_present": True,
    })
    def test_storage_status_returns_flags_for_staff(self, _status_mock):
        view = StorageStatusView.as_view({"get": "list"})
        request = self.factory.get("/api/v1/system/storage-status/")
        force_authenticate(request, user=MagicMock(is_authenticated=True, is_staff=True, is_superuser=False))

        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("configured"))
        self.assertEqual(response.data.get("bucket"), "camera-snapshots")
