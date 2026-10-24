# Login connection troubleshooting

The Vercel frontend uses the API URL embedded at build time from VITE_API_URL. The observed production bundle points to https://queue-doan.onrender.com/api; its Socket.IO URL points to the same Render host. Vercel serving the frontend does not establish that the backend is running.

During diagnosis, both an OPTIONS preflight and a login POST to that API exceeded 20 seconds without a response. This establishes an API availability problem from the test environment, but does not identify whether startup, hosting, database connectivity, or configuration caused it. Check the Render service's current deployment logs to establish the cause.

The Axios client now limits requests to 30 seconds. Login and signup show distinct timeout, connection, server-unavailable, and API validation messages, and leave the loading state so the user can retry. No automatic retries are added to account creation or other writes.

Verify the backend's production environment: persistent MONGODB_URI, a stable unique JWT_SECRET of at least 32 characters, NODE_ENV=production, and CORS_ORIGIN=https://queue-blush.vercel.app (plus any other intended origins). Do not paste secrets into issues or chat. If VITE_API_URL is changed, rebuild the Vercel frontend.

The admin@test.com and customer@test.com accounts are seeded only in disposable local demo mode. Production disables demo seeding; use accounts created in the production database once the API is available.

Run frontend authentication regression tests with npm --prefix frontend test. They exercise real HTTP stalls, signup recovery, rejected credentials, unavailable servers, and successful retries against the actual API client and authentication store. Frontend build verification also passes.
