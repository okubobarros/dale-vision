import uuid
from django.test import TestCase
from django.db import connection
from rest_framework.test import APIClient


class DemoLeadCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _has_tables(self) -> bool:
        try:
            tables = set(connection.introspection.table_names())
        except Exception:
            return False
        return "demo_leads" in tables

    def test_create_demo_lead_returns_ok(self):
        if not self._has_tables():
            self.skipTest("demo_leads table not available")

        email = f"lead.{uuid.uuid4().hex}@example.com"
        payload = {
            "contact_name": "Teste Lead",
            "email": email,
            "whatsapp": "11999999999",
            "operation_type": "varejo",
            "stores_range": "1",
            "cameras_range": "1-3",
            "primary_goals": ["loss_prevention"],
            "qualified_score": 25,
            "utm": {"utm_source": "tests"},
            "metadata": {"source_detail": "campanha A"},
        }
        resp = self.client.post("/api/v1/demo-leads/", payload, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data.get("ok"))
        self.assertIsNotNone(resp.data.get("id"))
        self.assertIn("request_id", resp.data)

    def test_create_demo_lead_invalid_payload_returns_400(self):
        payload = {"email": "invalid@example.com"}
        resp = self.client.post("/api/v1/demo-leads/", payload, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.data.get("ok"))
        self.assertEqual(resp.data.get("code"), "VALIDATION_ERROR")
        self.assertIn("errors", resp.data)

    def test_create_demo_lead_dedupes_by_email(self):
        if not self._has_tables():
            self.skipTest("demo_leads table not available")

        email = f"lead.{uuid.uuid4().hex}@example.com"
        payload = {
            "contact_name": "Teste Lead",
            "email": email,
            "whatsapp": "11999999999",
            "operation_type": "varejo",
            "stores_range": "1",
            "cameras_range": "1-3",
            "primary_goals": ["loss_prevention"],
            "qualified_score": 25,
            "utm": {"utm_source": "tests"},
            "metadata": {"source_detail": "campanha A"},
        }
        first = self.client.post("/api/v1/demo-leads/", payload, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertTrue(first.data.get("ok"))
        self.assertIsNotNone(first.data.get("id"))

        second = self.client.post("/api/v1/demo-leads/", payload, format="json")
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.data.get("ok"))
        self.assertTrue(second.data.get("deduped"))
        self.assertEqual(first.data.get("id"), second.data.get("id"))
