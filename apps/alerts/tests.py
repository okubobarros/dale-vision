from django.test import TestCase
from django.db import connection
from rest_framework.test import APIClient

from apps.core.models import DemoLead


class DemoLeadCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _has_tables(self) -> bool:
        try:
            tables = set(connection.introspection.table_names())
        except Exception:
            return False
        return {"demo_leads", "journey_events"}.issubset(tables)

    def test_create_demo_lead_returns_ok(self):
        if not self._has_tables():
            self.skipTest("demo_leads/journey_events tables not available")

        payload = {
            "contact_name": "Teste Lead",
            "email": "lead.teste@exemplo.com",
            "source": "instagram",
            "metadata": {"source_detail": "campanha A"},
        }
        resp = self.client.post("/api/v1/demo-leads/", payload, format="json")
        self.assertIn(resp.status_code, [200, 201])
        self.assertTrue(resp.data.get("ok"))
        lead_id = resp.data.get("id")
        self.assertIsNotNone(lead_id)

        lead = DemoLead.objects.get(id=lead_id)
        self.assertEqual(lead.source, "instagram")
        self.assertEqual((lead.metadata or {}).get("source_detail"), "campanha A")
