# Agent Context & Developer Guidelines

This document serves as the persistent memory and guidelines for AI coding agents and developers working on the **MCA Placement Management System**. It outlines the project's architecture, database rules, offline handling mechanisms, and the requirements of the CI/CD build pipelines and deployment configurations.

---

## 1. Project Architecture

The project is structured as a Monorepo:
* **Frontend (`/frontend`)**: React + Vite + TypeScript + Tailwind CSS.
  - Fully configured as a Progressive Web App (PWA) using `vite-plugin-pwa` (injectManifest strategy).
  - Production builds output to `/frontend/dist`.
* **Backend (`/backend`)**: Node.js + Express + PostgreSQL.
  - Handles Google OAuth token verification and SPC credential-based login.
  - Provides APIs for company creation, student verification, dynamic form assignment, notifications, and chat messages.

---

## 2. CI/CD Pipeline & Build Integrity

The project runs a GitHub Actions workflow defined in [main_pipeline.yml](file:///.github/workflows/main_pipeline.yml) on push and pull requests to `main`.

### Workflow Steps:
1. **Backend Checks**: Installs dependencies in `backend/` and ensures package integrity.
2. **Frontend Checks**: Installs dependencies in `frontend/` and executes `npm run build` (runs Type-Check `tsc -b` followed by the Vite PWA bundling).

> [!IMPORTANT]
> **Strict Guideline for Agents**: Before finalizing any pull request or declaring a frontend task done, you **must** run:
> ```bash
> . ~/.nvm/nvm.sh && nvm use default && npm run build
> ```
> in the `/frontend` directory. If this build step fails due to typescript errors, missing package imports, or incorrect Vite configuration, the CI pipeline will break.

---

## 3. Production Deployment

Production deployment is orchestrated using Docker Compose (`docker-compose.yml`), which contains three services:
1. **database**: `postgres:15-alpine` running on port `5432`. Recreated from `backend/database/schema.sql` on startup.
2. **backend**: Express server running on port `4000` inside a container.
3. **frontend**: Built with static environment routing where requests to `/api/*` are directed to the backend service. Served on port `80`.

> [!WARNING]
> If you add new environment variables (e.g. for notifications or S3 buckets), you must update:
> - `backend/.env.example`
> - `frontend/.env.example`
> - `docker-compose.yml` (pass the environment variable mappings to the containers)

---

## 4. Offline Capabilities & Service Worker Caching

The app supports complete offline capabilities via a service worker at [sw.ts](file:///frontend/src/sw.ts) and a client IndexedDB wrapper [offlineDb.ts](file:///frontend/src/lib/offlineDb.ts).

### Caching Behaviors:
* **Network-First (`api-cache`)**: Applied to GET requests under `/api/...` (excluding `/export` download endpoints). It fetches from the server, updates the cache, and falls back to cache instantly if the network fails or times out (5s).
* **Cache-First (`api-file-cache`)**: Applied to media and static uploads (e.g. `/resumes/*`, `/attachments/*`, `/profile-pictures/*`). Served instantly from cache.
* **IndexedDB Store (`PlacementOfflineDB`)**:
  - `config`: Stores auth tokens and API configurations.
  - `requests`: Queues POST/PUT/DELETE mutations made offline. Replayed automatically on network reconnect via Service Worker `sync-api-requests`.
  - `syncCache`: Stores cache state for push notifications.

### Data Privacy & Logout:
When logout is initiated in [useAuthStore.ts](file:///frontend/src/store/useAuthStore.ts):
1. **Caches Cleared**: The browser's cache storage deletes both `api-cache` and `api-file-cache`.
2. **IndexedDB Cleared**: Calls `clearOfflineData()` to wipe queued background requests and notification tags.
This prevents session and data leakages between students sharing the same browser/device.

### State Preservation & Draft Persistence:
To prevent students from losing their inputs when they accidentally refresh or navigate away:
- **Active Navigation Tab**: Stored as a string key (`dashboard_active_panel`) in `localStorage` and restored automatically on refresh in `DashboardScreen.tsx`.
- **Profile Edits**: The profile draft state is persisted via Zustand's `persist` middleware (`rvce-profile-storage`) in `useProfileStore.ts`.
- **Dynamic Form Answers**: Partially entered answers to assigned forms are stored in `localStorage` (`form_draft_<id>`) in `DynamicFormModal.tsx` and deleted only when responses are successfully submitted.
- **Chat Draft Message**: Draft chat message text is cached in `localStorage` (`chat_draft_msg`) in `ChatPanel.tsx` and cleared once sent.
On logout, all these keys are purged from `localStorage` along with the session.

### UI Status Indicator:
* A `useOnlineStatus` hook in [App.tsx](file:///frontend/src/App.tsx) triggers a top-anchored, translucent warning banner when the browser detects that connection is lost, informing the student they are viewing cached data.

---

## 5. Development Guidelines for Agents
- **No Schema Changes**: Always work with the existing database schema defined in `schema.sql`. For complex tasks, encode data (e.g. JSON or delimited strings) into existing columns to preserve schema compatibility unless database migrations are explicitly requested.
- **Maintain TypeScript Typing**: Keep React components and state stores typed strictly. Do not use `any` unless absolutely unavoidable.
- **Clean Diffs**: Avoid modifying unrelated blocks of code. When making changes, prefer targeting the exact line bounds using code replacing tools.
- **Verify Build Output**: Never assume the application compiles. Always run build checks after changes.
