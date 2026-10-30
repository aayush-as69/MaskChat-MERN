# MaskChat MERN Deployment

## Local development

Use Node.js 20+ and MongoDB. From the repository root:

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev:server
npm run dev:client
```

The API defaults to `http://localhost:4000`; Vite defaults to `http://localhost:5173`. `server/.env` is read by the server workspace when launched through its npm script. Keep the two `.env` files out of version control.

For development-only demo accounts, run `npm run seed` with `NODE_ENV=development`. Seed credentials are documented in the README and must never be deployed. The seed command refuses to run when `NODE_ENV=production`.

## Frontend on Vercel

- Project root: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://<your-persistent-api-host>`
- Confirm `client/vercel.json` provides SPA route fallback.

Do not put API keys, database URIs, cookie secrets, HMAC keys, or storage credentials in frontend environment variables.

## Backend on a persistent Node host

Use a persistent Node.js host supporting long-lived WebSocket connections. Do not deploy the complete Socket.IO backend as a standard Vercel serverless function.

Set at least:

- `NODE_ENV=production`
- `PORT` (host-provided where applicable)
- `MONGODB_URI`
- `CLIENT_ORIGIN` (exact HTTPS frontend origin)
- `COOKIE_SECRET` (cryptographically random, at least 32 characters)
- `COOKIE_SECURE=true`
- `ALLOW_DEV_AUTH=false`
- `REQUIRE_INSTITUTION_DOMAIN=true`
- `INSTITUTION_DOMAINS=<institution-approved-domain-list>`
- `PRIVATE_UPLOAD_DIR=<absolute-private-persistent-directory>`
- `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` only if AI is enabled

The example user email domain in the project brief (`galgotiacollege.edu`) differs from the reference archive's documented default (`galgotiacollege.edu.in`). Confirm the official domain with the institution before setting `INSTITUTION_DOMAINS`. Do not enable multiple lookalike domains merely to make signup pass.

## Public demo access
Optional. Set `DEMO_MODE=true` (and optionally `DEMO_SESSION_MINUTES`) in the backend environment and redeploy the backend; no frontend change or seed run is needed. The frontend discovers it through `GET /api/v1/auth/demo` and shows the demo buttons. It is independent of `ALLOW_DEV_AUTH`, which must stay `false` in production. Demo users are `isDemo` accounts in "Demo University" with no password; they bypass only the institutional-verification gate and are blocked from reports, mentor applications, ID upload, recommendations and AI. Remove the demo data by deleting users with `isDemo: true` and their records if you retire the feature. See README "Public demo access".

## Private ID storage

The current adapter writes ID files to `PRIVATE_UPLOAD_DIR`, outside the frontend's public directory. In production, the path must be a private persistent volume with strict OS access controls. A filesystem on an ephemeral host is not sufficient for a durable verification workflow. Before production, configure a private object-storage adapter if persistent private volumes are not available, and define backups and retention/deletion jobs. Never expose a static public URL for an ID document.

## Institutional authentication prerequisite

Production registration is intentionally disabled until a trusted institutional verification flow is integrated. The reference archive contains OIDC/trusted-token implementation material, but the MERN backend does not yet have a tested live GCET SSO integration. Do not manually set `institutionVerifiedAt` to bypass this requirement. Complete `docs/SSO_SETUP.md` and institution-approved integration work before enabling real student onboarding.

## AI configuration

The AI endpoint remains disabled if `AI_API_KEY` is empty. The provider must be OpenAI-compatible and support the configured `/chat/completions` endpoint. Use a restricted credential, set usage limits, and verify provider data-handling terms. AI is optional; the rest of MaskChat should remain usable when it is unavailable.

## Database and operations

- Use a least-privilege MongoDB database user and restrict network access.
- Configure MongoDB backups and verify restore procedures.
- Keep a single persistent backend instance until a shared Socket.IO adapter and shared rate-limit/session state are configured and tested.
- Verify `/api/v1/health` and `/api/v1/ready` after deployment.
- Run two-browser authentication and Socket.IO smoke tests.
- Run dependency audit and security regression tests before release.
