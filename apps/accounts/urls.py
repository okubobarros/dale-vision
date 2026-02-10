# apps/accounts/urls.py
from django.urls import path
from knox import views as knox_views
from .views import RegisterView, LoginView, MeView, SupabaseBootstrapView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", knox_views.LogoutView.as_view(), name="logout"),
    path("logoutall/", knox_views.LogoutAllView.as_view(), name="logoutall"),
    path("me/", MeView.as_view(), name="me"),
    path("supabase/", SupabaseBootstrapView.as_view(), name="supabase-bootstrap"),
]
