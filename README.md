# Queue — Restaurant Queue & Reservation Management

A full-stack restaurant application with an admin portal and customer-facing flows for joining queues, making reservations, and tracking status updates.

## Features

- Admin dashboard, booking calendar, customer records, and statistics pages.
- Customer signup and login, waitlist entry, reservations, and meal selection.
- QR entry links and booking ticket scanning for arrival confirmation.
- Socket.IO events for queue and booking updates.
- Restaurant settings, staff, table, and menu management modules.
- Web app manifest and a service worker with network-first caching of selected static assets.

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | React 19, JavaScript, Vite 7, React Router |
| UI | Tailwind CSS 4, Lucide, Motion, GSAP, Recharts |
| Client state and HTTP | Zustand, Axios |
| Backend | NestJS 10, TypeScript |
| Database | MongoDB, Mongoose |
| Authentication | JWT, Passport, bcrypt |
| Real-time communication | Socket.IO |

## Architecture

The React client calls the NestJS REST API under `/api`. NestJS modules handle authentication, business settings, bookings, waitlists, customers, staff, tables, meals, statistics, availability, and QR tokens. Mongoose stores application data in MongoDB.

Socket.IO delivers updates to business, booking, and queue rooms. The client tracks active rooms and rejoins them after reconnecting; it also exposes reconnect callbacks for fetching current REST state.

```text
React client -- REST /api --> NestJS modules --> MongoDB
React client <-- Socket.IO --> NestJS event gateway
```

## Run locally

Use Node.js 22.12+ and npm. For persistent data, provide a running MongoDB instance or MongoDB Atlas connection string.

```bash
git clone https://github.com/HeinLattAung/Queue.git
cd Queue
```

### 1. Configure the backend

Create `backend/.env` using `backend/.env.example` as a reference:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/restaurant-db
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRATION=7d
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Replace the MongoDB URI if using Atlas. Keep `.env` files out of version control.

```bash
cd backend
npm ci
npm run start:dev
```

The API listens at `http://localhost:3000/api`.

For a temporary local demo, omit `MONGODB_URI` entirely. The backend then starts `mongodb-memory-server` and attempts to seed an admin account, a customer account, and menu items. This mode may download a MongoDB binary on first use, requires development dependencies, and does not retain data after restart. The seed credentials are printed in the backend console and apply only to this temporary mode.

### 2. Configure the frontend

Create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

In a second terminal, starting from the repository root:

```bash
cd frontend
npm ci --legacy-peer-deps
npm run dev
```

Open `http://localhost:5173`. Use `/signup` for a restaurant admin account or `/customer/signup` for a customer account.

## Available checks

Run from `frontend/`:

```bash
npm run lint
npm run build
```

Run from `backend/`:

```bash
npm run build
```

Run `npm test` inside backend/ for the security, access, and MongoDB regression suites. See docs/QA-REPORT.md for local results and known lint limitations; docs/SECURITY-CHANGES.md covers deployment requirements.

## Repository structure

```text
Queue/
  backend/
    src/
      main.ts        API startup
      app.module.ts  Module composition
      common/        Shared configuration, guards, decorators, utilities
      modules/       Business domains (auth, booking, waitlist, events, ...)
    test/            Security, access, and persistence regression tests
  frontend/
    public/          Manifest, icons, and service worker
    src/
      main.jsx       Browser entry point
      app/           Route composition and global styles
      features/      Domain pages and their Zustand stores
      shared/        Reusable layouts, animation, hooks, API/socket clients
      assets/        Static source assets
  docs/              Architecture, security, QA results, and UI notes
```

See [architecture guidance](docs/ARCHITECTURE.md) for feature ownership and import conventions.

## Current limitations and next steps

- The service worker caches selected successful static responses. It does not implement offline booking writes, an IndexedDB sync queue, or guaranteed offline navigation.
- Socket reconnection does not establish conflict-free synchronization for offline mutations.
- Regression tests cover access control, queue uniqueness, and concurrent QR consumption. Concurrent booking availability and measured production performance still require further validation.
- Booking management and private Socket.IO rooms enforce authorization. Other legacy management modules still require an ownership review.
- Production requires a persistent MongoDB URI, a strong JWT secret of at least 32 characters, and an explicit CORS origin allowlist. Deploy the updated frontend and backend together.

See docs/SECURITY-CHANGES.md and docs/QA-REPORT.md for remaining work, migration precautions, and verified customer/admin flows.

## Author

[Hein Latt Aung](https://github.com/HeinLattAung)
