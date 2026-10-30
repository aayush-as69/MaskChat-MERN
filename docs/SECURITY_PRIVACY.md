# Security and Privacy Notes

## Implemented baseline

- Passwords are hashed with bcrypt.
- Session JWTs are delivered in an HttpOnly cookie, not local storage.
- Production startup rejects the default development secret, insecure cookies, development auth, and a missing explicit institutional-domain enforcement setting.
- Helmet headers, exact-origin CORS, JSON body limits, authentication rate limits, Zod request validation, and double-submit CSRF validation are used.
- API role checks and resource membership checks protect sessions and conversations.
- Socket.IO authenticates from the session cookie, checks conversation membership, applies event rate limits, checks mentor approval on join/send, and sends realtime events only to members present in the current conversation record.
- Public registration now accepts only the `student` role. Mentor role is assigned only by the authorized application approval route.
- Mentor discovery, profile edits, session requests, and mentor messaging are gated by approved mentor application state.
- Institutional ID files are signature-checked as JPEG/PNG/PDF, limited to 5 MB, named with random server-controlled names, stored outside public frontend paths, and served only through an admin-authorized route with `no-store` cache headers.
- Mentor application/document review and privilege decisions generate audit events. Rejected applications have their uploaded document removed.
- Forum posts/replies are institution-scoped, validated, rendered as text in React, and can be reported to the moderation queue.
- The AI gateway keeps provider credentials server-side, applies limits, rejects obvious email/phone patterns, and does not automatically attach account identity or chat history.

## Public demo accounts
When `DEMO_MODE=true`, two shared `isDemo` accounts (student, mentor) can be entered via `POST /api/v1/auth/demo`. They are passwordless, institution-scoped to "Demo University", limited to short-lived sessions carrying a `demo` claim, and rejected by `requireAuth` and the Socket.IO handshake if `DEMO_MODE` is off or the token lacks that claim. Global moderation and admin surfaces are not reachable, and reports, mentor applications, ID uploads, recommendations and AI calls are blocked for them. Because the accounts are shared, treat everything entered in the demo as public.

## Important limitations

- A live institutional OIDC/SSO or trusted-token integration is not connected to the MERN backend. Production registration remains disabled and production auth rejects users without a trusted `institutionVerifiedAt` value. Do not manually set that field to bypass institutional verification.
- `INSTITUTION_DOMAINS` is a configuration list, not proof of enrollment. The domain must be confirmed by the institution. The enrollment-year pattern is only a signal; it is not a trusted academic record.
- The filesystem ID storage adapter requires a private persistent volume in production. A private object-storage adapter, automated retention job, backup lifecycle policy, and full account data deletion workflow remain to be completed before production.
- The code checks file signatures and size but does not run antivirus or prove that an ID is authentic. Human review or an institution-authorized verification service is required.
- Duplicate document/image matching and automated ID fraud detection are not implemented. The app records events that can help reviewers investigate suspicious activity.
- The current code does not provide end-to-end encryption. HTTPS/WSS protects transport when correctly configured; pseudonymous aliases do not prevent all identity inference.
- Mentor cohort/academic-year checks are preliminary. Reviewers must verify conflicting or unclear evidence against institutional policy. Three recommendations support a junior application but do not automatically approve it.
- Recommendation reputation thresholds are configuration defaults (`4.5/5` and `5` rated sessions), not an institution-approved policy. Configure them with the project guide/institution.
- Forum has core post/reply/vote/accepted-answer/report flows, but a complete moderator UI for all forum actions, reply editing/deletion, robust search indexing, and full pagination controls remain incomplete.
- The AI endpoint is OpenAI-compatible and has not been live-tested. PII pattern checks are heuristic and cannot guarantee that all personal information is removed. Configure provider privacy/retention settings before use.
- The MERN app persists messages; automated message retention/deletion and account export/deletion workflows are not implemented.
- Redis-based distributed Socket.IO coordination and shared metrics/alert delivery are not yet implemented. Matching queues, group-session lifecycle controls, and a basic operational dashboard/incident workflow are implemented but remain unverified in a live multi-user environment. Daily rotating aliases are intentionally excluded.
- Message filters are heuristic and cannot guarantee safety. They are not a substitute for human moderation or a specialized safety service.

## Before production

1. Integrate and test institution-approved authentication; confirm the official GCET domain and cohort policy.
2. Create a trusted initial admin account through a controlled operator process; never grant admin solely by email domain.
3. Configure private persistent ID storage, backups, retention, and deletion controls.
4. If upgrading an existing database from the earlier build, run `npm --workspace server run migrate:message-idempotency` before deployment. Then run `npm audit`, the complete server/client test suites, MongoDB-backed tests, and two-browser Socket.IO tests.
5. Test mentor approval, junior recommendations, ID access, revocation, cross-institution isolation, forum moderation, and AI error handling.
6. Verify CSRF/cookie behavior on the actual frontend/API domains.
7. Configure MongoDB least privilege, network access, backups, restore drills, logs, and incident response.
8. Replace demo credentials and ensure development auth and seed data are disabled in production.
