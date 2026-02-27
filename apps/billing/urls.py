from django.urls import path
from .views import BillingPlansView

urlpatterns = [
    path("plans", BillingPlansView.as_view(), name="billing-plans"),
]
