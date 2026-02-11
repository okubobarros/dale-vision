import uuid
from django.test import TestCase
from django.conf import settings
from django.db import connection
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from knox.models import AuthToken
from apps.core.models import Organization, OrgMember, Store


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

    def test_edge_token_allows_event(self):
        self._skip_if_not_pg()
        settings.EDGE_SHARED_TOKEN = "edge-shared"
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
        settings.EDGE_SHARED_TOKEN = "edge-shared"
        payload = {
            "event_name": "edge_heartbeat",
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
        self.assertTrue(resp.data.get("stored"))
        self.assertTrue(resp.data.get("receipt_id"))
