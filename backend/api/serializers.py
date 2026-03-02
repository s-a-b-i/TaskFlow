"""
DRF Serializers for Team Task Manager.

Each serializer handles validation and data transformation
between JSON request/response and Django model instances.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Task, Team, TeamMembership, User, Notification


# ────────────────────────────────────────────────────────────
# Notification Serializers
# ────────────────────────────────────────────────────────────
class NotificationSerializer(serializers.ModelSerializer):
    """Full notification representation."""

    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'type', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


# ────────────────────────────────────────────────────────────
# User / Auth Serializers
# ────────────────────────────────────────────────────────────
class UserPublicSerializer(serializers.ModelSerializer):
    """Minimal user representation exposed in nested contexts (e.g., tasks)."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    """Validates and creates a new user account."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'confirm_password']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        # create_user hashes the password via Django's built-in hasher
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """Validates login credentials and returns the authenticated user."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            email=attrs['email'],
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account has been disabled.')
        attrs['user'] = user
        return attrs


# ────────────────────────────────────────────────────────────
# Team Serializers
# ────────────────────────────────────────────────────────────
class TeamMembershipSerializer(serializers.ModelSerializer):
    """Membership detail including full user info."""

    user = UserPublicSerializer(read_only=True)

    class Meta:
        model = TeamMembership
        fields = ['id', 'user', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class TeamSerializer(serializers.ModelSerializer):
    """Full team representation including members and creator."""

    creator = UserPublicSerializer(read_only=True)
    members = TeamMembershipSerializer(source='memberships', many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            'id', 'name', 'description', 'creator',
            'members', 'member_count', 'user_role',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'creator', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_user_role(self, obj):
        """Return the requesting user's role in this team."""
        request = self.context.get('request')
        if request:
            membership = obj.memberships.filter(user=request.user).first()
            return membership.role if membership else None
        return None


class TeamCreateSerializer(serializers.ModelSerializer):
    """Minimal serializer for creating a new team."""

    class Meta:
        model = Team
        fields = ['name', 'description']

    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError('Team name must be at least 2 characters.')
        return value.strip()


class AddMemberSerializer(serializers.Serializer):
    """Used to add a user to a team by their email address."""

    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('No user found with this email address.')
        self.user = user
        return value


class RemoveMemberSerializer(serializers.Serializer):
    """Used to remove a member from a team by user ID."""

    user_id = serializers.IntegerField()
    force = serializers.BooleanField(default=False)


# ────────────────────────────────────────────────────────────
# Task Serializers
# ────────────────────────────────────────────────────────────
class TaskSerializer(serializers.ModelSerializer):
    """Full task representation with nested user info."""

    created_by = UserPublicSerializer(read_only=True)
    assigned_to = UserPublicSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assigned_to',
        allow_null=True,
        required=False,
        write_only=True,
    )
    team_name = serializers.CharField(source='team.name', read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority', 'due_date',
            'team', 'team_name', 'assigned_to', 'assigned_to_id',
            'created_by', 'is_overdue', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_is_overdue(self, obj):
        """Flag tasks past their due date that are not yet done."""
        from django.utils import timezone
        if obj.due_date and obj.status != 'done':
            return obj.due_date < timezone.now().date()
        return False

    def validate(self, attrs):
        request = self.context.get('request')
        team = attrs.get('team') or (self.instance.team if self.instance else None)

        # Ensure the user is a member of the target team
        if team and request:
            is_member = TeamMembership.objects.filter(
                team=team, user=request.user
            ).exists()
            if not is_member:
                raise serializers.ValidationError(
                    {'team': 'You must be a member of this team to create tasks here.'}
                )

        # Ensure the assigned user is a member of the team
        assigned_to = attrs.get('assigned_to')
        if assigned_to and team:
            is_member = TeamMembership.objects.filter(
                team=team, user=assigned_to
            ).exists()
            if not is_member:
                raise serializers.ValidationError(
                    {'assigned_to_id': 'Assignee must be a member of the team.'}
                )

        return attrs
