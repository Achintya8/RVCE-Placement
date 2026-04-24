# MCA Placement Management System

Full-stack MCA Placement Management System scaffolded as a monorepo with:

- `frontend/`: Flutter app using Riverpod, Google Sign-In, Dio, and Firebase Messaging hooks
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

- [backend/database/schema.sql](/C:/Users/achin/RVCE-Placement/backend/database/schema.sql)

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

## Flutter setup

1. Install Flutter dependencies:

```bash
cd frontend
flutter pub get
```

2. Update API base URL if needed:

- [frontend/lib/src/core/config/app_config.dart](/C:/Users/achin/RVCE-Placement/frontend/lib/src/core/config/app_config.dart)

Default:

- Android emulator: `http://10.0.2.2:4000/api`

3. Add Google Sign-In platform config for Android/iOS/web.

4. Add Firebase platform config files for FCM:

- `google-services.json`
- `GoogleService-Info.plist`

5. Run the app:

```bash
flutter run
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

- [backend/src/server.js](/C:/Users/achin/RVCE-Placement/backend/src/server.js)
- [backend/src/routes/index.js](/C:/Users/achin/RVCE-Placement/backend/src/routes/index.js)
- [frontend/lib/src/ui/home_screen.dart](/C:/Users/achin/RVCE-Placement/frontend/lib/src/ui/home_screen.dart)
- [frontend/lib/src/ui/dashboard_screen.dart](/C:/Users/achin/RVCE-Placement/frontend/lib/src/ui/dashboard_screen.dart)
