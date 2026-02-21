import hashlib
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from django.test import TestCase
from django.http import Http404
from django.test import override_settings
from django.db import connection
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.exceptions import PermissionDenied
from knox.models import AuthToken
from apps.edge.models import EdgeToken


class EdgeEventsAuthTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        if connection.vendor != "postgresql":
            return
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.user_id_map (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    django_user_id int NOT NULL UNIQUE,
                    user_uuid uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
                    created_at timestamptz DEFAULT now()
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.organizations (
                    id uuid PRIMARY KEY,
                    name text,
                    segment text,
                    country text,
                    timezone text,
                    created_at timestamptz
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.org_members (
                    id uuid PRIMARY KEY,
                    org_id uuid,
                    user_id uuid,
                    role text,
                    created_at timestamptz
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.stores (
                    id uuid PRIMARY KEY,
                    org_id uuid,
                    name text,
                    status text,
                    created_at timestamptz,
                    updated_at timestamptz
                );
                """
            )

    def setUp(self):
        self.client = APIClient()
        self._store_filter_patcher = patch("apps.edge.views.Store.objects.filter")
        self._store_filter_mock = self._store_filter_patcher.start()
        self.addCleanup(self._store_filter_patcher.stop)
        qs = MagicMock()
        qs.exists.return_value = False
        qs.first.return_value = None
        self._store_filter_mock.return_value = qs

    def _skip_if_not_pg(self):
        if connection.vendor != "postgresql":
            self.skipTest("Requires PostgreSQL for unmanaged models.")

    def _create_edge_token(self, store_id: uuid.UUID, raw_token: str) -> EdgeToken:
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        return EdgeToken.objects.create(store_id=store_id, token_hash=token_hash, active=True)

    @override_settings(DEBUG=True, EDGE_SHARED_TOKEN="edge-shared")
    def test_edge_token_allows_event(self):
        self._skip_if_not_pg()
        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-1",
            "data": {"store_id": str(uuid.uuid4())},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_X_EDGE_TOKEN="edge-shared",
        )
        self.assertIn(resp.status_code, (200, 201))
        self.assertTrue(resp.data.get("ok"))

    def test_edge_store_token_allows_event(self):
        self._skip_if_not_pg()
        store_id = uuid.uuid4()
        token = "edge-store-token"
        self._create_edge_token(store_id, token)
        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-store-1",
            "data": {"store_id": str(store_id)},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_X_EDGE_TOKEN=token,
        )
        self.assertIn(resp.status_code, (200, 201))
        self.assertTrue(resp.data.get("ok"))

    def test_user_token_allows_event_with_access(self):
        self._skip_if_not_pg()
        User = get_user_model()
        user = User.objects.create_user(username="edgeuser", password="pass123", email="edge@x.com")
        token = AuthToken.objects.create(user)[1]
        store_id = uuid.uuid4()

        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-2",
            "data": {"store_id": str(store_id)},
        }
        with patch(
            "apps.edge.views.EdgeEventsIngestView._user_has_store_access",
            return_value=True,
        ):
            resp = self.client.post(
                "/api/edge/events/",
                payload,
                format="json",
                HTTP_AUTHORIZATION=f"Token {token}",
            )
        self.assertIn(resp.status_code, (200, 201))
        self.assertTrue(resp.data.get("ok"))

    def test_edge_event_stored_true_generates_receipt(self):
        self._skip_if_not_pg()
        store_id = uuid.uuid4()
        token = "edge-store-token-2"
        self._create_edge_token(store_id, token)
        payload = {
            "event_name": "edge_heartbeat",
            "data": {"store_id": str(store_id)},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_X_EDGE_TOKEN=token,
        )
        self.assertIn(resp.status_code, (200, 201))
        self.assertTrue(resp.data.get("ok"))
        self.assertTrue(resp.data.get("stored"))
        self.assertTrue(resp.data.get("receipt_id"))


class EdgeSetupTokenTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        if connection.vendor != "postgresql":
            return
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.organizations (
                    id uuid PRIMARY KEY,
                    name text,
                    segment text,
                    country text,
                    timezone text,
                    created_at timestamptz
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.org_members (
                    id uuid PRIMARY KEY,
                    org_id uuid,
                    user_id uuid,
                    role text,
                    created_at timestamptz
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.stores (
                    id uuid PRIMARY KEY,
                    org_id uuid,
                    name text,
                    status text,
                    created_at timestamptz,
                    updated_at timestamptz
                );
                """
            )

    def setUp(self):
        self.client = APIClient()
        self._store_filter_patcher = patch("apps.edge.views.Store.objects.filter")
        self._store_filter_mock = self._store_filter_patcher.start()
        self.addCleanup(self._store_filter_patcher.stop)
        qs = MagicMock()
        qs.exists.return_value = False
        qs.first.return_value = None
        self._store_filter_mock.return_value = qs

    def _skip_if_not_pg(self):
        if connection.vendor != "postgresql":
            self.skipTest("Requires PostgreSQL for unmanaged models.")

    def _create_staff_user(self):
        User = get_user_model()
        user = User.objects.create_user(username="staff", password="pass123", email="staff@x.com")
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=["is_staff", "is_superuser"])
        return user

    def _store_stub(self):
        return SimpleNamespace(id=uuid.uuid4(), org_id=uuid.uuid4())

    def test_edge_setup_get_idempotent(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        store = self._store_stub()
        self.client.force_authenticate(user=user)

        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store):
            resp1 = self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
        self.assertEqual(resp1.status_code, 200)
        first_token = resp1.data.get("edge_token")
        self.assertTrue(first_token)
        tokens = EdgeToken.objects.filter(store_id=store.id, active=True)
        self.assertEqual(tokens.count(), 1)
        token_hash = tokens.first().token_hash

        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store):
            resp2 = self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.data.get("edge_token"), first_token)
        self.assertTrue(resp2.data.get("has_active_token"))
        tokens = EdgeToken.objects.filter(store_id=store.id, active=True)
        self.assertEqual(tokens.count(), 1)
        self.assertEqual(tokens.first().token_hash, token_hash)

    def test_edge_token_rotate_invalidates_previous_token(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        store = self._store_stub()
        self.client.force_authenticate(user=user)

        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store):
            first_setup = self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
        self.assertEqual(first_setup.status_code, 200)
        old_token = first_setup.data.get("edge_token")
        self.assertTrue(old_token)

        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store):
            resp = self.client.post(f"/api/v1/stores/{store.id}/edge-token/rotate/")
        self.assertEqual(resp.status_code, 200)
        new_token = resp.data.get("edge_token")
        self.assertTrue(new_token)
        self.assertNotEqual(old_token, new_token)

        active_tokens = EdgeToken.objects.filter(store_id=store.id, active=True)
        self.assertEqual(active_tokens.count(), 1)
        self.assertEqual(active_tokens.first().token_plaintext, new_token)

        inactive_tokens = EdgeToken.objects.filter(store_id=store.id, active=False)
        self.assertEqual(inactive_tokens.count(), 1)
        self.assertEqual(inactive_tokens.first().token_plaintext, old_token)

        old_payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-old-token",
            "data": {"store_id": str(store.id)},
        }
        old_resp = self.client.post(
            "/api/edge/events/",
            old_payload,
            format="json",
            HTTP_X_EDGE_TOKEN=old_token,
        )
        self.assertEqual(old_resp.status_code, 403)
        self.assertEqual(old_resp.data.get("detail"), "Edge token inválido para esta loja.")

        active_token = EdgeToken.objects.get(store_id=store.id, active=True)
        self.assertIsNone(active_token.last_used_at)
        new_payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-new-token",
            "data": {"store_id": str(store.id)},
        }
        new_resp = self.client.post(
            "/api/edge/events/",
            new_payload,
            format="json",
            HTTP_X_EDGE_TOKEN=new_token,
        )
        self.assertEqual(new_resp.status_code, 201)
        active_token.refresh_from_db()
        self.assertIsNotNone(active_token.last_used_at)

    def test_edge_setup_store_not_found_returns_json(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        self.client.force_authenticate(user=user)
        with patch("apps.stores.views.StoreViewSet.get_object", side_effect=Http404()):
            resp = self.client.get("/api/v1/stores/00000000-0000-0000-0000-000000000000/edge-setup/")
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.data.get("code"), "STORE_NOT_FOUND")
        self.assertTrue(resp.data.get("message"))
        self.assertIsNotNone(resp.data.get("details"))

    def test_edge_setup_forbidden_returns_json(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        store = self._store_stub()
        self.client.force_authenticate(user=user)
        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store), patch(
            "apps.stores.views._require_store_owner_or_admin",
            side_effect=PermissionDenied("Sem permissão."),
        ):
            resp = self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data.get("code"), "FORBIDDEN")
        self.assertTrue(resp.data.get("message"))
        self.assertIsNotNone(resp.data.get("details"))

    def test_edge_token_rotate_store_not_found_returns_json(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        self.client.force_authenticate(user=user)
        with patch("apps.stores.views.StoreViewSet.get_object", side_effect=Http404()):
            resp = self.client.post("/api/v1/stores/00000000-0000-0000-0000-000000000000/edge-token/rotate/")
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.data.get("code"), "STORE_NOT_FOUND")
        self.assertTrue(resp.data.get("message"))
        self.assertIsNotNone(resp.data.get("details"))

    def test_edge_token_rotate_forbidden_returns_json(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        store = self._store_stub()
        self.client.force_authenticate(user=user)
        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store), patch(
            "apps.stores.views._require_store_owner_or_admin",
            side_effect=PermissionDenied("Sem permissão."),
        ):
            resp = self.client.post(f"/api/v1/stores/{store.id}/edge-token/rotate/")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data.get("code"), "FORBIDDEN")
        self.assertTrue(resp.data.get("message"))
        self.assertIsNotNone(resp.data.get("details"))

    def test_edge_setup_get_does_not_invalidate_ingest_token(self):
        self._skip_if_not_pg()
        store = self._store_stub()

        user = self._create_staff_user()
        self.client.force_authenticate(user=user)
        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store):
            setup_resp = self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
            self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
        raw_token = setup_resp.data.get("edge_token")
        self.assertTrue(raw_token)

        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-edge-setup",
            "data": {"store_id": str(store.id)},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_X_EDGE_TOKEN=raw_token,
        )
        self.assertIn(resp.status_code, (200, 201))
        self.assertTrue(resp.data.get("ok"))
        token_obj = EdgeToken.objects.filter(store_id=store.id, active=True).first()
        self.assertIsNotNone(token_obj)
        self.assertIsNotNone(token_obj.last_used_at)

    def test_edge_token_rotate_creates_token_when_missing(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        store = self._store_stub()
        self.client.force_authenticate(user=user)
        EdgeToken.objects.filter(store_id=store.id).delete()

        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store):
            resp = self.client.post(f"/api/v1/stores/{store.id}/edge-token/rotate/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data.get("edge_token"))
        active_tokens = EdgeToken.objects.filter(store_id=store.id, active=True)
        self.assertEqual(active_tokens.count(), 1)
