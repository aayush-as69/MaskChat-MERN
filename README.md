# MaskChat — MERN Rebuild

A privacy-first peer mentorship platform. This repository is a clean MERN reimplementation based on the uploaded MaskChat reference archive.

## Stack
- React 18 + Vite + React Router
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO for authenticated real-time messaging
- Zod validation, HttpOnly JWT session cookies, bcrypt password hashing
- Vitest / Node test runner

## Requirements
- Node.js 20+
- npm 10+
- MongoDB locally or MongoDB Atlas

## Quick start
1. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.
2. Set `MONGODB_URI` in `server/.env` to your MongoDB connection string.
3. Install dependencies from the repository root:
   ```bash
   npm install
   ```
4. Start the API and frontend in separate terminals:
   ```bash
   npm run dev:server
   npm run dev:client
   ```
5. Open `http://localhost:5173`.

The API defaults to `http://localhost:4000`. The Vite client proxies no API requests automatically; set `client/.env` with `VITE_API_URL=http://localhost:4000` if needed.

## Demo seed data
With MongoDB running and `.env` configured:
```bash
npm run seed
```
Demo accounts (development only):
- `student@demo.edu` / `StudentDemo123!`
- `mentor@demo.edu` / `MentorDemo123!`
- `moderator@demo.edu` / `ModeratorDemo123!`
- `admin@demo.edu` / `AdminDemo123!` (mentor verification review UI)

These accounts are for local demonstrations only. Do not deploy them or use their passwords in production. Seeded mentor is available. Demo records are only created by running the seed script.

## Build and tests
```bash
npm run build
npm test
```
The test suite includes matching unit tests, health/auth-protection checks, and CSRF origin/token regression tests. It does not yet constitute full end-to-end verification of every workflow. MongoDB-backed API and Socket.IO flows must be tested against a dedicated test database before production use. Run `npm test` and `npm run build` after installing dependencies.

## Features implemented in this rebuild
- Registration/login/logout with HttpOnly session cookie and password hashing.
- Role-protected student, mentor, and moderator views.
- Mentor discovery with deterministic topic/institution/availability matching.
- Session request, accept/decline, start, cancel, and completion transitions.
- Conversation creation when a session is accepted.
- Socket.IO chat with membership checks, persisted messages, duplicate client-message protection, and privacy-oriented content checks.
- Reports, blocks, notifications, moderator report review, and audit entries for report updates.
- Mentor application workflow with private institutional ID upload, admin review, approval gating, suspension/revocation, and junior mentor recommendations.
- Institution-scoped community forum with categories, posts, replies, helpful votes, accepted-answer endpoint, and reporting.
- Optional server-side AI Study Assistant using an OpenAI-compatible provider; API keys remain on the backend.
- Responsive dark-first UI and persisted light/dark theme preference.
- Health and database readiness endpoints.

## Important limitations
- Institutional verification and OIDC/SSO are not connected to a real institution. Development registration is explicitly local-only; production registration is disabled and production sessions reject users without a trusted `institutionVerifiedAt` timestamp. Implement and test real institutional SSO before production use.
- Email, SMS, reminders, external AI moderation, and external notification providers are not configured. AI Study Assistant requires `AI_API_KEY` and has not been live-tested.
- Group sessions now support multiple participants, scheduling, capacity limits, join deadlines, invitations, shared chat, and host lifecycle controls. These flows still require full runtime/end-to-end testing before production use.
- ID files use a private filesystem adapter. Production requires a private persistent volume or a private object-storage adapter plus a retention/deletion policy. ID images are not automatically authenticated by software.
- Report evidence is validated against conversation membership and message authorship. Blocking is enforced in matching, session requests/transitions, and chat sends. UI-level report/block shortcuts and automated ban/suspension controls still need completing.
- Redis-based distributed Socket.IO coordination is not configured. Use one persistent backend instance unless you configure and test a compatible adapter.
- Production readiness is not asserted until deployment secrets, database access rules, full integration tests, security review, and hosting smoke tests are completed.

## Deployment overview
- Deploy `client/` to Vercel as a Vite static site. Set `VITE_API_URL` to the HTTPS backend origin and configure SPA rewrites.
- Deploy `server/` to a persistent Node host supporting WebSockets (for example, Render, Railway, or a VM). Set `MONGODB_URI`, `CLIENT_ORIGIN`, `COOKIE_SECRET`, `COOKIE_SECURE=true`, `ALLOW_DEV_AUTH=false`, `NODE_ENV=production`, and `PORT` as required by the host.
- Use a same-site frontend/backend domain arrangement where possible. State-changing browser API calls require the configured frontend Origin and a double-submit CSRF token. Verify cookie and CSRF behavior on the final domains before production.
- Add MongoDB Atlas database users with least privilege and a restricted network access policy. Never commit secrets.

## Reference
See `docs/FEATURE_PARITY_AUDIT.md`, `docs/MENTOR_VERIFICATION.md`, `docs/AI_INTEGRATION.md`, `docs/FINAL_TEST_REPORT.md`, `docs/REVIEW_REFINEMENTS.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY_PRIVACY.md`, `docs/SSO_SETUP.md`, and `docs/TESTING.md`.


## Matching queue, group sessions, and operations

The MERN build now includes a persisted mentor-matching queue with institution and block checks, approved-mentor eligibility, ranked candidate offers, 15-minute offer expiry, mentor accept/decline, requester cancellation/refresh, and a background worker that retries queued requests. The worker is intended for a single active backend instance until distributed locking/worker deployment is validated. Stale queue claims and interrupted acceptance flows have recovery logic, but it has not yet been stress-tested.

Approved mentors can manage their availability and session formats from **Group sessions**, create capacity-limited group sessions, set a join deadline, invite same-institution accounts, and start, complete, update, or cancel a session. Group conversations include joined participants.

Admins can open **Operations & alerts** to view bounded HTTP/socket latency and error metrics, process memory/event-loop telemetry, threshold alerts, pilot-readiness gates, and a persistent incident log. Metrics are process-local and reset on restart; configure an external metrics store and alert delivery before a real pilot.

Daily rotating aliases are intentionally excluded. MaskChat continues to use each user's stable anonymous display alias.

See [`docs/MATCHING_GROUPS_OPERATIONS.md`](docs/MATCHING_GROUPS_OPERATIONS.md) for routes, behavior, configuration, and limitations.

If upgrading a database that was used with an earlier build, run `npm --workspace server run migrate:message-idempotency` once with the intended `MONGODB_URI` before deploying the updated messaging code. See [`docs/TESTING.md`](docs/TESTING.md).
