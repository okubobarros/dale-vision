from django.urls import path

from .views import (
    CopilotStaffPlanActionView,
    CopilotConversationView,
    CopilotDashboardContextView,
    CopilotInsightsView,
    CopilotReport72hView,
)

urlpatterns = [
    path("copilot/stores/<uuid:store_id>/context/", CopilotDashboardContextView.as_view(), name="copilot-context"),
    path("copilot/stores/<uuid:store_id>/insights/", CopilotInsightsView.as_view(), name="copilot-insights"),
    path("copilot/stores/<uuid:store_id>/report-72h/", CopilotReport72hView.as_view(), name="copilot-report-72h"),
    path("copilot/stores/<uuid:store_id>/conversations/", CopilotConversationView.as_view(), name="copilot-conversations"),
    path("copilot/stores/<uuid:store_id>/actions/staff-plan/", CopilotStaffPlanActionView.as_view(), name="copilot-action-staff-plan"),
]
