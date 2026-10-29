# MaskChat Feature-Parity Audit

**Scope:** Source-level comparison of `MaskChat_MERN_Fixed_Download(6).zip` (target) and `maskchat-vercel-ready (2)(2).zip` (reference). This is a source inspection, not a claim that every flow has passed runtime testing.

## Summary

The MERN rebuild is the selected target because it already has a React/Vite UI, Express API, MongoDB/Mongoose persistence, cookie-based JWT sessions, CSRF checks, and Socket.IO messaging. The reference application has a broader pilot/operations feature set, institution/SSO modules, matching queues and schedules, richer moderation operations, observability, and deployment/DR scripts. The reference uses a different persistence model and some transient in-memory/Redis state; its code must be translated rather than copied wholesale.

The integration added mentor applications, private ID upload/review routes, senior/junior application states, mentor recommendations, institution-scoped forum APIs/UI, a server-side OpenAI-compatible AI gateway/UI, and a preliminary admin review interface. These additions have passed static JavaScript/JSX syntax checks but have **not** passed runtime tests or a production deployment in this environment.

## Feature parity matrix

| Feature | Vercel-ready reference source | Original MERN target source | Integration result / status |
|---|---|---|---|
| React/Vite interface | React/Vite app, PWA manifest/service worker, demo UI | React/Vite app with dark-first responsive UI | MERN UI retained; forum, mentor application/review, and AI pages added. **Static syntax checked; runtime unverified.** |
| Authentication | OIDC/trusted-token modules and auth-mode configuration | Local email/password with bcrypt and HttpOnly JWT cookie; production signup disabled pending trusted institutional verification | MERN cookie auth retained. Real institutional IdP is still not configured; production account onboarding remains blocked. |
| Institution directory | Configurable institution resolver and allow-list | Free-text institution field in local development | `INSTITUTION_DOMAINS` and `INSTITUTION_EMAIL_PATTERN` configuration added; domain checking can be required, and a configurable pattern can extract cohort year, institution code, degree/program code, and student code. This parsing is still only a signal until confirmed against institutional records. |
| Daily aliases / stable abuse identity | HMAC daily alias and opaque offender identity helpers | User alias stored on account; no daily rotation | **Intentionally excluded by the user.** Stable account aliases remain; no daily rotating alias behavior was added. |
| Mentor eligibility | Matching is based on mentor state/profile; source has identity verification primitives but no institutional ID upload/three-recommendation application workflow | Registration previously allowed selecting mentor role directly | Registration now accepts student role only. Mentor application, ID upload, reviewer decision, approval gating, suspension/revocation, and junior recommendations added. **Runtime/security tests pending.** |
| Institutional ID upload | No equivalent complete ID-card review workflow found in the reference source | Missing | Private filesystem storage outside public frontend, content-signature checks for JPEG/PNG/PDF, size limit, admin-only retrieval, audit events, and rejection deletion added. Persistent private-volume configuration and automated retention still require deployment work. |
| Junior mentor pathway | No three-recommendation exception workflow found | Missing | Junior exception applications and recommendations from distinct eligible mentors added; three qualifying recommendations and admin approval required. **Runtime tests pending.** |
| Mentor discovery | Topic matching, institution isolation, capacity and mentor availability | Topic/institution/availability ranking with blocks | MERN matching retained and now filters to approved mentor applications. Runtime tests pending. |
| Matching queue | Queue and mentor-availability flows in Socket.IO server | No full matching queue; session request model | Added persistent queue requests, topic/format/language/availability-window ranking, institution/block/approval filters, candidate offers with 15-minute expiry, mentor accept/decline, requester cancellation/refresh, retries when mentors become available, an atomic offer-accept claim, and a background queue worker. Runtime/database tests remain pending. |
| Session scheduling | Scheduling and scheduled-session socket flows | `scheduledAt` field and session state transitions | Basic scheduledAt field retained; richer reference scheduling UX/workflow not fully ported. |
| Individual sessions | Present | Present | Retained. |
| Group sessions | Group capacity up to five in reference implementation | Format field exists but full multi-member lifecycle is incomplete | Added mentor-hosted group creation, participant capacity, institution/invite-only visibility, invite notifications, join/leave, join deadline, update, start/complete/cancel, group conversation membership, mentor profile availability/session-format/time-window controls, and privacy-safe listing of invitation metadata. Runtime/database tests remain pending. |
| Realtime chat | Socket.IO messaging, rejoin/grace-period behavior, content filtering | Authenticated Socket.IO room membership, persisted messages, duplicate-message protection | MERN chat retained; mentor approval checked on join/send. Reference reconnect/grace workflow not fully ported. |
| Message persistence | Reference documentation describes transient message flow; durable data is used for reports/feedback/schedules/audits | Messages persisted in MongoDB | MERN persistence retained. Retention/deletion controls are still incomplete. |
| Content filtering | More extensive heuristics for contact details, links, attachments and abuse | Email/phone and limited abuse phrase checks | MERN baseline retained; reference's broader filter is not fully ported. |
| Reports and blocks | Reports, offender refs, ban controls, admin moderation tools | Reports, blocks, moderator queue | Existing reports/blocks retained. Forum post reporting routes into the report queue. Advanced offender-ban operations are not fully ported. |
| Ratings and feedback | Mentor feedback/recognition and session feedback | Mentor rating fields exist but end-user rating workflow is incomplete | Rating fields retained. Full feedback submission workflow remains incomplete; recommendation threshold currently relies on profile rating data. |
| Notifications | Various session and operational notifications | Persistent session notifications | Retained and extended for application decisions and forum replies. |
| Forum | No forum implementation found | Missing | Institution-scoped posts, categories, replies, voting, accepted-answer endpoint, reporting, and React interface added. Some moderation actions and author deletion/editing of replies remain incomplete. |
| LLM/API integration | No LLM feature found | Missing | Server-side OpenAI-compatible gateway and academic assistant UI added. Requires `AI_API_KEY`; provider integration has not been live-tested. |
| Moderator dashboard | HTML admin pages, report/offender/alert/metrics/observability views | React report moderation page | Existing React moderation retained. Admin operations page now shows HTTP/socket/process metrics, threshold alerts, persisted incident management, and pilot-readiness gates. |
| Health/readiness | `/api/health`, `/api/ready`, operational probes | `/api/v1/health`, `/api/v1/ready` | MERN health/readiness retained. |
| Observability/alerts | Structured logging, metrics, pilot operations, alerting | Basic logs and audit events | Added bounded in-process HTTP/socket latency/error metrics, process memory/event-loop telemetry, threshold alert evaluation, persisted incident lifecycle/audit trail, readiness gates, and a React admin dashboard. Metrics reset on process restart and are not a replacement for an external metrics store/alert delivery system. |
| Backup/disaster recovery | PostgreSQL backup/restore and DR scripts | MongoDB deployment docs only | Reference scripts are not compatible with MongoDB and were not copied. MongoDB backup/restore procedures remain an operations task. |
| Multi-instance realtime | Optional Redis adapter/store in reference | Single-instance Socket.IO; no Redis adapter | Not ported. Use one persistent backend instance until shared adapter is configured and tested. |
| Multi-college support | Configurable institution directory | Institution string on account | Basic domain configuration and institution-scoped forum/recommendation checks added. Per-institution enrollment parsers, policy admin, branding, and SSO configuration are not complete. |
| Deployment | Vercel/static frontend plus persistent Node backend; Docker/nginx/HA options | Vercel frontend + persistent Node backend docs | MERN deployment approach retained; private ID storage and AI environment variables documented. No actual deployment was performed. |

## Source inspection notes

- The MERN source had a `User.role` enum with `student`, `mentor`, `moderator`, and `admin`, and the original registration route accepted `student` or `mentor`. This was changed so public registration accepts `student` only; mentor role is assigned after application approval.
- The MERN source already had protected sessions, conversation membership checks, CSRF validation, exact-origin CORS, password hashing, reporting, blocking, notifications, and moderation routes.
- The reference source contains OIDC and trusted-token helpers, HMAC identity helpers, matching/scheduling and group-capacity logic, report/offender controls, operational observability, pilot operations, and disaster-recovery scripts. The presence of these modules does not prove a real institution IdP or production environment is configured.
- The example email domain supplied by the user is `galgotiacollege.edu`. The reference README describes a different default domain (`galgotiacollege.edu.in`). The deployment owner must confirm the official domain and set `INSTITUTION_DOMAINS` correctly before enabling enforcement. Do not accept both domains without institutional confirmation.

## Highest-priority remaining work

1. Integrate and test a trusted GCET institutional identity provider or authorized verification gateway.
2. Run the complete test suite and frontend production build once dependencies can be installed.
3. Configure a persistent private ID-storage volume or a private object-storage adapter; verify backup and access controls.
4. Add a scheduled ID-retention job and account-level data deletion/retention controls.
5. Complete forum moderation actions and the mentor rating submission workflow.
6. Add external metric retention/alert delivery and finish any remaining scheduling/pilot-operation parity. Daily rotating aliases are intentionally out of scope.
7. Run end-to-end security testing with multiple accounts and a dedicated test database.
