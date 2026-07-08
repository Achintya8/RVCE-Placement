# MCA Placement Management System

Full-stack MCA Placement Management System scaffolded as a monorepo with:

- `frontend/`: React + Vite + TypeScript frontend using modern UI/UX principles
- `backend/`: Node.js + Express + PostgreSQL REST API with JWT auth, Excel export, AWS S3 upload, and FCM integration points

## What is implemented

- Student Google sign-in flow wired to backend token verification
- SPC username/password login with bcrypt password matching
- Shared user identity model so SPC remains an extension of the same `users` row
- Student profile editing with verification lock
- Resume upload and replacement via AWS S3
- Companies listing with consent and tracker actions
- Dynamic forms powered by:
  - `forms`
  - `form_questions`
  - `form_question_map`
  - `form_responses`
- SPC flows for:
  - company creation
  - reusable question creation
  - form creation
  - question mapping
  - student verification
  - response viewing
  - Excel export
- FCM-ready notification flow using per-user topics so the database schema stays unchanged

## Schema

The SQL was copied exactly from your provided file into:

- [backend/database/schema.sql](file:///c:/Users/achin/RVCE-Placement/backend/database/schema.sql)

No table structure was changed.

## Important implementation notes

### 1. No duplicate users

Google login first tries:

- `google_id`
- then existing `college_email_id` / `personal_email_id`

If an existing row matches the email, the backend attaches the Google identity to that same user instead of creating a duplicate.

### 2. SPC remains linked to the same user

`spc_accounts.user_id` is treated as an extension of a student account, not a separate identity.

### 3. Dropdown questions without altering schema

Because the schema has no dedicated options table, dropdown options are encoded into `form_questions.question_text` by the backend and decoded back into:

- `questionText`
- `options`

The database shape remains unchanged.

### 4. Notifications without adding token columns

The app subscribes to `user_<id>` Firebase topics after login. The backend sends notifications to those topics, so no extra FCM token column is needed in PostgreSQL.

## Backend setup

1. Create the database and run:

```sql
\i backend/database/schema.sql
```

2. Copy:

```bash
backend/.env.example
```

to:

```bash
backend/.env
```

3. Install backend dependencies:

```bash
cd backend
npm install
```

4. Start the API:

```bash
npm run dev
```

5. Configure S3 values in `backend/.env`:

- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_FOLDER`
- Optional: `AWS_S3_ENDPOINT`, `AWS_S3_FORCE_PATH_STYLE`, `AWS_S3_PUBLIC_BASE_URL`

### Useful helper

To generate an SPC password hash:

```bash
cd backend
node scripts/hash-spc-password.mjs your-password
```

Then insert the hashed password into `spc_accounts.password`.

## Frontend setup (React + Vite)

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Update API base URL if needed:

- [frontend/src/config.ts](file:///c:/Users/achin/RVCE-Placement/frontend/src/config.ts)

Default: `http://localhost:4000/api`

3. Start the dev server:

```bash
npm run dev
```

## API summary

- `POST /api/auth/google`
- `POST /api/auth/spc/login`
- `GET /api/auth/me`
- `GET /api/users/me`
- `PUT /api/users/me`
- `POST /api/users/me/resume`
- `GET /api/users/students`
- `POST /api/users/students/:id/verify`
- `GET /api/companies`
- `POST /api/companies`
- `GET /api/companies/:id`
- `GET /api/companies/:id/eligible-students`
- `GET /api/companies/:id/export`
- `PUT /api/applications/company/:companyId`
- `GET /api/forms`
- `GET /api/forms/assigned/me`
- `GET /api/forms/:id`
- `POST /api/forms`
- `POST /api/forms/:id/questions`
- `POST /api/forms/:id/send`
- `GET /api/questions`
- `POST /api/questions`
- `POST /api/responses/forms/:formId`
- `GET /api/responses/forms/:formId`

## Files to start with

- [backend/src/server.js](file:///c:/Users/achin/RVCE-Placement/backend/src/server.js)
- [frontend/src/main.tsx](file:///c:/Users/achin/RVCE-Placement/frontend/src/main.tsx)
- [frontend/src/App.tsx](file:///c:/Users/achin/RVCE-Placement/frontend/src/App.tsx)

---

## Docker Deployment

The entire stack (PostgreSQL, MongoDB, Backend API, Frontend) is fully containerized and published to **GitHub Container Registry**.

### Quick Start (Pull pre-built images)

```bash
# 1. Clone the repo (needed for schema.sql and docker-compose file)
git clone https://github.com/Achintya8/RVCE-Placement.git
cd RVCE-Placement

# 2. Set up environment
cp .env.docker .env
# Edit .env with your actual passwords and secrets

# 3. Pull and run
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The app will be available at **http://localhost:3000**.

### Build Locally

```bash
# Build all images from source
docker compose -f docker-compose.prod.yml build

# Start the stack
docker compose -f docker-compose.prod.yml up -d
```

### Published Images

| Image | Registry |
|-------|----------|
| Backend API | `ghcr.io/achintya8/rvce-placement-backend:latest` |
| Frontend (Nginx) | `ghcr.io/achintya8/rvce-placement-frontend:latest` |

### Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop all services
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes (⚠️ deletes all data)
docker compose -f docker-compose.prod.yml down -v

# Rebuild a single service
docker compose -f docker-compose.prod.yml build backend
```

### CI/CD

Images are automatically built and pushed to GHCR on every push to `main` via the [docker-publish.yml](.github/workflows/docker-publish.yml) GitHub Actions workflow.

