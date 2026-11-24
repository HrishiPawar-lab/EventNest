# EventNest backend

Node.js and Express API scaffold. MongoDB is required at startup; the server begins listening only after Mongoose connects. Use a MongoDB server supported by the installed Mongoose version.

1. Copy `.env.example` to `.env` and set `MONGODB_URI` for your MongoDB instance. Set `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the [Clerk Dashboard API keys](https://dashboard.clerk.com/). Set `CLERK_WEBHOOK_SIGNING_SECRET` to the signing secret for the webhook endpoint. To configure Cloudinary, set all three `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` values from the [Cloudinary console](https://cloudinary.com/documentation/node_integration). To prepare Razorpay, set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and a stable `TICKET_QR_SECRET` of at least 32 characters together. Keep secrets on the backend only.
2. Run `npm install`.
3. Run `npm run dev` for local development, or `npm start` for a normal process.

`GET /health` returns `{ "status": "ok" }` once the server is running. The eight v1 Mongoose models are in `src/models/`. API contracts are in `../docs/api/`. Run `npm test` for the built-in Node.js tests, `npm run lint` for ESLint, and `npm run format:check` for Prettier. Use `npm run format` to apply formatting. Model and service tests use mocks and schema validation. The reservation integration test runs only when `EVENTNEST_TEST_MONGODB_URI` points to a dedicated replica-set database whose name ends in `_test`; it creates and removes a unique child database. The installed local MongoDB 4.0 server is below Mongoose 9's supported server versions and is unsuitable for this test. Razorpay checkout and webhook routes are enabled when all required payment variables are configured; live payment behavior still requires end-to-end verification.

Configure a public Clerk webhook endpoint at `POST /api/webhooks/clerk` and subscribe it to `user.created`, `user.updated`, and `user.deleted`. The route verifies Clerk's signature against the raw request body before processing. Create and update events fetch the current user from Clerk, then upsert the local `User` when a valid primary email is available. Phone is optional; a supplied primary phone must be E.164, and missing or invalid Clerk phone data clears the stored phone and its verification flag. Missing email does not create a local user and clears email verification on an existing user. Delete events mark existing local accounts `deactivated`. Existing roles and account status are preserved by profile updates.

The health, Clerk webhook, and public event discovery routes are accessible without a local account. Clerk session middleware runs before protected product routes. Those routes use `requireEventNestUser` from `src/middleware/requireEventNestUser.js`: it resolves the verified Clerk user ID to a local `User` and requires an active account with verified email. Phone verification remains recorded for features that actually need a phone. `src/middleware/authorization.js` exports `requireRole('attendee' | 'organizer')`, `requireVenueOwner`, and `requireEventOwner`. The owner guards require the organizer role, read `venueId` or `eventId` from route parameters, and compare the resource's `organizerId` to the authenticated local user's `_id`. They return 401 without an authenticated local user, 403 for insufficient roles or foreign ownership, 400 for malformed IDs, and 404 for missing resources. Product route contracts and their current limitations are documented in `../docs/api/`.

Webhook tests use a mocked Clerk lookup and an in-memory model; authentication tests use mocked Clerk auth state and local user lookup. Live Clerk token verification and webhook delivery have not been verified by these tests.

## Restore the original demo catalog

`npm run seed:demo` prints a dry-run plan for the eight presentation events from the original frontend catalog and their eight venues. Applying the seed requires an existing active Clerk-synced user with a verified email. The script verifies that identity with Clerk and preserves the approved `users` → `venues` → `events` ownership relationship. It never creates fake Clerk users, tickets, reservations, payments, QR credentials, or wishlists.

The original cards did not include street addresses, coordinates, capacities, or end times. The seed supplies clearly labeled approximate city-center coordinates, demo capacities, and three-hour end times. Event descriptions identify them as demo listings and retain the original fictional presenter names; the actual organizer is the selected real account. The original local event photos are uploaded to Cloudinary through the existing media service. The seed does not overwrite existing seeded venues, events, images, or organizer edits, and stable IDs make reruns safe.

After the project owner chooses the organizer account and approves these demo values, run from `backend`:

```powershell
npm run seed:demo -- --organizer-email owner@example.com --demo-locations --apply
```

Add `--grant-organizer-role` only when the owner has approved adding that role to this account. Add `--publish` to show the events in public discovery; the script permits this only when `RAZORPAY_KEY_ID` uses Razorpay test mode and every event is still in the future. Drafts are the default. Publishing uses the existing event service and happens only after all eight images are uploaded. `MONGODB_URI`, Clerk keys, and all three Cloudinary variables must be configured. The script prints counts, never secrets or contact details.

Cloudinary configuration lives in `src/config/cloudinary.js`. When all three Cloudinary variables are present, startup configures the Node SDK for secure delivery without making a network request. Leaving all three unset keeps the integration dormant; a partial set fails startup with a safe variable-name error. `CLOUDINARY_URL` is not used by this setup. Event and Venue documents may store one optional cover image as paired `imageUrl` and `imagePublicId` fields. Authenticated organizer upload routes persist only trusted Cloudinary results and use a conditional update to prevent concurrent cover replacements from overwriting each other. Old-asset cleanup after replacement is best effort. Cover removal is deferred until a recoverable cross-service deletion policy is defined.

## Optional-phone index migration

The old `users.phoneNumber_1` unique index accepts only one user without a phone. Replace it before deploying code that can create multiple phone-less users. The database configured in this workspace was inspected and migrated on 2026-11-24: it had zero users and the new partial unique index was already present, so the old index was dropped and the new index verified. Run the following procedure for any other database that still has the old index.

1. Back up `users`, pause application writes and Clerk webhook processing, and inspect `db.users.getIndexes()` to confirm the existing index name and options. Keep webhook deliveries retryable during the pause.
2. Check for duplicate string phones with `db.users.aggregate([{ $match: { phoneNumber: { $type: 'string' } } }, { $group: { _id: '$phoneNumber', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }])`. Review invalid or empty phone values and unset them in a controlled data cleanup; do not silently change a valid user's phone. The new index enforces uniqueness of supplied strings, while Mongoose enforces E.164 for application writes.
3. With writes still paused, run `db.users.dropIndex('phoneNumber_1')`, then `db.users.createIndex({ phoneNumber: 1 }, { name: 'phoneNumber_unique_when_present', unique: true, partialFilterExpression: { phoneNumber: { $type: 'string' } } })`. If the inspected old name differs, use that exact name. Stop and investigate if index creation fails; keep writes paused until uniqueness is restored.
4. Confirm the new definition with `db.users.getIndexes()`, deploy the backend and frontend changes, then resume writes and webhook delivery. Confirm that multiple phone-less accounts can sync and that duplicate supplied phones remain rejected. Test this sequence on a disposable copy before production.

After multiple phone-less users exist, the old unique index cannot be restored without first resolving those users. A rollback must preserve the new partial index or restore from the reviewed backup.

## Deploy on Render

Create a Node web service with root directory `backend`, build command `npm ci`, and start command `npm start`. The backend runs directly with Node.js and has no build script. Leave `PORT` unset so Render supplies it. Set `MONGODB_URI`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SIGNING_SECRET` in the service environment. Set the three `CLOUDINARY_*` variables together when media support is needed. Use an Atlas connection string for `MONGODB_URI`, not the local address from `.env.example`. Do not commit these values.

The API connects to MongoDB before listening. In Atlas Network Access, allow the service's [Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses) and verify the Atlas database user credentials. Once deployed, check `GET /health`. Startup logs identify missing configuration, MongoDB URI and authentication errors, connection failures, and port conflicts without printing connection strings or secrets. A generic startup error requires further investigation; the actual Render deploy logs and service settings are needed to determine its cause.
