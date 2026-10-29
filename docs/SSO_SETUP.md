# Institutional SSO setup status

Institutional OpenID Connect is **not wired into this rebuilt application yet**. The reference archive includes OIDC helper modules, but they have not been transplanted into this new MERN codebase. This is intentionally documented rather than represented as a working integration.

Before enabling institutional SSO:
1. Obtain issuer URL, client ID, client secret, redirect URI, and allowed email/domain policy from the institution.
2. Implement Authorization Code flow with PKCE where supported.
3. Validate issuer, audience, signature, state, nonce, expiry, and redirect URI.
4. Map verified claims to an internal user record without exposing institutional identifiers to peers.
5. Add replay, account-linking, and negative-path tests.
6. Keep local development authentication separate from production SSO.


## Current production gate

Production registration is intentionally disabled until a real institutional identity provider and claim-validation flow are implemented. Production login/session middleware also requires a trusted `institutionVerifiedAt` timestamp. A self-entered institution name or an email suffix is not verification. Local registration is available only when `NODE_ENV=development` and `ALLOW_DEV_AUTH=true`.
