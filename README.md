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
# Set MONGODB_URI in .env.
npm run dev
```

In another terminal:

```sh
cd frontend
npm ci
npm run dev
```

The frontend starter is a static page. The backend exposes `GET /health` after it connects to MongoDB. Authentication, payments, ticketing, and other product features have not been implemented yet.

## Checks

Run `npm test` in `backend/`, and `npm run lint` plus `npm run build` in `frontend/`.

The product rules and agreed technology stack are in [AGENTS.md](AGENTS.md). The [architecture notes](.agents/architecture/project.md) track open design decisions.
