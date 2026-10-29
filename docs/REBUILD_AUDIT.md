# MaskChat Rebuild Audit

## Reference archive reviewed
Archive: `maskchat-vercel-ready (3).zip` (88 archive entries; top-level project `maskchatfix/`).

## Existing architecture observed
- React 18 + Vite frontend, with Socket.IO client.
- Express 4 + Socket.IO server.
- A storage abstraction with an in-memory store and optional Redis coordination.
- Optional PostgreSQL durable storage for selected records.
- Institution configuration, OIDC helpers, moderation/alerts, pilot operations, observability, and a sizeable server test suite.
- Existing UI is concentrated in `client/src/main.jsx` and `client/src/styles.css`; static admin pages also exist.
- Existing README explicitly says the default server state is in-memory and lost on restart. This is not durable chat/session persistence.

## Preserve/reimplement
- Anonymous aliases and identity separation.
- Mentor availability and matching.
- One-to-one/group conversation concepts.
- Message filtering, reports, blocks, moderator workflows.
- Institution-aware signup and OIDC extension point.
- Dark UI visual identity and responsive design.
- Operational health checks, deployment documentation, CI, and meaningful tests.

## Risks and gaps to address in the new architecture
- Existing implementation is not MERN: no MongoDB/Mongoose dependency in the inspected manifests; PostgreSQL is used for some durable records.
- Default in-memory state cannot meet durable session/message requirements across restarts.
- Large monolithic client module makes feature ownership and testing harder.
- Production authentication and SSO require real institutional configuration; do not claim they are configured by default.
- Moderation filters are a first-pass safety layer, not a guarantee.
- Deployment must split Vercel-hosted static frontend from a persistent WebSocket-capable backend.

## Target architecture
- `client/`: React + Vite + React Router + Socket.IO client.
- `server/`: Express, Socket.IO, Mongoose/MongoDB, Zod, cookie-based signed JWT session, bcrypt password hashing.
- MongoDB collections: User, MentorProfile, Session, Conversation, Message, Report, UserBlock, Notification, AuditLog.
- Development auth is explicit and disabled in production unless configured.
- Server-side role/resource authorization for protected APIs and socket events.

## Acceptance criteria
1. Frontend production build succeeds.
2. Backend starts with validated environment configuration.
3. Health/readiness endpoints expose MongoDB readiness.
4. Authentication returns an HttpOnly cookie and protected routes reject anonymous requests.
5. Mentor discovery and matching use database records.
6. Messages are authorized, persisted in MongoDB, paginated, and sent through Socket.IO.
7. Reporting and blocking persist to MongoDB.
8. Admin/moderator routes require a moderator/admin role.
9. Dark/light theme preference persists locally.
10. Tests cover core API, auth, matching, and socket authorization.

## Known external dependencies
- MongoDB URI and network allowlist.
- Production cookie secret and frontend origin.
- Optional institutional OIDC issuer/client credentials.
- A persistent backend host that supports WebSockets.
- Optional email/SMS provider for real verification and reminders.
