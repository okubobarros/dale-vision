from django.urls import path
from .views_onboarding import OnboardingProgressView, OnboardingStepCompleteView, OnboardingNextStepView
from apps.accounts.views import MeStatusView, AdminControlTowerSummaryView
from .views_report import (
    ReportSummaryView,
    ReportExportView,
    ReportImpactView,
    ProductivityCoverageView,
    JourneyFunnelView,
)
from .views import (
    StorageStatusView,
    SalesProgressView,
    PdvIntegrationInterestView,
    PdvTransactionIngestView,
    PdvTransactionSummaryView,
    PdvIngestionHealthView,
    DataCompletenessView,
    AdminIngestionFunnelGapView,
    AdminPipelineObservabilityView,
)
from .views_calibration import (
    CalibrationActionListCreateView,
    CalibrationActionStatusView,
    CalibrationActionEvidenceCreateView,
    CalibrationActionResultCreateView,
    CalibrationActionAutoGenerateView,
    CalibrationImpactSummaryView,
)

urlpatterns = [
    path("onboarding/progress/", OnboardingProgressView.as_view(), name="onboarding-progress"),
    path("onboarding/step/complete/", OnboardingStepCompleteView.as_view(), name="onboarding-step-complete"),
    path("onboarding/next-step/", OnboardingNextStepView.as_view(), name="onboarding-next-step"),
    path("me/status/", MeStatusView.as_view(), name="me-status"),
    path("me/admin/control-tower/summary/", AdminControlTowerSummaryView.as_view(), name="admin-control-tower-summary"),
    path("report/summary/", ReportSummaryView.as_view(), name="report-summary"),
    path("report/impact/", ReportImpactView.as_view(), name="report-impact"),
    path("report/journey-funnel/", JourneyFunnelView.as_view(), name="report-journey-funnel"),
    path("report/export/", ReportExportView.as_view(), name="report-export"),
    path("sales/progress/", SalesProgressView.as_view(), name="sales-progress"),
    path("integration/pdv/interest/", PdvIntegrationInterestView.as_view(), name="pdv-integration-interest"),
    path("integration/pdv/events/", PdvTransactionIngestView.as_view(), name="pdv-events-ingest"),
    path("integration/pdv/summary/", PdvTransactionSummaryView.as_view(), name="pdv-summary"),
    path("integration/pdv/ingestion-health/", PdvIngestionHealthView.as_view(), name="pdv-ingestion-health"),
    path("data-quality/completeness/", DataCompletenessView.as_view(), name="data-quality-completeness"),
    path("me/admin/ingestion-funnel-gap/", AdminIngestionFunnelGapView.as_view(), name="admin-ingestion-funnel-gap"),
    path("me/admin/pipeline-observability/", AdminPipelineObservabilityView.as_view(), name="admin-pipeline-observability"),
    path("calibration/actions/", CalibrationActionListCreateView.as_view(), name="calibration-actions"),
    path("calibration/actions/auto-generate/", CalibrationActionAutoGenerateView.as_view(), name="calibration-actions-auto-generate"),
    path("calibration/actions/impact-summary/", CalibrationImpactSummaryView.as_view(), name="calibration-actions-impact-summary"),
    path("calibration/actions/<uuid:action_id>/", CalibrationActionStatusView.as_view(), name="calibration-action-status"),
    path("calibration/actions/<uuid:action_id>/evidence/", CalibrationActionEvidenceCreateView.as_view(), name="calibration-action-evidence"),
    path("calibration/actions/<uuid:action_id>/result/", CalibrationActionResultCreateView.as_view(), name="calibration-action-result"),
    path("productivity/coverage", ProductivityCoverageView.as_view(), name="productivity-coverage-noslash"),
    path("productivity/coverage/", ProductivityCoverageView.as_view(), name="productivity-coverage"),
    path("system/storage-status/", StorageStatusView.as_view({"get": "list"}), name="storage-status"),
]
