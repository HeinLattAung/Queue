# Local QA report â€” 24 October 2026

## Environment and scope

Tested the modified `Queue-security` clone on Windows, with the real NestJS app at `http://localhost:3100`, Vite at `http://localhost:5173`, and a fresh temporary MongoDB instance from mongodb-memory-server. No deployed site or external database was used. Port 3000 was already occupied and was left alone.

## Bugs found and fixed

1. **High: public restaurant response exposed `qrTokenSecret`.** `GET /api/public/business/:id` returned the complete business document, including the key used to sign QR entry tokens. The public controller now uses an explicit field projection; internal reads retain the secret for signing and validation. Verified through the running API.
2. **High: duplicate active queue entries were accepted.** MongoDB rejected the old partial unique index filter because `$ne` is unsupported there. The live database had no uniqueness index. Replaced it with a supported nonempty-string filter, assigned the index a name, and made queue creation await model initialization before accepting writes. The repeated-phone request now returns 409. No existing external records were deleted or migrated.
3. **Local launch correction:** npm argument forwarding started Vite with the wrong root, producing 404s. The QA instance was relaunched through Vite's Node entry point with explicit arguments. This was a test launch issue, not an application route bug.

After deploying the public-response fix, rotate existing business QR signing secrets and reissue QR entry links because the previous public endpoint exposed those secrets. No production secrets were rotated during this local QA task.

For production rollout of the index fix, review existing duplicate active phone entries first. Index creation will fail if conflicting data already exists; this report does not authorize deleting that data.

## Live API and database checks

All **20/20** local API smoke checks passed after the fixes. The one-off QA scripts and generated results were subsequently removed during the structure cleanup. Maintained regression tests remain in `backend/test` and run with `npm test` from `backend/`.

Covered admin/customer login, invalid credentials, public business privacy, booking creation, protected status access, customer management denial, cross-restaurant booking-edit denial, owner edits, concurrent QR consumption, QR generation and validation, QR queue join, duplicate queue rejection, queue status/position token checks, wrong-purpose token denial, private socket denial, real restaurant membership checks, live queue events, and CORS rejection.

The simultaneous QR scan check used real MongoDB: one request succeeded and one returned 400.

## Browser QA

Used the in-app browser and the running local frontend:

- Admin login reached the dashboard.
- QR Links generated a signed entry URL.
- Customer-facing QR join produced a queue ticket.
- Live tracking authenticated successfully and showed the queue position.
- Admin approval changed the customer screen to Approved without refresh.
- Admin seating changed it to Your Table is Ready without refresh.
- Admin completion changed it to Visit Complete without refresh.
- An ID-only queue link displayed the full-token-link error, and a token-only link loaded successfully.
- Meal menu loaded; adding Caesar Salad produced the expected $9.99 cart total.
- Place Order created a tracked meal booking.
- Completing that synthetic booking through the local API changed the browser to Your Order is Ready without refresh.
- No error-level console messages were observed in the tested queue and meal-order tabs.
- A 390px viewport DOM check reported content width 390px, with no horizontal overflow on meal tracking. This is a limited responsive check, not complete mobile-device certification.

The queue form used the seeded account's prefilled details. A separate anonymous/clean-browser-context signup flow was not covered.

Screenshots were saved in the current chat's visualization output folder: `queue-qa-completed.png` and `queue-qa-order-complete.png`.

## Automated regression coverage

Final automated result: **19/19 tests passed**, including the real MongoDB cases. The backend build passed as part of this run. `npm test` in backend builds the code and runs authorization/network regression tests plus new real MongoDB regression tests. The new database cases cover public business field projection, actual unique-index creation, simultaneous duplicate queue joins, new visits after completion, phone-less guests, and simultaneous QR scans. Set QA_MONGODB_URI to the URI of a disposable local MongoDB server to reuse it; the test creates and removes only its own uniquely named database. Without that override, mongodb-memory-server may download a large MongoDB binary on first use.

The frontend production build passed during this task's preceding verification. Existing frontend lint findings and the large-bundle warning remain documented in SECURITY-CHANGES.md. Installing the frontend still requires `npm ci --legacy-peer-deps` because the existing QR dependency's peer range excludes React 19.

## Limits and remaining work

This is a focused local functional/security QA pass, not a full security audit or release certification. Physical camera scanning, actual geolocation permission/distance behavior, offline/PWA installation, load testing, accessibility auditing, and production hosting were not tested. Other management modules still require the ownership review already listed in SECURITY-CHANGES.md; public creation validation and cancellation transition rules also remain open.

The local servers were left running for review. Temporary database data resets when the QA backend restarts. Demo admin login: `admin@test.com` / `admin123`; demo customer login: `customer@test.com` / `customer123`. These accounts belong only to this disposable local database.
