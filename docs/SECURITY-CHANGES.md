# Security and reliability fixes

## Implemented

- REST and Socket.IO CORS use the same explicit origin policy. Unknown browser origins no longer receive CORS permission. Requests without an Origin header remain allowed; CORS is not authentication.
- JWT signing and verification share one configuration function. Production rejects missing, short, or default secrets. Development uses an unpredictable per-process secret if no valid secret is configured, so restarting invalidates demo tokens.
- Production requires MONGODB_URI and cannot silently start with an ephemeral database or automatically seed demo accounts.
- Restaurant booking management requires an owner or staff account with a business ID. The customer `/bookings/my` route remains available.
- Booking status updates, edits, and deletion include the authenticated business ID in the database query. Edits allow only explicit editable fields and cannot replace ownership, access tokens, or QR consumption flags. Update validators run.
- Cancellation checks both the resource ID and token purpose. Resource access tokens cannot be used as account login tokens.
- QR arrival performs a single conditional database update. Only unused tickets for pending or confirmed bookings can transition to arrived; cancelled and completed bookings are excluded.
- Private Socket.IO room joins require `{ room, token }`. Restaurant rooms validate the account token and re-read current owner/staff membership. Booking and queue rooms require matching resource token type, subject, and an existing record. Bare room-name joins are denied.
- Private subscriptions expire with their token. Disconnect and leave clear subscription timers; reconnects revalidate credentials. The browser reads the current account token when rejoining restaurant rooms and preserves the explicit resource credential for customer rooms.
- Customer booking availability uses a separate public `availability:<businessId>` room. Only an availability invalidation with `{ businessId }` is forwarded there, never booking or customer data.
- Public booking/waitlist status-by-ID and waitlist position reads require the matching resource token in the `X-Access-Token` header. Missing, invalid, expired, wrong-purpose, and wrong-ID tokens are rejected before querying status data.
- Customer status, order tracking, waitlist position polling, and store calls now send the credentials required by these checks. Token-only queue links can subscribe after the entry is loaded; ID-only links show a message requesting the full token-bearing link. The legacy waitlist status screen now listens to the queue events emitted by the backend.

## Verification

Run `npm ci` followed by `npm test` inside `backend/`.

The test command compiles the backend and currently passes 19 tests (including nested integration cases). Coverage includes secret configuration, CORS, restaurant authorization, token purposes, tenant query scoping, protected update fields, QR consumption behavior, private room authorization, public status authorization, event isolation, reconnect validation, browser socket credential handling, and live token expiry.

The access integration suite starts a real Nest HTTP/Socket.IO server with mocked database models and uses real signed JWTs. It also runs the actual browser socket service with its bundler environment and dependency URL substituted for Node. The access suite uses mocked models. The added persistence suite uses real MongoDB and verifies actual duplicate-entry constraints and concurrent QR consumption. Browser QA and real MongoDB checks were subsequently performed; see QA-REPORT.md. Deployment verification was not performed.

The frontend production build also passes. Install its locked dependencies with `npm ci --legacy-peer-deps`: the existing `@qr-x/react` package declares React peer support only through React 18 while the application uses React 19. The frontend build reports an existing large-bundle warning. Targeted frontend lint still reports pre-existing issues; comparison against HEAD showed errors in the touched files decreasing from 18 to 14, with no new rule categories. The socket service and hook pass lint.

## Deployment configuration

Set `NODE_ENV=production`, a persistent `MONGODB_URI`, a unique `JWT_SECRET` of at least 32 characters, and `CORS_ORIGIN` containing the exact frontend origins (comma-separated). Replacing an existing secret invalidates existing JWTs, including booking and waitlist links; plan the rollout accordingly. Keep the new secret stable across restarts and all backend instances.

## Updated client/server contract

Deploy the updated frontend and backend together. Old clients that send bare room strings will be denied; customer ID-only status requests are intentionally denied.

- `GET /api/public/bookings/:id/status`: booking access token in `X-Access-Token`.
- `GET /api/public/waitlist/:id/status`: waitlist access token in `X-Access-Token`.
- `GET /api/public/waitlist/position/:id`: waitlist access token in `X-Access-Token`.
- Existing `/access/:token` links continue to verify their resource type.
- Socket join acknowledgments return `{ ok: true, room }` or `{ ok: false, error }`; expiry emits `subscription:expired` with the room name.
- Account membership is re-read at join/reconnect. Changes to an account's role/membership do not proactively revoke an already joined room before token expiry; immediate revocation requires a separate server-side session invalidation design.

## Remaining work

These focused changes are not a completed security audit. In particular:

- Other management modules, including legacy waitlist mutation routes, need the same ownership review as bookings.
- Public create routes need DTO validation and protected-field filtering.
- Cancellation transitions and concurrent booking availability require further database-level tests and rules.
- Review and update dependencies, including the existing Multer 1.x dependency.

The existing Desktop/Queue/Queue working copy was preserved. These changes were prepared in the separate Desktop/Queue-security clone. Local verification does not confirm a production deployment.

## Findings from local QA

See QA-REPORT.md for the live API and browser verification. Local QA found and fixed a public QR signing-secret disclosure and an unsupported MongoDB partial-index filter that prevented duplicate-entry protection from being created. Queue writes now wait for index initialization, and the public business response uses an explicit field projection. Real MongoDB regression tests were added. Existing duplicate active phone entries require review before deploying the new uniqueness index.
