from django.urls import path
from .views_onboarding import OnboardingProgressView, OnboardingStepCompleteView, OnboardingNextStepView
from apps.accounts.views import MeStatusView
from .views_report import ReportSummaryView, ReportExportView
from .views import StorageStatusView

urlpatterns = [
    path("onboarding/progress/", OnboardingProgressView.as_view(), name="onboarding-progress"),
    path("onboarding/step/complete/", OnboardingStepCompleteView.as_view(), name="onboarding-step-complete"),
    path("onboarding/next-step/", OnboardingNextStepView.as_view(), name="onboarding-next-step"),
    path("me/status/", MeStatusView.as_view(), name="me-status"),
    path("report/summary/", ReportSummaryView.as_view(), name="report-summary"),
    path("report/export/", ReportExportView.as_view(), name="report-export"),
    path("system/storage-status/", StorageStatusView.as_view({"get": "list"}), name="storage-status"),
]
