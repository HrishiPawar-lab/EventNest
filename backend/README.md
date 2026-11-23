# EventNest backend

Node.js and Express API scaffold. MongoDB is required at startup; the server begins listening only after Mongoose connects. Use a MongoDB server supported by the installed Mongoose version.

1. Copy `.env.example` to `.env` and set `MONGODB_URI` for your MongoDB instance. Set `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the [Clerk Dashboard API keys](https://dashboard.clerk.com/). Set `CLERK_WEBHOOK_SIGNING_SECRET` to the signing secret for the webhook endpoint. Keep both secrets on the backend only.
2. Run `npm install`.
3. Run `npm run dev` for local development, or `npm start` for a normal process.

`GET /health` returns `{ "status": "ok" }` once the server is running. The eight v1 Mongoose models are in `src/models/`. Run `npm test` for the built-in Node.js tests, `npm run lint` for ESLint, and `npm run format:check` for Prettier. Use `npm run format` to apply formatting. Model tests validate documents and declared indexes without a live database; they do not prove MongoDB index creation or uniqueness. This scaffold has no event, user, payment, or ticket routes yet.

Configure a public Clerk webhook endpoint at `POST /api/webhooks/clerk` and subscribe it to `user.created`, `user.updated`, and `user.deleted`. The route verifies Clerk's signature against the raw request body before processing. Create and update events fetch the current user from Clerk, then upsert the local `User` only when both required contacts are available; incomplete profiles update existing records without inserting an invalid one. Delete events mark existing local accounts `deactivated`. Existing roles and account status are preserved by profile updates.

The health and Clerk webhook routes are public. Clerk session middleware runs after those routes and before JSON parsing and future protected routes. Future protected routes can use `requireEventNestUser` from `src/middleware/requireEventNestUser.js`: it resolves the verified Clerk user ID to a local `User` and requires an active account with both email and phone verified. No protected product routes or role authorization have been added.

Webhook tests use a mocked Clerk lookup and an in-memory model; authentication tests use mocked Clerk auth state and local user lookup. Live Clerk token verification, webhook delivery, and MongoDB writes have not been verified.
