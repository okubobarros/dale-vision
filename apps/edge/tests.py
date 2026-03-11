import json
import hashlib
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from django.test import TestCase, SimpleTestCase
from django.http import Http404
from django.test import override_settings
from django.db import IntegrityError, connection
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework.exceptions import PermissionDenied
from knox.models import AuthToken
from apps.edge.models import EdgeToken
from apps.edge.auth import _extract_store_token
from apps.edge.vision_metrics import (
    apply_vision_metrics,
    apply_vision_crossing,
    apply_vision_queue_state,
    apply_vision_checkout_proxy,
    apply_vision_zone_occupancy,
    insert_event_receipt_if_new,
    insert_vision_atomic_event_if_new,
)
from apps.edge import vision_metrics


class EdgeAuthHeaderPrecedenceTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_x_edge_token_takes_precedence_over_authorization_bearer(self):
        req = self.factory.get(
            "/api/edge/events/",
            HTTP_X_EDGE_TOKEN="edge-token-123",
            HTTP_AUTHORIZATION="Bearer should-not-win",
        )
        self.assertEqual(_extract_store_token(req), "edge-token-123")

    def test_authorization_bearer_used_when_x_edge_token_missing(self):
        req = self.factory.get(
            "/api/edge/events/",
            HTTP_AUTHORIZATION="Bearer edge-token-from-bearer",
        )
        self.assertEqual(_extract_store_token(req), "edge-token-from-bearer")


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

    def test_edge_store_token_allows_event_with_bearer(self):
        self._skip_if_not_pg()
        store_id = uuid.uuid4()
        token = "edge-store-bearer-token"
        self._create_edge_token(store_id, token)
        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-store-bearer-1",
            "data": {"store_id": str(store_id)},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data.get("ok"))

    def test_edge_store_token_x_header_wins_over_bearer_when_both_present(self):
        self._skip_if_not_pg()
        store_id = uuid.uuid4()
        token = "edge-store-header-priority-token"
        self._create_edge_token(store_id, token)
        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-store-header-priority-1",
            "data": {"store_id": str(store_id)},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_X_EDGE_TOKEN=token,
            HTTP_AUTHORIZATION="Bearer invalid.jwt.token",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data.get("ok"))

    def test_edge_store_token_invalid_returns_401(self):
        self._skip_if_not_pg()
        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-invalid-401",
            "data": {"store_id": str(uuid.uuid4())},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_AUTHORIZATION="Bearer invalid-edge-token",
        )
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.data.get("code"), "edge_token_invalid")

    def test_edge_store_token_store_mismatch_returns_403(self):
        self._skip_if_not_pg()
        token_store_id = uuid.uuid4()
        payload_store_id = uuid.uuid4()
        token = "edge-store-mismatch-token"
        self._create_edge_token(token_store_id, token)
        payload = {
            "event_name": "edge_heartbeat",
            "receipt_id": "test-receipt-mismatch-403",
            "data": {"store_id": str(payload_store_id)},
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data.get("code"), "edge_store_mismatch")

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

    def test_vision_event_contract_invalid_returns_400_with_missing_fields(self):
        self._skip_if_not_pg()
        store_id = uuid.uuid4()
        token = "edge-store-token-contract-invalid"
        self._create_edge_token(store_id, token)
        payload = {
            "event_name": "vision.queue_state.v1",
            "data": {
                "store_id": str(store_id),
                "camera_id": "cam-cashier-1",
                "ts": "2026-03-10T03:00:00Z",
                "count_value": 2,
            },
        }
        resp = self.client.post(
            "/api/edge/events/",
            payload,
            format="json",
            HTTP_X_EDGE_TOKEN=token,
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data.get("reason"), "vision_contract_invalid")
        self.assertIn("metric_type", resp.data.get("missing_fields", []))
        self.assertIn("ownership", resp.data.get("missing_fields", []))
        self.assertIn("roi_entity_id", resp.data.get("missing_fields", []))

    def test_vision_event_contract_valid_accepts_and_projects(self):
        self._skip_if_not_pg()
        store_id = uuid.uuid4()
        token = "edge-store-token-contract-valid"
        self._create_edge_token(store_id, token)
        payload = {
            "event_name": "vision.queue_state.v1",
            "data": {
                "store_id": str(store_id),
                "camera_id": "cam-cashier-1",
                "ts": "2026-03-10T03:00:00Z",
                "metric_type": "queue",
                "ownership": "primary",
                "roi_entity_id": "queue-zone-1",
                "count_value": 2,
                "staff_active_est": 1,
            },
        }

        camera_obj = SimpleNamespace(id=uuid.uuid4())
        camera_qs = MagicMock()
        camera_external_qs = MagicMock()
        camera_external_qs.first.return_value = camera_obj
        camera_qs.filter.return_value = camera_external_qs

        with patch("apps.edge.views.Camera.objects.filter", return_value=camera_qs):
            with patch("apps.edge.views.insert_vision_atomic_event_if_new", return_value=True) as atomic_insert:
                with patch("apps.edge.views.apply_vision_queue_state") as apply_queue:
                    resp = self.client.post(
                        "/api/edge/events/",
                        payload,
                        format="json",
                        HTTP_X_EDGE_TOKEN=token,
                    )

        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data.get("ok"))
        atomic_insert.assert_called_once()
        apply_queue.assert_called_once()


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
        self.assertEqual(old_resp.status_code, 401)
        self.assertEqual(old_resp.data.get("code"), "edge_token_invalid")

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

    @override_settings(EDGE_DEBUG="1")
    def test_edge_token_hint_masks_token(self):
        self._skip_if_not_pg()
        user = self._create_staff_user()
        store = self._store_stub()
        self.client.force_authenticate(user=user)

        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store):
            setup_resp = self.client.get(f"/api/v1/stores/{store.id}/edge-setup/")
        raw_token = setup_resp.data.get("edge_token")
        self.assertTrue(raw_token)

        with patch("apps.stores.views.StoreViewSet.get_object", return_value=store):
            hint_resp = self.client.get(f"/api/v1/stores/{store.id}/edge-token-hint/")

        self.assertEqual(hint_resp.status_code, 200)
        self.assertEqual(hint_resp.data.get("token_prefix"), raw_token[:6])
        self.assertEqual(hint_resp.data.get("token_last4"), raw_token[-4:])
        self.assertNotIn("edge_token", hint_resp.data)


class VisionMetricsContractTests(TestCase):
    def test_insert_event_receipt_if_new_extracts_roi_context_into_meta(self):
        payload = {
            "data": {
                "store_id": "store-1",
                "camera_id": "cam-1",
                "traffic": {
                    "zone_id": "zone-front",
                    "roi_entity_id": "line-main",
                    "metric_type": "entry_exit",
                },
                "conversion": {},
            }
        }

        cursor = MagicMock()
        cursor.rowcount = 1
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            inserted = insert_event_receipt_if_new(
                event_id="evt-1",
                event_name="vision.metrics.v1",
                payload=payload,
            )

        self.assertTrue(inserted)
        _, params = cursor.execute.call_args[0]
        meta = json.loads(params[5])
        self.assertEqual(meta["store_id"], "store-1")
        self.assertEqual(meta["camera_id"], "cam-1")
        self.assertEqual(meta["zone_id"], "zone-front")
        self.assertEqual(meta["roi_entity_id"], "line-main")
        self.assertEqual(meta["metric_type"], "entry_exit")

    def test_apply_vision_metrics_passes_traffic_zone_context_to_upsert(self):
        payload = {
            "data": {
                "store_id": "store-1",
                "camera_id": "cam-1",
                "camera_role": "entrada",
                "ownership": {"mode": "single_camera_owner"},
                "bucket": {"start": "2026-03-09T12:00:00Z"},
                "traffic": {
                    "footfall": 4,
                    "entries": 4,
                    "exits": 1,
                    "zone_id": "zone-front",
                    "roi_entity_id": "line-main",
                    "metric_type": "entry_exit",
                },
                "conversion": {
                    "checkout_events": 0,
                },
            }
        }

        cursor = MagicMock()
        cursor.fetchone.side_effect = [None, None]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            with patch("apps.edge.vision_metrics._upsert_traffic_metrics") as traffic_upsert:
                with patch("apps.edge.vision_metrics._upsert_conversion_metrics") as conversion_upsert:
                    apply_vision_metrics(payload)

        traffic_upsert.assert_called_once()
        conversion_upsert.assert_called_once()
        traffic_payload = traffic_upsert.call_args.args[2]
        conversion_payload = conversion_upsert.call_args.args[2]
        traffic_kwargs = traffic_upsert.call_args.kwargs
        conversion_kwargs = conversion_upsert.call_args.kwargs
        self.assertEqual(traffic_payload["ownership"], "primary")
        self.assertEqual(conversion_payload["ownership"], "primary")
        self.assertEqual(traffic_kwargs["zone_id"], "zone-front")
        self.assertEqual(traffic_kwargs["camera_id"], "cam-1")
        self.assertEqual(traffic_kwargs["camera_role"], "entrada")
        self.assertEqual(conversion_kwargs["camera_id"], "cam-1")
        self.assertEqual(conversion_kwargs["camera_role"], "entrada")

    def test_conversion_metrics_contract_violation_raises_without_legacy_fallback(self):
        cursor = MagicMock()
        cursor.fetchone.side_effect = [
            None,
        ]
        cursor.execute.side_effect = [
            None,
            IntegrityError("duplicate key value violates unique constraint"),
        ]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            with self.assertRaises(vision_metrics.ProjectionContractError):
                vision_metrics._upsert_conversion_metrics(
                    "store-1",
                    vision_metrics._parse_ts("2026-03-09T12:00:00Z"),
                    {
                        "queue_avg_seconds": 30,
                        "staff_active_est": 1,
                        "checkout_events": 2,
                        "metric_type": "checkout_proxy",
                        "roi_entity_id": "queue-zone-1",
                    },
                    camera_id="cam-1",
                    camera_role="balcao",
                )

        self.assertEqual(cursor.execute.call_count, 2)

    def test_insert_vision_atomic_event_if_new_includes_crossing_context(self):
        payload = {
            "data": {
                "event_type": "vision.crossing.v1",
                "store_id": "store-1",
                "camera_id": "cam-1",
                "camera_role": "entrada",
                "zone_id": "zone-front",
                "roi_entity_id": "line-main",
                "roi_version": 4,
                "metric_type": "entry_exit",
                "ownership": "primary",
                "direction": "entry",
                "count_value": 1,
                "track_id_hash": "hash-1",
                "ts": "2026-03-09T12:00:05Z",
            }
        }

        cursor = MagicMock()
        cursor.rowcount = 1
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            inserted = insert_vision_atomic_event_if_new(receipt_id="rcpt-1", payload=payload)

        self.assertTrue(inserted)
        _, params = cursor.execute.call_args[0]
        self.assertEqual(params[0], "rcpt-1")
        self.assertEqual(params[1], "vision.crossing.v1")
        self.assertEqual(params[5], "zone-front")
        self.assertEqual(params[6], "line-main")
        self.assertEqual(params[9], "primary")
        self.assertEqual(params[10], "entry")

    def test_apply_vision_crossing_aggregates_primary_entry_into_traffic_metrics(self):
        payload = {
            "data": {
                "store_id": "store-1",
                "camera_id": "cam-1",
                "camera_role": "entrada",
                "zone_id": "zone-front",
                "roi_entity_id": "line-main",
                "metric_type": "entry_exit",
                "ownership": "primary",
                "direction": "entry",
                "count_value": 1,
                "ts": "2026-03-09T12:00:05Z",
            }
        }

        with patch("apps.edge.vision_metrics._upsert_traffic_metrics") as traffic_upsert:
            apply_vision_crossing(payload)

        traffic_upsert.assert_called_once()
        traffic_payload = traffic_upsert.call_args.args[2]
        self.assertEqual(traffic_payload["footfall"], 1)
        self.assertEqual(traffic_payload["ownership"], "primary")
        self.assertEqual(traffic_payload["metric_type"], "entry_exit")
        self.assertTrue(traffic_upsert.call_args.kwargs["accumulate"])

    def test_insert_vision_atomic_event_if_new_includes_queue_state_context(self):
        payload = {
            "data": {
                "event_type": "vision.queue_state.v1",
                "store_id": "store-1",
                "camera_id": "cam-cashier-1",
                "camera_role": "balcao",
                "zone_id": "zone-cashier",
                "roi_entity_id": "queue-zone-1",
                "roi_version": 5,
                "metric_type": "queue",
                "ownership": "primary",
                "count_value": 4,
                "staff_active_est": 2,
                "confidence": 0.93,
                "ts": "2026-03-09T12:00:11Z",
            }
        }

        cursor = MagicMock()
        cursor.rowcount = 1
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            inserted = insert_vision_atomic_event_if_new(receipt_id="rcpt-queue-1", payload=payload)

        self.assertTrue(inserted)
        _, params = cursor.execute.call_args[0]
        self.assertEqual(params[0], "rcpt-queue-1")
        self.assertEqual(params[1], "vision.queue_state.v1")
        self.assertEqual(params[5], "zone-cashier")
        self.assertEqual(params[6], "queue-zone-1")
        self.assertEqual(params[11], 4)
        self.assertEqual(params[12], 2)

    def test_apply_vision_queue_state_derives_conversion_metrics_from_atomic_samples(self):
        payload = {
            "data": {
                "event_type": "vision.queue_state.v1",
                "store_id": "store-1",
                "camera_id": "cam-cashier-1",
                "camera_role": "balcao",
                "zone_id": "zone-cashier",
                "roi_entity_id": "queue-zone-1",
                "metric_type": "queue",
                "ownership": "primary",
                "count_value": 4,
                "staff_active_est": 2,
                "ts": "2026-03-09T12:00:11Z",
            }
        }

        cursor = MagicMock()
        cursor.fetchone.side_effect = [
            (3.5, 2),
            None,
        ]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            apply_vision_queue_state(payload)

        self.assertEqual(cursor.execute.call_count, 3)
        insert_sql, insert_params = cursor.execute.call_args_list[2][0]
        self.assertIn("INSERT INTO public.conversion_metrics", insert_sql)
        self.assertEqual(insert_params[0], "store-1")
        self.assertEqual(insert_params[1], "cam-cashier-1")
        self.assertEqual(insert_params[2], "balcao")
        self.assertEqual(insert_params[3], "primary")
        self.assertEqual(insert_params[4], "queue")
        self.assertEqual(insert_params[5], "queue-zone-1")
        self.assertEqual(insert_params[7], 105)
        self.assertEqual(insert_params[8], 2)

    def test_insert_vision_atomic_event_if_new_includes_checkout_proxy_context(self):
        payload = {
            "data": {
                "event_type": "vision.checkout_proxy.v1",
                "store_id": "store-1",
                "camera_id": "cam-cashier-1",
                "camera_role": "balcao",
                "zone_id": "zone-cashier",
                "roi_entity_id": "checkout-zone-1",
                "roi_version": 5,
                "metric_type": "checkout_proxy",
                "ownership": "primary",
                "count_value": 1,
                "duration_seconds": 18,
                "confidence": 0.9,
                "ts": "2026-03-09T12:00:21Z",
            }
        }

        cursor = MagicMock()
        cursor.rowcount = 1
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            inserted = insert_vision_atomic_event_if_new(receipt_id="rcpt-checkout-1", payload=payload)

        self.assertTrue(inserted)
        _, params = cursor.execute.call_args[0]
        self.assertEqual(params[1], "vision.checkout_proxy.v1")
        self.assertEqual(params[6], "checkout-zone-1")
        self.assertEqual(params[11], 1)
        self.assertEqual(params[13], 18)

    def test_apply_vision_checkout_proxy_derives_conversion_metrics_from_atomic_events(self):
        payload = {
            "data": {
                "event_type": "vision.checkout_proxy.v1",
                "store_id": "store-1",
                "camera_id": "cam-cashier-1",
                "camera_role": "balcao",
                "zone_id": "zone-cashier",
                "roi_entity_id": "checkout-zone-1",
                "metric_type": "checkout_proxy",
                "ownership": "primary",
                "count_value": 1,
                "duration_seconds": 18,
                "ts": "2026-03-09T12:00:21Z",
            }
        }

        cursor = MagicMock()
        cursor.fetchone.side_effect = [
            (2,),
            None,
        ]
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            apply_vision_checkout_proxy(payload)

        self.assertEqual(cursor.execute.call_count, 3)
        insert_sql, insert_params = cursor.execute.call_args_list[2][0]
        self.assertIn("INSERT INTO public.conversion_metrics", insert_sql)
        self.assertEqual(insert_params[0], "store-1")
        self.assertEqual(insert_params[1], "cam-cashier-1")
        self.assertEqual(insert_params[4], "checkout_proxy")
        self.assertEqual(insert_params[5], "checkout-zone-1")
        self.assertEqual(insert_params[7], 2)

    def test_insert_vision_atomic_event_if_new_includes_zone_occupancy_context(self):
        payload = {
            "data": {
                "event_type": "vision.zone_occupancy.v1",
                "store_id": "store-1",
                "camera_id": "cam-salao-1",
                "camera_role": "salao",
                "zone_id": "zone-dining",
                "roi_entity_id": "occupancy-zone-1",
                "roi_version": 6,
                "metric_type": "occupancy",
                "ownership": "primary",
                "count_value": 5,
                "duration_seconds": 12,
                "confidence": 0.88,
                "ts": "2026-03-09T12:00:31Z",
            }
        }

        cursor = MagicMock()
        cursor.rowcount = 1
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            inserted = insert_vision_atomic_event_if_new(receipt_id="rcpt-occupancy-1", payload=payload)

        self.assertTrue(inserted)
        _, params = cursor.execute.call_args[0]
        self.assertEqual(params[1], "vision.zone_occupancy.v1")
        self.assertEqual(params[6], "occupancy-zone-1")
        self.assertEqual(params[11], 5)
        self.assertEqual(params[13], 12)

    def test_apply_vision_zone_occupancy_derives_traffic_metrics_from_atomic_events(self):
        payload = {
            "data": {
                "event_type": "vision.zone_occupancy.v1",
                "store_id": "store-1",
                "camera_id": "cam-salao-1",
                "camera_role": "salao",
                "zone_id": "zone-dining",
                "roi_entity_id": "occupancy-zone-1",
                "metric_type": "occupancy",
                "ownership": "primary",
                "count_value": 5,
                "duration_seconds": 12,
                "ts": "2026-03-09T12:00:31Z",
            }
        }

        cursor = MagicMock()
        cursor.fetchone.return_value = (4.6, 14.0)
        cursor_cm = MagicMock()
        cursor_cm.__enter__.return_value = cursor
        cursor_cm.__exit__.return_value = False

        with patch("apps.edge.vision_metrics.connection.cursor", return_value=cursor_cm):
            with patch("apps.edge.vision_metrics._upsert_traffic_metrics") as traffic_upsert:
                apply_vision_zone_occupancy(payload)

        traffic_upsert.assert_called_once()
        traffic_payload = traffic_upsert.call_args.args[2]
        self.assertEqual(traffic_payload["engaged"], 5)
        self.assertEqual(traffic_payload["dwell_seconds_avg"], 14)
        self.assertEqual(traffic_payload["metric_type"], "occupancy")
        self.assertEqual(traffic_upsert.call_args.kwargs["zone_id"], "zone-dining")
        self.assertEqual(traffic_upsert.call_args.kwargs["camera_role"], "salao")
