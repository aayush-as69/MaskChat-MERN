# Testing

## Run
```bash
npm test
npm run build
```

## Current coverage
- Deterministic mentor matching score and exclusions.
- HTTP health route.
- Unauthenticated access is rejected by a protected API route.
- A minimal frontend render smoke test.

## Existing database upgrade

If the database was used with the earlier conversation-wide message idempotency index, run:

```bash
npm --workspace server run migrate:message-idempotency
```

Run this once with the target `MONGODB_URI` before deploying the updated socket code. The migration creates the sender-scoped unique index before dropping the legacy index.

## Required before production
Use a dedicated test MongoDB database and add integration tests for registration/login/logout, role checks, session transitions and conflicts, MongoDB message persistence, socket membership enforcement, duplicate messages, report/block behavior, moderator audit records, and browser workflows. Exercise at least two independent authenticated clients for chat and reconnect behavior.

Do not describe tests as passing unless commands were actually executed in the target environment.


## Security regression coverage to execute

- CSRF: state-changing requests without a matching CSRF cookie/header or with a mismatched Origin return 403.
- Reports: reject unknown reported users, non-member targets, messages from another conversation, and message evidence not authored by the reported user.
- Session concurrency: parallel requests for the same student/mentor pair produce at most one live session due to the unique sparse `activePairKey` index. Terminal transitions clear that key.
- Blocking: blocked pairs cannot discover each other, request/accept/start sessions, or send messages.
- Production identity gate: registration is unavailable and unverified accounts cannot authenticate as production users until SSO is implemented.
