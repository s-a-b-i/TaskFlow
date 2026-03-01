"""
Data models for Team Task Manager.

Models:
  - User: extends AbstractUser with email as the primary identifier
  - Team: a group/workspace with a designated creator/owner
  - TeamMembership: many-to-many between User and Team with role tracking
  - Task: work item assigned within a team
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    Custom user model using email as the unique identifier for authentication.
    Django's built-in password hashing (PBKDF2/bcrypt-compatible) is used.
    """
    email = models.EmailField(unique=True)

    # Make email the login field instead of username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email


class Team(models.Model):
    """
    A team/workspace that groups members and tasks together.
    The creator is automatically given the 'owner' role in TeamMembership.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_teams',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teams'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class TeamMembership(models.Model):
    """
    Many-to-many join table between User and Team, with a role field
    to distinguish owners from regular members.
    """
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('member', 'Member'),
    ]

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'team_memberships'
        unique_together = ('team', 'user')   # Prevent duplicate memberships
        indexes = [
            models.Index(fields=['team', 'user']),
        ]

    def __str__(self):
        return f'{self.user.email} → {self.team.name} ({self.role})'


class Task(models.Model):
    """
    A work item belonging to a team, optionally assigned to a team member.
    """
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateField(null=True, blank=True)

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='tasks',
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_tasks',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['team', 'status']),
            models.Index(fields=['assigned_to']),
        ]

    def __str__(self):
        return f'{self.title} [{self.status}]'
