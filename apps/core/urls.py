from django.urls import path
from .views_onboarding import OnboardingProgressView, OnboardingStepCompleteView, OnboardingNextStepView
from apps.accounts.views import MeStatusView, AdminControlTowerSummaryView
from .views_report import ReportSummaryView, ReportExportView, ReportImpactView, ProductivityCoverageView
from .views import (
    StorageStatusView,
    SalesProgressView,
    PdvIntegrationInterestView,
    PdvTransactionIngestView,
    PdvTransactionSummaryView,
    PdvIngestionHealthView,
)

urlpatterns = [
    path("onboarding/progress/", OnboardingProgressView.as_view(), name="onboarding-progress"),
    path("onboarding/step/complete/", OnboardingStepCompleteView.as_view(), name="onboarding-step-complete"),
    path("onboarding/next-step/", OnboardingNextStepView.as_view(), name="onboarding-next-step"),
    path("me/status/", MeStatusView.as_view(), name="me-status"),
    path("me/admin/control-tower/summary/", AdminControlTowerSummaryView.as_view(), name="admin-control-tower-summary"),
    path("report/summary/", ReportSummaryView.as_view(), name="report-summary"),
    path("report/impact/", ReportImpactView.as_view(), name="report-impact"),
    path("report/export/", ReportExportView.as_view(), name="report-export"),
    path("sales/progress/", SalesProgressView.as_view(), name="sales-progress"),
    path("integration/pdv/interest/", PdvIntegrationInterestView.as_view(), name="pdv-integration-interest"),
    path("integration/pdv/events/", PdvTransactionIngestView.as_view(), name="pdv-events-ingest"),
    path("integration/pdv/summary/", PdvTransactionSummaryView.as_view(), name="pdv-summary"),
    path("integration/pdv/ingestion-health/", PdvIngestionHealthView.as_view(), name="pdv-ingestion-health"),
    path("productivity/coverage", ProductivityCoverageView.as_view(), name="productivity-coverage-noslash"),
    path("productivity/coverage/", ProductivityCoverageView.as_view(), name="productivity-coverage"),
    path("system/storage-status/", StorageStatusView.as_view({"get": "list"}), name="storage-status"),
]
