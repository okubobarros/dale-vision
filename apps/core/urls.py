from django.urls import path
from .views_onboarding import OnboardingProgressView, OnboardingStepCompleteView

urlpatterns = [
    path("onboarding/progress/", OnboardingProgressView.as_view(), name="onboarding-progress"),
    path("onboarding/step/complete/", OnboardingStepCompleteView.as_view(), name="onboarding-step-complete"),
]
