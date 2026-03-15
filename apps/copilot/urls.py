from django.urls import path

from .views import (
    CopilotActionOutcomeView,
    CopilotActionOutcomeDetailView,
    CopilotStaffPlanActionView,
    CopilotConversationView,
    CopilotDashboardContextView,
    CopilotInsightsView,
    CopilotReport72hView,
    CopilotStoreProfileView,
    CopilotValueLedgerDailyView,
)

urlpatterns = [
    path("copilot/stores/<uuid:store_id>/context/", CopilotDashboardContextView.as_view(), name="copilot-context"),
    path("copilot/stores/<uuid:store_id>/insights/", CopilotInsightsView.as_view(), name="copilot-insights"),
    path("copilot/stores/<uuid:store_id>/report-72h/", CopilotReport72hView.as_view(), name="copilot-report-72h"),
    path("copilot/stores/<uuid:store_id>/conversations/", CopilotConversationView.as_view(), name="copilot-conversations"),
    path("copilot/stores/<uuid:store_id>/actions/staff-plan/", CopilotStaffPlanActionView.as_view(), name="copilot-action-staff-plan"),
    path("copilot/stores/<uuid:store_id>/actions/outcomes/", CopilotActionOutcomeView.as_view(), name="copilot-action-outcomes"),
    path("copilot/stores/<uuid:store_id>/actions/outcomes/<uuid:outcome_id>/", CopilotActionOutcomeDetailView.as_view(), name="copilot-action-outcome-detail"),
    path("copilot/stores/<uuid:store_id>/value-ledger/daily/", CopilotValueLedgerDailyView.as_view(), name="copilot-value-ledger-daily"),
    path("copilot/stores/<uuid:store_id>/profile/", CopilotStoreProfileView.as_view(), name="copilot-store-profile"),
]
