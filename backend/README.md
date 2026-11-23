# EventNest backend

Node.js and Express API scaffold. MongoDB is required at startup; the server begins listening only after Mongoose connects. Use a MongoDB server supported by the installed Mongoose version.

1. Copy `.env.example` to `.env` and set `MONGODB_URI` for your MongoDB instance. Set `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the [Clerk Dashboard API keys](https://dashboard.clerk.com/). Keep the secret key on the backend only.
2. Run `npm install`.
3. Run `npm run dev` for local development, or `npm start` for a normal process.

`GET /health` returns `{ "status": "ok" }` once the server is running. The eight v1 Mongoose models are in `src/models/`. Run `npm test` for the built-in Node.js tests, `npm run lint` for ESLint, and `npm run format:check` for Prettier. Use `npm run format` to apply formatting. Model tests validate documents and declared indexes without a live database; they do not prove MongoDB index creation or uniqueness. This scaffold has no event, user, payment, or ticket routes yet.

Startup requires both Clerk keys, but no Clerk middleware, webhooks, user synchronization, or protected routes have been added. Key presence is tested with placeholder values; live Clerk credentials have not been verified.
