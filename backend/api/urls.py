"""
URL routing for the api app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CurrentUserView,
    DashboardView,
    LoginView,
    LogoutView,
    RegisterView,
    UserListView,
    TaskViewSet,
    TeamViewSet,
    NotificationViewSet,
)

# Auto-generate CRUD routes for ViewSets
router = DefaultRouter()
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),

    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('users/', UserListView.as_view(), name='user-list'),

    # Teams + Tasks (router handles /teams/, /teams/{id}/, /tasks/, /tasks/{id}/)
    path('', include(router.urls)),
]
