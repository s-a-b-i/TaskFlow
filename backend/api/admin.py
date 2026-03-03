"""
Django admin configuration for Team Task Manager.
Registers all models for the admin interface.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Task, Team, TeamMembership, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Extended admin for custom User model."""
    list_display = ['email', 'username', 'first_name', 'last_name', 'is_staff', 'date_joined']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-date_joined']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ()}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'creator', 'created_at']
    search_fields = ['name', 'creator__email']
    list_filter = ['created_at']


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ['team', 'user', 'role', 'joined_at']
    list_filter = ['role']
    search_fields = ['team__name', 'user__email']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'team', 'status', 'priority', 'due_date', 'created_at']
    list_filter = ['status', 'priority', 'team']
    search_fields = ['title', 'description', 'assigned_to__email']
    date_hierarchy = 'created_at'
