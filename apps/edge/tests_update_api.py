from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.edge.views_update import EdgeUpdatePolicyView, EdgeUpdateReportView


class EdgeUpdatePolicyViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = EdgeUpdatePolicyView.as_view()

    @patch("apps.edge.views_update.authenticate_edge_token")
    def test_get_returns_401_when_token_invalid(self, mock_auth):
        mock_auth.return_value = SimpleNamespace(
            ok=False, status_code=401, code="edge_token_invalid", detail="Edge token inválido."
        )
        request = self.factory.get("/api/edge/update-policy/", HTTP_X_EDGE_TOKEN="invalid")
        response = self.view(request)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "edge_token_invalid")

    @patch("apps.edge.views_update.EdgeUpdatePolicy.objects.filter")
    @patch("apps.edge.views_update.authenticate_edge_token")
    def test_get_returns_default_policy_when_not_configured(self, mock_auth, mock_filter):
        store_id = str(uuid4())
        mock_auth.return_value = SimpleNamespace(ok=True, status_code=200, store_id=store_id)
        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.first.return_value = None
        mock_filter.return_value = qs
        request = self.factory.get("/api/edge/update-policy/", HTTP_X_EDGE_TOKEN="valid", HTTP_X_AGENT_ID="edge-1")
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["store_id"], store_id)
        self.assertEqual(response.data["channel"], "stable")
        self.assertIsNone(response.data["target_version"])

    @patch("apps.edge.views_update.EdgeUpdatePolicy.objects.filter")
    @patch("apps.edge.views_update.authenticate_edge_token")
    def test_get_returns_configured_policy(self, mock_auth, mock_filter):
        store_id = str(uuid4())
        mock_auth.return_value = SimpleNamespace(ok=True, status_code=200, store_id=store_id)
        policy = SimpleNamespace(
            channel="canary",
            target_version="1.4.2",
            current_min_supported="1.3.0",
            rollout_start_local="01:00",
            rollout_end_local="04:00",
            rollout_timezone="America/Sao_Paulo",
            package_url="https://cdn/pkg.zip",
            package_sha256="abc123",
            package_size_bytes=100,
            health_max_boot_seconds=100,
            health_require_heartbeat_seconds=120,
            health_require_camera_health_count=3,
            rollback_enabled=True,
            rollback_max_failed_attempts=1,
        )
        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.first.return_value = policy
        mock_filter.return_value = qs
        request = self.factory.get("/api/edge/update-policy/", HTTP_X_EDGE_TOKEN="valid")
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["channel"], "canary")
        self.assertEqual(response.data["target_version"], "1.4.2")
        self.assertEqual(response.data["package"]["sha256"], "abc123")


class EdgeUpdateReportViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = EdgeUpdateReportView.as_view()

    @patch("apps.edge.views_update.authenticate_edge_token")
    def test_post_returns_401_when_token_invalid(self, mock_auth):
        mock_auth.return_value = SimpleNamespace(
            ok=False, status_code=401, code="edge_token_invalid", detail="Edge token inválido."
        )
        request = self.factory.post(
            "/api/edge/update-report/",
            {"event": "edge_update_started", "status": "started"},
            format="json",
            HTTP_X_EDGE_TOKEN="invalid",
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 401)

    def test_post_returns_400_for_invalid_payload(self):
        request = self.factory.post("/api/edge/update-report/", {"status": "started"}, format="json")
        response = self.view(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn("errors", response.data)

    @patch("apps.edge.views_update.EdgeUpdateEvent.objects.create")
    @patch("apps.edge.views_update.authenticate_edge_token")
    def test_post_creates_update_event(self, mock_auth, mock_create):
        store_id = str(uuid4())
        mock_auth.return_value = SimpleNamespace(ok=True, status_code=200, store_id=store_id)
        mock_create.return_value = SimpleNamespace(id=uuid4(), status="healthy")

        request = self.factory.post(
            "/api/edge/update-report/",
            {
                "store_id": store_id,
                "agent_id": "edge-1",
                "event": "edge_update_healthy",
                "status": "healthy",
                "phase": "health_check",
            },
            format="json",
            HTTP_X_EDGE_TOKEN="valid",
        )
        response = self.view(request)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["store_id"], store_id)
        mock_create.assert_called_once()
