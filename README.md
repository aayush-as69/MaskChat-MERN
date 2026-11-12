# MaskChat — MERN

> **Privacy-first peer mentorship for verified campus communities.**

MaskChat connects students with approved senior mentors without exposing their identities to each other. This MERN implementation provides institution-scoped matching, real-time conversations, mentor verification, moderation, community features, group sessions and an optional AI study assistant.

## Core features

| Area | Implementation |
|---|---|
| Authentication | HttpOnly session cookies, password hashing, CSRF/origin protection |
| Identity privacy | Stable anonymous display aliases and identity separation |
| Mentor verification | Institutional ID upload, admin review, approval, suspension and revocation |
| Matching | Institution/topic/availability matching plus persisted queue and ranked offers |
| Mentoring | 1:1 sessions, group sessions, invitations, capacity and lifecycle controls |
| Realtime | Authenticated Socket.IO rooms with membership checks |
| Safety | Content checks, reports, blocks, moderation and audit events |
| Community | Institution-scoped forum with posts, replies, votes and accepted answers |
| AI | Optional server-side AI Study Assistant |
| Operations | Health/readiness endpoints, bounded metrics and incident records |

## Architecture

~~~text
React + Vite
      │
      ├── REST ───────────────┐
      └── Socket.IO ──────────┤
                               ▼
                         Express / Node
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
          Auth/RBAC         Matching         Moderation
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                         MongoDB/Mongoose
~~~

The backend is the security boundary. UI controls are not authorization controls.

## Project structure

~~~text
client/       React 18 + Vite frontend
server/       Express API, auth, matching, moderation and Socket.IO
docs/         Architecture, security, testing and operations documentation
scripts/      Seed, migration, backup and verification utilities
deploy/       Deployment and reverse-proxy configuration
~~~

## Quick start

Requirements: Node.js 20+, npm 10+, and MongoDB locally or MongoDB Atlas.

~~~bash
npm install
~~~

Copy server/.env.example to server/.env and client/.env.example to client/.env. Set MONGODB_URI in the server environment.

~~~bash
npm run dev:server
npm run dev:client
~~~

Open http://localhost:5173. The API normally runs on http://localhost:4000.

### Local demo

~~~bash
npm run seed
~~~

Seed credentials are for local development only and must never be deployed.

## Public demo mode

DEMO_MODE can expose a controlled Try the demo flow. Demo accounts are isolated to Demo University and cannot perform sensitive actions such as mentor verification or ID uploads. Demo sessions are temporary and are invalidated when demo mode is disabled.

## Security

- Server-side role and institution checks.
- HttpOnly session cookies and bcrypt password hashing.
- Origin validation and CSRF protection for state-changing browser requests.
- Socket.IO membership checks before message delivery.
- Mentor approval required before mentor capabilities become active.
- Private storage is required for institutional ID images in production.
- MongoDB Atlas should use least-privilege credentials and restricted network access.
- Secrets must remain outside source control.

See docs/SECURITY_PRIVACY.md before deployment.

## Testing

~~~bash
npm test
npm run build
~~~

The repository includes server unit/security regression tests and frontend build validation. Production readiness additionally requires dedicated database integration testing, Socket.IO end-to-end testing and final-host smoke testing.

## Deployment

~~~text
Vercel / static frontend
          │ HTTPS
          ▼
Persistent Node + Express host
          │
          ├── Socket.IO
          └── MongoDB Atlas
~~~

The backend must run on a host that supports persistent WebSocket connections. See docs/DEPLOYMENT.md for the complete configuration.

## Important limitations

- Institutional SSO/OIDC is not connected to a real college identity provider.
- Development registration is local-only; production requires trusted institutional verification.
- The AI assistant depends on an external provider and is not a production safety system.
- Distributed Socket.IO/Redis coordination is not configured.
- Institutional ID storage requires production-grade private storage and retention controls.
- Some moderation/report/block flows still need additional end-to-end validation.
- Operational metrics are process-local unless an external metrics store is configured.

## Documentation

Start with docs/README.md.

- docs/FEATURE_PARITY_AUDIT.md — feature inventory
- docs/MENTOR_VERIFICATION.md — mentor verification
- docs/MATCHING_GROUPS_OPERATIONS.md — matching, groups and operations
- docs/AI_INTEGRATION.md — AI assistant
- docs/SECURITY_PRIVACY.md — security and privacy
- docs/TESTING.md — test strategy
- docs/DEPLOYMENT.md — deployment
- docs/SSO_SETUP.md — institutional authentication

## Project status

**Pilot-stage engineering project.** The repository demonstrates the product and its security boundaries; it does not claim institutional approval, legal compliance or a completed production identity-provider integration.

## License

See LICENSE.