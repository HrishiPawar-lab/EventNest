# EventNest

EventNest is an event discovery and ticketing platform. This repository currently contains starter applications for its React frontend and Express backend.

## Requirements

- Node.js 20.19 or newer and npm
- A MongoDB connection for running the backend

## Run locally

In one terminal:

```sh
cd backend
npm ci
cp .env.example .env
# Set MONGODB_URI, Clerk API keys, and CLERK_WEBHOOK_SIGNING_SECRET in .env.
npm run dev
```

In another terminal:

```sh
cd frontend
npm ci
# Set VITE_CLERK_PUBLISHABLE_KEY in frontend/.env.local.
npm run dev
```

The frontend has a public discovery starter, Clerk sign-in and sign-up, required email verification, optional phone verification, and a protected account placeholder. The backend exposes `GET /health`, defines the eight v1 Mongoose models, accepts verified Clerk user webhooks at `POST /api/webhooks/clerk`, and provides reusable authentication and authorization middleware. Payments, ticketing workflows, and protected attendee/organizer product routes have not been implemented yet.

## Checks

Run `npm test` in `backend/`, and `npm run build` in `frontend/`. Both folders provide `npm run lint` and `npm run format:check`; use `npm run format` in either folder to apply Prettier formatting.

The product rules and agreed technology stack are in [AGENTS.md](AGENTS.md). The [database design](docs/architecture/database-design.md) specifies the eight collections, and the [architecture notes](.agents/architecture/project.md) track open design decisions.
