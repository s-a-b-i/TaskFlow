"""
Custom permission classes for Team Task Manager.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import TeamMembership


class IsTeamOwner(BasePermission):
    """
    Allows access only to the owner of the team.
    Used for destructive team operations (delete, remove members).
    Expects the view to have a `get_object()` returning a Team instance.
    """

    def has_object_permission(self, request, view, obj):
        # Allow read-only access to all authenticated team members
        if request.method in SAFE_METHODS:
            return True

        # Write permission only for team owner
        return TeamMembership.objects.filter(
            team=obj, user=request.user, role='owner'
        ).exists()


class IsTeamMember(BasePermission):
    """
    Allows access only to authenticated users who are members of the team.
    """

    def has_object_permission(self, request, view, obj):
        return TeamMembership.objects.filter(
            team=obj, user=request.user
        ).exists()
