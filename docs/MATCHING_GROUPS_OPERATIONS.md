# Matching Queue, Group Sessions, and Operations

## Matching queue

- `POST /api/v1/matching/queue` creates a request with topic, format, language preferences, preferred times, optional context, and (for group requests) a required future session time. Ranking now considers expertise, ratings/session history, language overlap, and configured mentor availability windows; unconfigured mentor time windows are treated as unknown rather than an automatic mismatch.
- Eligible mentors must be approved, available, institution-matched, support the selected format, and not be blocked by either participant.
- The initial request ranks candidates and offers the best candidate. A group-format request requires a future date/time; accepting it creates a scheduled group session rather than an unscheduled group record. Direct mentor requests in group format also require a future time and create a proper participant list; after the mentor accepts the initial request, lifecycle actions are handled on the Group Sessions page. Offers expire after 15 minutes.
- Mentors configure languages and typical availability windows in their mentor profile. Mentors use `GET /api/v1/matching/queue/inbox`, then `POST /api/v1/matching/queue/:id/accept` or `/decline`.
- Requesters use `GET /api/v1/matching/queue/me`, `/cancel`, and `/refresh`.
- The backend worker retries queued requests every 15 seconds and advances expired/declined offers. It uses MongoDB persistence, conditional status claims, stale-claim recovery, and idempotent session linkage to reduce duplicate processing and recover interrupted acceptance flows. For multi-instance deployment, use a dedicated worker/lease design and test race behavior under load.

## Group sessions

- Approved mentors create a session using `POST /api/v1/group-sessions` after enabling availability and the `group` session format through `PATCH /api/v1/mentors/me`.
- Sessions have a schedule, join deadline, capacity, description, visibility, and a participant list.
- Students can browse sessions with `GET /api/v1/group-sessions`, join or leave, and use the shared conversation created for the group.
- Hosts can update, start, complete, or cancel a group session using `PATCH /api/v1/group-sessions/:id/manage`.
- Hosts can switch a session to invite-only and invite same-institution accounts using `POST /api/v1/group-sessions/:id/invite` with `{ "userIds": ["<Mongo ObjectId>"] }`. Invitees receive notifications. Invite-only listing is limited to the host and invited accounts.
- Participant capacity is checked both before and during the atomic join update. The host counts toward the maximum.

## Operations

- `GET /api/v1/admin/ops/metrics`: current process telemetry and bounded HTTP/socket metrics.
- `GET /api/v1/admin/ops/alerts`: evaluates configured error-rate, p95 latency, and event-loop-lag thresholds.
- `GET/POST /api/v1/admin/ops/incidents` and `PATCH /api/v1/admin/ops/incidents/:id`: persistent incident tracking with severity, state transitions, action notes, and audit logs.
- `GET /api/v1/admin/ops/pilot-readiness`: reports gates for DB connectivity, active users, approved mentors, unresolved critical incidents, and active operational alerts.
- Configuration: `OBSERVABILITY_WINDOW_MS`, `OBSERVABILITY_MAX_SAMPLES`, `ERROR_RATE_ALERT`, `HTTP_P95_ALERT_MS`, `EVENT_LOOP_P99_ALERT_MS`.

## Operational limitations

- HTTP/socket metrics are in-memory, process-local, and reset on restart. Connect a production metrics backend and alert delivery integration before relying on these for an actual pilot.
- The worker is designed for a single active backend process. Multi-instance queue leasing, distributed Socket.IO adapters, load tests, and production incident runbooks still need deployment-specific validation.
- Daily rotating aliases are intentionally not implemented. MaskChat continues to use each account's stable anonymous display alias.
- These routes and UI have passed static syntax checks only in this environment; runtime database and production build validation require installing dependencies and testing against a disposable MongoDB database.
