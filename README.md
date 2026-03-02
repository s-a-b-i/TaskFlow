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

## Deployment to Google Cloud Platform (GCP)

This project is tailored for **Cloud Run** and **Cloud SQL (PostgreSQL)**.

### Prerequisites
1. Install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
2. Authenticate: `gcloud auth login`
3. Set your project: `gcloud config set project YOUR_PROJECT_ID`

### 1. Database (Cloud SQL)
- Create a Cloud SQL PostgreSQL instance.
- Create a database (`taskmanager`) and a user (`taskmanager_user`).
- Note the **Instance Connection Name**.

### 2. Backend Deployment (Cloud Run)
Cloud Run requires the app image to be pushed to Artifact Registry first.

```bash
cd backend

# Create a .env.prod file based on .env.example with your Cloud SQL Details
# Make sure to set `DEBUG=False` and configure `ALLOWED_HOSTS`

# Build and Push Container using Google Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/taskmanager-backend

# Deploy to Cloud Run
gcloud run deploy taskmanager-backend \
  --image gcr.io/YOUR_PROJECT_ID/taskmanager-backend \
  --platform managed \
  --region us-central1 \
  --add-cloudsql-instances YOUR_PROJECT_ID:REGION:INSTANCE_NAME \
  --set-env-vars="DB_HOST=/cloudsql/YOUR_PROJECT_ID:REGION:INSTANCE_NAME,DB_ENGINE=django.db.backends.postgresql,DEBUG=False" \
  --allow-unauthenticated
```
*Note your Backend URL when done.*

### 3. Frontend Deployment (Firebase Hosting or Cloud Run)
Update `./frontend/src/lib/api.js` to point `baseURL` to your deployed Cloud Run backend URL instead of `/api` if CORS issues arise.

**Option A: Firebase Hosting (Recommended for React SPA)**
```bash
cd frontend
npm run build
npm install -g firebase-tools
firebase login
firebase init hosting # Select output directory as "dist"
firebase deploy
```

**Option B: Cloud Run (Using the provided Dockerfile + Nginx)**
```bash
cd frontend
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/taskmanager-frontend
gcloud run deploy taskmanager-frontend --image gcr.io/YOUR_PROJECT_ID/taskmanager-frontend --platform managed --allow-unauthenticated --port 80
```
