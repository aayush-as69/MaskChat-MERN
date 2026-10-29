# Post-build code review and refinements

**Review date:** 2026-10-29

## Bugs and gaps found and corrected

- Removed the unused `ALIAS_SECRET` configuration and its production requirement because daily-rotating aliases are explicitly out of scope.
- Made mentor acceptance of a matching offer atomic. Added a unique link from a created session back to its matching request so interrupted acceptance can be reconciled without creating duplicate sessions.
- Added recovery for stale queue-processing claims and interrupted acceptance, plus a unique partial index to prevent multiple active matching requests from the same requester.
- Fixed candidate advancement so declined, expired, blocked, unavailable, or no-longer-approved mentors are not repeatedly offered; queued requests remain retryable when no eligible mentor is currently available.
- Ensured matching responses do not expose the request's complete candidate-ID list.
- Persisted attempted mentor IDs so declined or expired mentors are excluded from later queue retries, and made refresh/decline/cancel state transitions atomic.
- Scoped message idempotency keys to both conversation and sender, preventing another participant from colliding with a guessed client message ID. Added `npm --workspace server run migrate:message-idempotency` for databases that already have the old index.
- Changed realtime message and typing delivery to target the conversation's current database members, so a removed group participant with a stale socket cannot keep receiving new events.
- Sanitized session responses to remove invitation lists and internal pairing fields; populated conversation members so the chat list can display aliases correctly.
- Enforced explicit mentor-application review-state transitions and blocked invitations when a block relationship exists between invitees and current group participants.
- Added language and mentor availability-window ranking, and connected the profile UI to those preferences. Group matching now requires a future scheduled time.
- Fixed group-format direct mentor requests so they carry participant membership and a schedule. Group lifecycle actions after initial acceptance are routed through the Group Sessions workflow rather than allowing the generic session endpoint to cancel a whole group by mistake.
- Added atomic capacity/state/deadline checks for group joins, future-time and join-deadline validation for create/update, and approval checks for group hosting, inviting, and joining.
- Removed invited-user ID arrays from public group-session responses and included group participants in the sessions listing.
- Prevented notification-write failures from turning a successfully committed matching action into a misleading failed response; such failures are counted in process metrics.
- Added error forwarding around the async operations-alert route.
- Added a persistent Docker Compose volume for private ID uploads.
- Tightened production configuration checks for explicit institution domains, HTTPS client origin, non-local MongoDB URI, a strong cookie secret, and an explicitly configured private upload location.
- Updated CI so it does not ask the setup action for a nonexistent npm lockfile.

## Checks run after these changes

- `node --check` across server source and JavaScript configuration files: passed.
- `node --test server/src/matching.test.js server/src/observability.test.js`: 5 passed, 0 failed.
- Example institutional email parsing pattern: passed for the sample address supplied in the project context.
- Final ZIP integrity is checked during packaging.

## Remaining blockers and limits (not silently marked complete)

- JSX syntax was checked with the globally available TypeScript transpiler, but the full server/API test suite and Vite build have not run successfully because dependency installation timed out and packages such as `express` and `vite` are absent in this environment.
- MongoDB-backed route tests, group/matching concurrency tests, Socket.IO multi-user tests, AI provider tests, and browser end-to-end tests remain required.
- Real institutional OIDC/SSO is not integrated. Production signup remains intentionally disabled, and users without a trusted institutional-verification timestamp are rejected in production.
- Operations metrics remain process-local and reset on restart; external metrics storage, alert delivery, multi-instance Socket.IO coordination, load testing, and deployment-specific runbooks remain outstanding.
- The matching worker is intended for one active backend instance until a distributed worker/lease strategy is deployed and tested.
- ID storage still requires deployment-specific persistent private storage, retention/deletion jobs, malware scanning, and institutional authenticity review. File signatures alone do not prove that an ID is genuine.
- Daily rotating aliases remain intentionally excluded.
