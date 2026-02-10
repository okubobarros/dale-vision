from django.test import SimpleTestCase
from unittest.mock import MagicMock, patch

from apps.billing.utils import PaywallError, TRIAL_STORE_LIMIT, enforce_trial_store_limit


class TrialStoreLimitTests(SimpleTestCase):
    @patch("apps.billing.utils.log_paywall_block")
    @patch("apps.billing.utils.is_trial", return_value=True)
    @patch("apps.billing.utils.Store")
    def test_blocks_second_store_on_trial(self, store_mock, _is_trial, _log):
        qs = MagicMock()
        qs.count.return_value = TRIAL_STORE_LIMIT
        store_mock.objects.filter.return_value = qs

        with self.assertRaises(PaywallError):
            enforce_trial_store_limit(org_id="org-id")

    @patch("apps.billing.utils.log_paywall_block")
    @patch("apps.billing.utils.is_trial", return_value=True)
    @patch("apps.billing.utils.Store")
    def test_allows_first_store_on_trial(self, store_mock, _is_trial, _log):
        qs = MagicMock()
        qs.count.return_value = TRIAL_STORE_LIMIT - 1
        store_mock.objects.filter.return_value = qs

        enforce_trial_store_limit(org_id="org-id")

    @patch("apps.billing.utils.log_paywall_block")
    @patch("apps.billing.utils.is_trial", return_value=False)
    @patch("apps.billing.utils.Store")
    def test_allows_when_not_trial(self, store_mock, _is_trial, _log):
        qs = MagicMock()
        qs.count.return_value = TRIAL_STORE_LIMIT
        store_mock.objects.filter.return_value = qs

        enforce_trial_store_limit(org_id="org-id")
