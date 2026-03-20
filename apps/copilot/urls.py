from django.urls import path

from .views import (
    CopilotActionOutcomeView,
    CopilotActionOutcomeCallbackView,
    CopilotActionOutcomeDetailView,
    CopilotNetworkActionOutcomeView,
    CopilotNetworkValueLedgerDailyView,
    CopilotStaffPlanActionView,
    CopilotConversationView,
    CopilotDashboardContextView,
    CopilotDailyBriefingView,
    CopilotInsightsView,
    CopilotReport72hView,
    CopilotStoreProfileView,
    CopilotValueLedgerDailyView,
)

urlpatterns = [
    path("copilot/daily-briefing/", CopilotDailyBriefingView.as_view(), name="copilot-daily-briefing"),
    path("copilot/network/actions/outcomes/", CopilotNetworkActionOutcomeView.as_view(), name="copilot-network-action-outcomes"),
    path("copilot/network/value-ledger/daily/", CopilotNetworkValueLedgerDailyView.as_view(), name="copilot-network-value-ledger-daily"),
    path("copilot/stores/<uuid:store_id>/context/", CopilotDashboardContextView.as_view(), name="copilot-context"),
    path("copilot/stores/<uuid:store_id>/insights/", CopilotInsightsView.as_view(), name="copilot-insights"),
    path("copilot/stores/<uuid:store_id>/report-72h/", CopilotReport72hView.as_view(), name="copilot-report-72h"),
    path("copilot/stores/<uuid:store_id>/conversations/", CopilotConversationView.as_view(), name="copilot-conversations"),
    path("copilot/stores/<uuid:store_id>/actions/staff-plan/", CopilotStaffPlanActionView.as_view(), name="copilot-action-staff-plan"),
    path("copilot/actions/outcomes/callback/", CopilotActionOutcomeCallbackView.as_view(), name="copilot-action-outcome-callback"),
    path("copilot/stores/<uuid:store_id>/actions/outcomes/", CopilotActionOutcomeView.as_view(), name="copilot-action-outcomes"),
    path("copilot/stores/<uuid:store_id>/actions/outcomes/<uuid:outcome_id>/", CopilotActionOutcomeDetailView.as_view(), name="copilot-action-outcome-detail"),
    path("copilot/stores/<uuid:store_id>/value-ledger/daily/", CopilotValueLedgerDailyView.as_view(), name="copilot-value-ledger-daily"),
    path("copilot/stores/<uuid:store_id>/profile/", CopilotStoreProfileView.as_view(), name="copilot-store-profile"),
]
