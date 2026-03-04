# Team Task Manager

A full-stack web application for managing team tasks. Built with React (Vite, Tailwind CSS, Zustand, React Query) and Django REST Framework (PostgreSQL).

## Features
- **Authentication**: Secure registration & login with HTTP-only session cookies.
- **Workspaces (Teams)**: Create workspaces and invite members by email.
- **Role-Based Access**: Only the workspace owner can delete the team or remove members.
- **Tasks**: Create, edit, delete, and assign tasks across 3 Kanban-style columns.
- **Filtering**: Advanced URL-driven filtering by status, priority, assignee, and overdue status.

## Required Software
- Node.js 20+
- Python 3.11+
- Git

## Local Development (Without Docker)

### 1. Backend Setup
The backend is configured to use SQLite by default for zero-config local development.

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations to create SQLite database
python manage.py migrate

# Run development server
python manage.py runserver
```
*Backend runs on `http://localhost:8000`*

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```
*Frontend runs on `http://localhost:5173`.* API calls are automatically proxied to the Django backend.

---

## Local Development (With Docker)
To test the production-like setup with PostgreSQL locally:

```bash
# Build and start all services (Frontend, Backend, DB)
docker-compose up --build
```
*Frontend is exposed on port `5173`. Backend on `8000`. Database on `5432`.*

---

## API Documentation

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register/` | POST | Register new user | No |
| `/api/auth/login/` | POST | Login and receive session | No |
| `/api/auth/logout/` | POST | Clear session | Yes |
| `/api/auth/me/` | GET | Get current user profile | Yes |
| `/api/dashboard/` | GET | Stats & overdue list | Yes |
| `/api/teams/` | GET/POST | List/Create teams | Yes |
| `/api/teams/{id}/` | GET/PATCH/DELETE | Retrieve, update, or delete team | Yes (Owner to delete) |
| `/api/teams/{id}/add_member/` | POST | Invite user by email | Yes (Owner only) |
| `/api/teams/{id}/remove_member/` | POST | Remove user from team | Yes (Owner only) |
| `/api/tasks/` | GET/POST | List (with query filters) / Create | Yes |
| `/api/tasks/{id}/` | PATCH/DELETE | Update / Delete task | Yes |


---

## API Documentation

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register/` | POST | Register new user | No |
| `/api/auth/login/` | POST | Login and receive session | No |
| `/api/auth/logout/` | POST | Clear session | Yes |
| `/api/auth/me/` | GET | Get current user profile | Yes |
| `/api/dashboard/` | GET | Stats & overdue list | Yes |
| `/api/teams/` | GET/POST | List/Create teams | Yes |
| `/api/teams/{id}/` | GET/PATCH/DELETE | Retrieve, update, or delete team | Yes (Owner to delete) |
| `/api/teams/{id}/add_member/` | POST | Invite user by email | Yes (Owner only) |
| `/api/teams/{id}/remove_member/` | POST | Remove user from team | Yes (Owner only) |
| `/api/tasks/` | GET/POST | List (with query filters) / Create | Yes |
| `/api/tasks/{id}/` | PATCH/DELETE | Update / Delete task | Yes |
