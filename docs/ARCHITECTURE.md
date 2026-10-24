# Project architecture

## Frontend

The browser entry point is `frontend/src/main.jsx`. It mounts the router and imports application styles. `app/App.jsx` composes routes; route URLs remain unchanged.

Features own their pages and state. Domains are auth, home, dashboard, bookings, queue, orders, customers, business, profile, and analytics. Each feature has a `pages/` directory and, when needed, a `store/` directory. Customer and staff screens live with their business domain rather than in a separate catch-all customer folder.

`shared/` contains reusable layouts, animation components, hooks, and the HTTP/Socket.IO transport clients. Features may use shared code. Shared code should remain independent of individual features; authentication-aware layouts are composition components and may consume the auth store. Cross-feature imports should be deliberate, such as reusing the common auth screen for customer login. Keep new business state in its owning feature rather than adding a global miscellaneous store folder.

## Backend

`src/main.ts` handles startup and `src/app.module.ts` assembles the application. `src/modules/` contains Nest domain modules. Each domain keeps its controllers, services, DTOs, and database schemas together. `src/common/` holds shared configuration, guards, decorators, and utilities.

Use Nest module imports and exported providers for domain dependencies. Controllers handle HTTP boundaries, services enforce application behavior, and schemas define persistence. Maintained regression tests live in `backend/test/` and compile the source before execution.

## Checks and deployment

- Frontend: `npm --prefix frontend run build`.
- Backend regression suite: `npm --prefix backend test` (uses a disposable local MongoDB instance).
- Development commands, environment variables, and public URLs are unchanged by this reorganization.
- One-off local QA scripts and generated token fixtures were removed with the root `qa` folder. Historical results remain in `docs/QA-REPORT.md`.
- Security and rollout requirements are in `docs/SECURITY-CHANGES.md`.

Verified after this reorganization: frontend and backend builds pass; all 19 backend regression tests pass. The disposable MongoDB teardown now drops and closes the database before stopping its server. The existing frontend bundle-size warning remains.
