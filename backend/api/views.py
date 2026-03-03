"""
API Views for Team Task Manager.

Sections:
  1. Auth – register, login, logout, current user
  2. Teams – CRUD + member management
  3. Tasks – CRUD + filtering
  4. Dashboard – summary stats
"""

from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.db import models as db_models
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Task, Team, TeamMembership, User, Notification
from .permissions import IsTeamOwner
from .serializers import (
    NotificationSerializer,
    RegisterSerializer,
    LoginSerializer,
    AddMemberSerializer,
    RemoveMemberSerializer,
    TaskSerializer,
    TeamCreateSerializer,
    TeamSerializer,
    UserPublicSerializer,
)


# ════════════════════════════════════════════════════════════
# 1. AUTH VIEWS
# ════════════════════════════════════════════════════════════

class RegisterView(APIView):
    """
    POST /api/auth/register/
    Creates a new user account and establishes a session.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(
            {
                'message': 'Registration successful.',
                'user': UserPublicSerializer(user).data,
                'csrf_token': get_token(request),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticates credentials and establishes a session cookie.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Do not re-login if already authenticated
        if request.user.is_authenticated:
            return Response(
                {'user': UserPublicSerializer(request.user).data},
                status=status.HTTP_200_OK,
            )
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return Response(
            {
                'message': 'Login successful.',
                'user': UserPublicSerializer(user).data,
                'csrf_token': get_token(request),
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Terminates the session and clears the session cookie.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        response = Response({'message': 'Logged out successfully.'})
        response.delete_cookie('sessionid')
        return response


class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Returns the currently authenticated user's profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            **UserPublicSerializer(request.user).data,
            'csrf_token': get_token(request)
        })


# ════════════════════════════════════════════════════════════
# 2. TEAM VIEWS
# ════════════════════════════════════════════════════════════

class TeamViewSet(viewsets.ModelViewSet):
    """
    /api/teams/           – list, create
    /api/teams/{id}/      – retrieve, update, destroy
    /api/teams/{id}/add_member/     – POST: add member by email
    /api/teams/{id}/remove_member/  – POST: remove member by user_id
    /api/teams/{id}/members/        – GET: list all members
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TeamCreateSerializer
        return TeamSerializer

    def get_queryset(self):
        """Only return teams the current user belongs to."""
        return Team.objects.filter(
            memberships__user=self.request.user
        ).prefetch_related(
            'memberships__user'
        ).select_related('creator').distinct()

    def create(self, request, *args, **kwargs):
        """Create a team and automatically add creator as owner."""
        serializer = TeamCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        team = serializer.save(creator=request.user)

        # Add the creator as owner
        TeamMembership.objects.create(team=team, user=request.user, role='owner')

        return Response(
            TeamSerializer(team, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """Update team metadata – restricted to owners."""
        team = self.get_object()
        self._assert_owner(request, team)
        serializer = TeamCreateSerializer(team, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        team = serializer.save()
        return Response(TeamSerializer(team, context={'request': request}).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete team – only the owner can do this (bonus: RBAC)."""
        team = self.get_object()
        self._assert_owner(request, team)
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _assert_owner(self, request, team):
        """Raise 403 if the requesting user is not the team owner."""
        is_owner = TeamMembership.objects.filter(
            team=team, user=request.user, role='owner'
        ).exists()
        if not is_owner:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the team owner can perform this action.')

    @action(detail=True, methods=['get'], url_path='members')
    def members(self, request, pk=None):
        """GET /api/teams/{id}/members/ – list all team members."""
        team = self.get_object()
        from .serializers import TeamMembershipSerializer
        memberships = team.memberships.select_related('user').all()
        serializer = TeamMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add_member')
    def add_member(self, request, pk=None):
        """
        POST /api/teams/{id}/add_member/
        Body: { "email": "user@example.com" }
        Bonus: stubbed email invite – just adds the user directly.
        """
        team = self.get_object()
        self._assert_owner(request, team)

        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user

        if TeamMembership.objects.filter(team=team, user=user).exists():
            return Response(
                {'detail': 'User is already a member of this team.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        TeamMembership.objects.create(team=team, user=user, role='member')
        return Response(
            {'message': f'{user.email} has been added to {team.name}.'},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='remove_member')
    def remove_member(self, request, pk=None):
        """
        POST /api/teams/{id}/remove_member/
        Body: { "user_id": 5, "force": false }
        """
        team = self.get_object()
        self._assert_owner(request, team)

        serializer = RemoveMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data['user_id']
        force = serializer.validated_data['force']

        # Prevent removing the owner
        if team.creator_id == user_id:
            return Response(
                {'detail': 'Cannot remove the team owner.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for assigned tasks
        assigned_tasks_count = Task.objects.filter(team=team, assigned_to=user_id).count()

        if assigned_tasks_count > 0 and not force:
            return Response(
                {
                    'warning': 'user_has_tasks',
                    'task_count': assigned_tasks_count,
                    'detail': f'User is assigned to {assigned_tasks_count} tasks in this team. Removing them will unassign these tasks.'
                },
                status=status.HTTP_200_OK,  # Return 200 so frontend can handle the warning gracefully
            )

        # Unassign tasks first
        tasks_to_unassign = Task.objects.filter(team=team, assigned_to=user_id)
        for task in tasks_to_unassign:
            task.assigned_to.remove(user_id)

        deleted, _ = TeamMembership.objects.filter(team=team, user_id=user_id).delete()
        if deleted == 0:
            return Response(
                {'detail': 'User is not a member of this team.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'message': 'Member removed and tasks unassigned successfully.'})


# ════════════════════════════════════════════════════════════
# 3. TASK VIEWS
# ════════════════════════════════════════════════════════════

class TaskViewSet(viewsets.ModelViewSet):
    """
    /api/tasks/       – list (with filters), create
    /api/tasks/{id}/  – retrieve, update, destroy

    Query parameters for GET /api/tasks/:
      ?team=<id>           Filter by team
      ?assigned_to=<id>    Filter by assigned user
      ?status=<value>      Filter by status (todo, in_progress, done)
      ?priority=<value>    Filter by priority
      ?search=<text>       Search in title & description
      ?my_tasks=true       Only tasks assigned to me
      ?overdue=true        Only overdue tasks
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def _get_today(self):
        # Using localtime ensures we match the user's current calendar day
        # instead of UTC, which might still be "yesterday"
        return timezone.localtime(timezone.now()).date()

    def get_queryset(self):
        """
        Return tasks from teams the current user belongs to,
        with optional query-param filters applied.
        """
        user = self.request.user
        qs = Task.objects.filter(
            team__memberships__user=user
        ).select_related(
            'team', 'created_by'
        ).prefetch_related(
            'assigned_to'
        ).distinct()

        params = self.request.query_params

        # Filter by team
        team_id = params.get('team')
        if team_id:
            qs = qs.filter(team_id=team_id)

        # Filter by assignee
        assigned_to = params.get('assigned_to')
        if assigned_to:
            qs = qs.filter(assigned_to__id=assigned_to)

        # Filter by status
        task_status = params.get('status')
        if task_status:
            qs = qs.filter(status=task_status)

        # Filter by priority
        priority = params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        # Full-text search on title + description
        search = params.get('search')
        if search:
            qs = qs.filter(
                db_models.Q(title__icontains=search) |
                db_models.Q(description__icontains=search)
            )

        # Show only MY tasks
        if params.get('my_tasks') == 'true':
            qs = qs.filter(assigned_to=user)

        # Show only overdue tasks
        if params.get('overdue') == 'true':
            qs = qs.filter(
                due_date__lt=self._get_today()
            ).exclude(status='done')

        return qs

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        # Create notification if assigned to someone else
        if task.assigned_to and task.assigned_to != self.request.user:
            Notification.objects.create(
                user=task.assigned_to,
                title="New Task Assigned",
                message=f"You have been assigned to: {task.title}",
                type='task_assignment'
            )

    def perform_update(self, serializer):
        old_task = self.get_object()
        task = serializer.save()
        # Create notification if assignment changed
        if task.assigned_to and task.assigned_to != old_task.assigned_to and task.assigned_to != self.request.user:
            Notification.objects.create(
                user=task.assigned_to,
                title="New Task Assigned",
                message=f"You have been assigned to: {task.title}",
                type='task_assignment'
            )

    def destroy(self, request, *args, **kwargs):
        """
        Only the task creator or a team owner can delete a task.
        """
        task = self.get_object()
        is_creator = task.created_by == request.user
        is_owner = TeamMembership.objects.filter(
            team=task.team, user=request.user, role='owner'
        ).exists()
        if not (is_creator or is_owner):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the task creator or team owner can delete this task.')
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ════════════════════════════════════════════════════════════
# 4. DASHBOARD VIEW
# ════════════════════════════════════════════════════════════

class DashboardView(APIView):
    """
    GET /api/dashboard/
    Returns summary statistics for the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localtime(timezone.now()).date()

        # Teams user belongs to
        user_teams = Team.objects.filter(memberships__user=user)

        # Tasks visible to user (from their teams)
        user_tasks = Task.objects.filter(team__memberships__user=user).distinct()

        # Proactively identify overdue tasks and create notifications
        overdue_tasks = user_tasks.filter(
            due_date__lt=today,
        ).exclude(status='done')

        due_today = user_tasks.filter(due_date=today).exclude(status='done')

        for task in overdue_tasks:
            # Notify ALL assigned users
            for assigned_user in task.assigned_to.all():
                # Check for existing notification for this task and user TODAY
                existing = Notification.objects.filter(
                    user=assigned_user,
                    type='overdue_task',
                    title__icontains=task.title,
                ).order_by('-created_at').first()

                # Notify once per day if still overdue
                should_notify = True
                if existing:
                    existing_local = timezone.localtime(existing.created_at).date()
                    if existing_local == today:
                        should_notify = False

                if should_notify:
                    Notification.objects.create(
                        user=assigned_user,
                        title=f"Overdue: {task.title}",
                        message=f"The task '{task.title}' was due on {task.due_date}.",
                        type='overdue_task'
                    )

        return Response({
            'teams_count': user_teams.count(),
            'tasks': {
                'total': user_tasks.count(),
                'todo': user_tasks.filter(status='todo').count(),
                'in_progress': user_tasks.filter(status='in_progress').count(),
                'done': user_tasks.filter(status='done').count(),
                'overdue': overdue_tasks.count(),
                'due_today': due_today.count(),
            },
            'my_tasks': {
                'total': user_tasks.filter(assigned_to=user).count(),
                'overdue': overdue_tasks.filter(assigned_to=user).count(),
            },
            'overdue_tasks': TaskSerializer(
                overdue_tasks[:5],  # Show all overdue tasks in user's teams
                many=True,
                context={'request': request},
            ).data,
        })




# ════════════════════════════════════════════════════════════
# 5. NOTIFICATION VIEWS
# ════════════════════════════════════════════════════════════

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/notifications/ – list unread
    POST /api/notifications/{id}/read/ – mark as read
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})

    @action(detail=False, methods=['post'])
    def read_all(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})
