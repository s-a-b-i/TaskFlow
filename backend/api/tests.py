"""
Backend test suite for Team Task Manager API.

Tests cover:
  - User registration & login/logout
  - Team CRUD with membership enforcement
  - Task CRUD with filtering
  - Permission enforcement (owner-only ops)
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import User, Team, TeamMembership, Task


def create_user(email='test@example.com', username='testuser', password='SecurePass123!'):
    """Helper to create a test user."""
    return User.objects.create_user(
        email=email, username=username,
        first_name='Test', last_name='User',
        password=password,
    )


class AuthTests(TestCase):
    """Tests for register / login / logout / me endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user_and_session(self):
        response = self.client.post(reverse('auth-register'), {
            'email': 'new@example.com',
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'SecurePass123!',
            'confirm_password': 'SecurePass123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertTrue(User.objects.filter(email='new@example.com').exists())

    def test_register_password_mismatch_returns_400(self):
        response = self.client.post(reverse('auth-register'), {
            'email': 'bad@example.com',
            'username': 'baduser',
            'first_name': 'Bad',
            'last_name': 'User',
            'password': 'SecurePass123!',
            'confirm_password': 'WrongPass!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_valid_credentials(self):
        create_user()
        response = self.client.post(reverse('auth-login'), {
            'email': 'test@example.com',
            'password': 'SecurePass123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)

    def test_login_invalid_credentials_returns_400(self):
        response = self.client.post(reverse('auth-login'), {
            'email': 'nobody@example.com',
            'password': 'wrongpassword',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_returns_current_user(self):
        user = create_user()
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse('auth-me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)

    def test_me_unauthenticated_returns_403(self):
        response = self.client.get(reverse('auth-me'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_logout_clears_session(self):
        user = create_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse('auth-logout'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TeamTests(TestCase):
    """Tests for team creation, retrieval, and membership management."""

    def setUp(self):
        self.client = APIClient()
        self.owner = create_user()
        self.member = create_user('member@example.com', 'memberuser')
        self.client.force_authenticate(user=self.owner)

    def _create_team(self, name='Alpha Team'):
        response = self.client.post('/api/teams/', {'name': name, 'description': 'Test'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data['id']

    def test_create_team_makes_creator_owner(self):
        team_id = self._create_team()
        self.assertTrue(
            TeamMembership.objects.filter(
                team_id=team_id, user=self.owner, role='owner'
            ).exists()
        )

    def test_list_teams_only_shows_user_teams(self):
        self._create_team('Owner Team')
        # Other team the owner is NOT in
        other_owner = create_user('other@example.com', 'other')
        other_team = Team.objects.create(name='Other Team', creator=other_owner)
        TeamMembership.objects.create(team=other_team, user=other_owner, role='owner')

        response = self.client.get('/api/teams/')
        team_names = [t['name'] for t in response.data]
        self.assertIn('Owner Team', team_names)
        self.assertNotIn('Other Team', team_names)

    def test_add_member(self):
        team_id = self._create_team()
        response = self.client.post(
            f'/api/teams/{team_id}/add_member/',
            {'email': self.member.email},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            TeamMembership.objects.filter(team_id=team_id, user=self.member).exists()
        )

    def test_non_owner_cannot_delete_team(self):
        team_id = self._create_team()
        TeamMembership.objects.create(
            team_id=team_id, user=self.member, role='member'
        )
        self.client.force_authenticate(user=self.member)
        response = self.client.delete(f'/api/teams/{team_id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_team(self):
        team_id = self._create_team()
        response = self.client.delete(f'/api/teams/{team_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class TaskTests(TestCase):
    """Tests for task CRUD and filter operations."""

    def setUp(self):
        self.client = APIClient()
        self.owner = create_user()
        self.member = create_user('member@example.com', 'memberuser')
        self.client.force_authenticate(user=self.owner)

        # Create a team with both users
        self.team = Team.objects.create(name='Task Team', creator=self.owner)
        TeamMembership.objects.create(team=self.team, user=self.owner, role='owner')
        TeamMembership.objects.create(team=self.team, user=self.member, role='member')

    def _create_task(self, title='Fix bug', assigned_to_id=None):
        payload = {
            'title': title,
            'description': 'A task',
            'status': 'todo',
            'priority': 'medium',
            'team': self.team.id,
        }
        if assigned_to_id:
            payload['assigned_to_ids'] = [assigned_to_id]
        return self.client.post('/api/tasks/', payload, format='json')

    def test_create_task_succeeds(self):
        response = self._create_task()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Fix bug')

    def test_create_task_assigns_created_by(self):
        response = self._create_task()
        self.assertEqual(response.data['created_by']['id'], self.owner.id)

    def test_filter_by_team(self):
        self._create_task('Team Task')
        response = self.client.get(f'/api/tasks/?team={self.team.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_filter_by_status(self):
        self._create_task('Todo Task')
        response = self.client.get('/api/tasks/?status=todo')
        self.assertTrue(all(t['status'] == 'todo' for t in response.data))

    def test_search_by_title(self):
        self._create_task('Unique Task XYZ123')
        response = self.client.get('/api/tasks/?search=XYZ123')
        self.assertTrue(any('XYZ123' in t['title'] for t in response.data))

    def test_update_task_status(self):
        resp = self._create_task()
        task_id = resp.data['id']
        response = self.client.patch(f'/api/tasks/{task_id}/', {'status': 'done'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'done')

    def test_delete_task_by_creator(self):
        resp = self._create_task()
        task_id = resp.data['id']
        response = self.client.delete(f'/api/tasks/{task_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_non_member_cannot_access_tasks(self):
        outsider = create_user('out@example.com', 'outsider')
        self.client.force_authenticate(user=outsider)
        response = self.client.get('/api/tasks/')
        # Outsider gets empty list (not their teams)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
