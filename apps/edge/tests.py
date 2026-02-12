import hashlib
import uuid
from django.test import TestCase
from django.test import override_settings
from django.db import connection
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from knox.models import AuthToken
from apps.core.models import Organization, OrgMember, Store
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

        org = Organization.objects.create(
            id=uuid.uuid4(),
            name="Org",
            segment=None,
            country="BR",
            timezone="America/Sao_Paulo",
            created_at="2026-01-01T00:00:00Z",
        )

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO public.user_id_map (user_uuid, django_user_id) "
                "VALUES (gen_random_uuid(), %s) RETURNING user_uuid",
                [user.id],
            )
            user_uuid = cursor.fetchone()[0]

        OrgMember.objects.create(
            id=uuid.uuid4(),
            org=org,
            user_id=user_uuid,
            role="owner",
            created_at="2026-01-01T00:00:00Z",
        )

        store = Store.objects.create(
            id=uuid.uuid4(),
            org=org,
            name="Store",
            status="active",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )

        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-2",
            "data": {"store_id": str(store.id)},
        }
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

    def _create_store(self):
        return Store.objects.create(
            id=uuid.uuid4(),
            org_id=uuid.uuid4(),
            name="Store",
            status="active",
            created_at=timezone.now(),
            updated_at=timezone.now(),
        )

    def _hash_token(self, raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    def test_edge_setup_get_idempotent(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        store = self._create_store()
        self.client.force_authenticate(user=user)

        resp1 = self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
        self.assertEqual(resp1.status_code, 200)
        tokens = EdgeToken.objects.filter(store_id=store.id, active=True)
        self.assertEqual(tokens.count(), 1)
        token_hash = tokens.first().token_hash

        resp2 = self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
        self.assertEqual(resp2.status_code, 200)
        tokens = EdgeToken.objects.filter(store_id=store.id, active=True)
        self.assertEqual(tokens.count(), 1)
        self.assertEqual(tokens.first().token_hash, token_hash)

    def test_edge_token_rotate_creates_new_token(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        store = self._create_store()
        self.client.force_authenticate(user=user)

        raw_old = "old-edge-token"
        old_hash = self._hash_token(raw_old)
        EdgeToken.objects.create(store_id=store.id, token_hash=old_hash, active=True)

        resp = self.client.post(f"/api/v1/stores/{store.id}/edge-token/rotate/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data.get("edge_token"))

        active_tokens = EdgeToken.objects.filter(store_id=store.id, active=True)
        self.assertEqual(active_tokens.count(), 1)
        self.assertNotEqual(active_tokens.first().token_hash, old_hash)

        inactive_tokens = EdgeToken.objects.filter(store_id=store.id, active=False)
        self.assertEqual(inactive_tokens.count(), 1)

    def test_edge_setup_get_does_not_invalidate_ingest_token(self):
        self._skip_if_not_pg()
        store = self._create_store()

        raw_token = "edge-store-token"
        token_hash = self._hash_token(raw_token)
        EdgeToken.objects.create(store_id=store.id, token_hash=token_hash, active=True)

        user = self._create_staff_user()
        self.client.force_authenticate(user=user)
        self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
        self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")

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
