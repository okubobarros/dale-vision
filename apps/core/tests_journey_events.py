from django.test import SimpleTestCase
from unittest.mock import MagicMock, patch

from apps.core.services.journey_events import log_journey_event


class JourneyEventServiceTests(SimpleTestCase):
    @patch("apps.core.services.journey_events.JourneyEvent.objects.create")
    @patch("apps.core.services.journey_events._insert_event_receipt")
    def test_log_journey_event_inserts_receipt(self, insert_mock, create_mock):
        event = MagicMock(id="evt-123")
        create_mock.return_value = event

        result = log_journey_event(
            org_id="org-1",
            lead_id="lead-1",
            event_name="store_created",
            payload={"store_id": "store-1"},
        )

        self.assertEqual(result, event)
        create_mock.assert_called_once()
        insert_mock.assert_called_once()

    @patch("apps.core.services.journey_events.JourneyEvent.objects.create")
    @patch("apps.core.services.journey_events._insert_event_receipt")
    def test_log_journey_event_returns_none_on_create_failure(self, insert_mock, create_mock):
        create_mock.side_effect = Exception("db error")

        result = log_journey_event(
            org_id="org-1",
            event_name="store_created",
            payload={"store_id": "store-1"},
        )

        self.assertIsNone(result)
        insert_mock.assert_not_called()

    @patch("apps.core.services.journey_events.JourneyEvent.objects.create")
    @patch("apps.core.services.journey_events._insert_event_receipt")
    def test_log_journey_event_survives_receipt_error(self, insert_mock, create_mock):
        event = MagicMock(id="evt-999")
        create_mock.return_value = event
        insert_mock.side_effect = Exception("receipt insert failed")

        result = log_journey_event(
            org_id="org-1",
            event_name="upgrade_clicked",
            payload={"source": "report_banner"},
        )

        self.assertEqual(result, event)
        create_mock.assert_called_once()
