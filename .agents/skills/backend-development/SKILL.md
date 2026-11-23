---
name: backend-development
description: Build, modify, debug, and review EventNest's Node.js and Express backend. Use for API routes, controllers, services, Mongoose models, validation, authentication, authorization, database queries, payments, reservations, QR check-in, integrations, and backend tests.
---

# EventNest Backend Development Skill

## Purpose

Use this skill when implementing or changing EventNest's backend.

EventNest is an event discovery, management, and ticketing platform. The backend is responsible for enforcing business rules, protecting user data, managing event inventory, verifying payments, issuing tickets, and validating QR check-ins.

This skill supplements the repository's root `AGENTS.md`. Read and follow `AGENTS.md` first. If this skill and `AGENTS.md` conflict, follow `AGENTS.md` and ask for clarification when necessary.

## Technology constraints

Use the agreed backend stack:

- Node.js
- Express.js
- MongoDB
- Mongoose

Integrations selected for the project include Clerk, Razorpay, SendGrid through Nodemailer, Cloudinary, and Socket.IO. Use an integration only when the task requires it and follow the existing project setup.

Use the versions and module system already configured in the repository. Do not introduce a new framework, ORM, validation library, queue, cache, or architecture without a clear reason and approval where it changes project direction.

## Product boundaries

Keep backend behavior aligned with EventNest's v1 scope:

- General-admission tickets only.
- One venue per event.
- One ticket type and one price per event.
- No assigned seating.
- No promo codes.
- One user can be both attendee and organizer.
- A purchaser owns all tickets from their checkout in v1.
- One ticket document is created per purchased entry.
- One payment record represents one payment attempt.
- A reservation may have multiple payment attempts.
- Each issued ticket has an individual QR credential.

Do not silently add features outside this scope.

## Required workflow

### 1. Inspect before editing

Before making changes:

1. Read the root `AGENTS.md`.
2. Inspect the existing backend structure, package scripts, and configuration.
3. Identify existing route, controller, service, middleware, model, and error-handling conventions.
4. Inspect the relevant Mongoose models and indexes.
5. Identify existing API contracts and consumers.
6. Search for reusable utilities and existing business logic.
7. Identify data migration or compatibility concerns.

Do not invent a new folder structure if the repository already has one.

### 2. Keep responsibilities clear

Follow existing project conventions. Unless the repository has an established alternative:

- **Routes:** map HTTP methods and paths to middleware and controllers.
- **Middleware:** authentication, authorization, validation, and shared request processing.
- **Controllers:** translate HTTP requests into service calls and HTTP responses.
- **Services:** implement business rules and coordinate operations.
- **Models:** define Mongoose schemas, validation, indexes, and model-level behavior.
- **Utilities:** hold small reusable functions that do not belong to a domain service.

Avoid putting complex business logic in route handlers or controllers. Avoid creating layers that add no meaningful separation.

### 3. API design

- Use consistent resource-oriented routes and HTTP methods.
- Validate route parameters, query parameters, and request bodies.
- Use appropriate HTTP status codes.
- Keep response structures consistent with existing APIs.
- Do not expose stack traces, internal database details, secrets, or unnecessary personal data.
- Implement pagination for potentially large result sets.
- Bound user-controlled page sizes and query limits.
- Avoid returning entire Mongoose documents when only selected fields are needed.
- Use projections and populate selectively.
- Avoid N+1 query patterns where a suitable aggregation or batched query is clearer.

### 4. Authentication and authorization

- Verify Clerk authentication on the backend using the approved Clerk integration.
- Never trust a user ID supplied in the request body as proof of identity.
- Resolve the authenticated Clerk identity to the local MongoDB user record.
- Use the local user's MongoDB `_id` for application relationships.
- Check roles and resource ownership for every protected operation.
- An organizer may only manage their own venues and events unless an explicitly approved sharing feature is introduced.
- Authentication answers who the user is; authorization determines what that user may do.
- Do not confuse the two.

### 5. Mongoose and MongoDB

- Use explicit schema types, validation, defaults, and enums where appropriate.
- Use timestamps consistently.
- Define indexes deliberately based on query patterns.
- Remember that Mongoose `ref` does not enforce referential integrity.
- Validate that referenced documents exist and that the caller is allowed to use them.
- Normalize emails to lowercase and phone numbers to E.164 format.
- Use atomic update operations when correctness depends on concurrent requests.
- Use MongoDB transactions only where supported and where multiple writes must succeed or fail together.
- Do not hold a database transaction open while waiting for a payment provider or user interaction.
- Use `explain("executionStats")` to investigate important query performance.
- Do not add indexes merely because a field exists in a schema.

### 6. Event and venue rules

- A venue belongs to an organizer.
- A venue may be reused for multiple events by its owner.
- An event references one venue in v1.
- Validate venue ownership before creating or changing an event.
- Event capacity must not exceed venue capacity.
- Prevent event capacity from being reduced below sold tickets plus active reservations.
- Validate event date ranges and state transitions.
- Do not allow invalid transitions merely because a client sends a different status.

If the online-event/venue relationship is not explicitly resolved in the existing project decisions, do not guess. Ask whether v1 is in-person only or whether online events may omit a venue.

### 7. Reservation and inventory correctness

Capacity calculations must distinguish sold tickets from temporary holds.

- `valid` and `used` tickets both occupy sold capacity.
- `cancelled` and `refunded` tickets do not occupy sold capacity.
- A reservation counts as an active hold only when its status is `pending` and `expiresAt` is later than the current time.
- A reservation is a temporary hold, not a ticket.
- Prevent overselling using atomic inventory operations.
- Do not use a read-then-write sequence as the only protection against concurrent checkouts.
- Do not rely on TTL deletion to release inventory; MongoDB TTL cleanup is asynchronous.
- Expired pending reservations must be transitioned or treated as expired by application logic.
- Ensure a delayed payment notification cannot confirm a reservation whose capacity has already been safely released and reallocated without a deliberate reconciliation policy.

If inventory counters are introduced, define exactly how they are updated and reconciled against tickets and reservations. Do not add counters casually or let them become inconsistent with the underlying records.

### 8. Payment processing with Razorpay

Payment processing is a security- and correctness-critical workflow.

- Create payment orders on the backend.
- Never expose Razorpay secret keys to the frontend.
- Verify payment signatures on the backend.
- Verify webhook signatures using the raw request body as required by the provider's verification procedure.
- Do not trust frontend redirects or success messages as proof of payment.
- Treat webhook delivery as at-least-once; duplicate notifications are expected.
- Make payment processing idempotent.
- Prevent duplicate ticket issuance.
- Enforce uniqueness for provider order and payment identifiers with appropriate indexes.
- Support multiple payment attempts for a reservation without allowing multiple successful attempts to issue duplicate tickets.
- Define and validate payment state transitions.
- Handle delayed, failed, duplicate, and out-of-order notifications safely.
- Do not log secrets, signatures, payment credentials, or unnecessary payment data.

Do not invent a refund workflow or mark a payment refunded unless the provider-side refund result has been verified.

### 9. Ticket issuance and QR check-in

#### Ticket issuance

- Issue one ticket document per purchased entry.
- Link each ticket to its event, purchaser, and reservation.
- Use a unique ticket number.
- Issue tickets only after trusted backend payment confirmation.
- Ensure retries cannot issue duplicate tickets.

#### QR credentials

- Generate cryptographically unpredictable, opaque QR tokens.
- Do not encode raw MongoDB IDs or personal information in QR codes.
- Store only a secure hash of the raw token.
- Keep QR validation on the backend.
- Revoke credentials when the associated ticket is no longer eligible for entry.

#### Check-in

- Confirm that the ticket belongs to the event being checked in.
- Confirm that the ticket is currently eligible for entry.
- Perform the state transition atomically.
- A successful check-in changes the ticket from `valid` to `used`.
- A second scan must not produce a second successful check-in.
- Return a clear, safe result for invalid, revoked, already-used, or wrong-event tickets.
- Do not trust client-side scanner output as authorization.

### 10. Validation and error handling

- Treat all client input and third-party payloads as untrusted.
- Validate data at API boundaries.
- Prevent unsafe dynamic MongoDB query construction.
- Handle malformed ObjectIds and invalid enum values.
- Use centralized error handling consistent with the repository.
- Distinguish validation, authentication, authorization, conflict, not-found, and unexpected server errors.
- Do not leak internal exception messages to clients.
- Do not silently catch and ignore errors.
- Ensure asynchronous route failures reach the established error handler.

### 11. External integrations

- Keep credentials in environment variables or the approved secret manager.
- Validate webhook signatures.
- Apply timeouts and sensible error handling to external requests.
- Avoid retrying non-idempotent operations blindly.
- Make retries safe with idempotency keys or equivalent safeguards where supported.
- Keep provider-specific logic behind clear service boundaries when useful.
- Do not pretend an integration succeeded when it has not been configured or tested.

### 12. Testing expectations

Use the test framework already configured in the repository.

For meaningful backend changes, test relevant success and failure paths. Prioritize:

- Authentication and role authorization.
- Organizer ownership checks.
- Invalid and missing input.
- Event capacity validation.
- Concurrent reservation attempts.
- Reservation expiry and release.
- Payment retries.
- Invalid webhook signatures.
- Duplicate and out-of-order webhook delivery.
- Duplicate ticket issuance prevention.
- QR token validation.
- Wrong-event and duplicate check-in attempts.
- Database and external-service failures.

Use mocks for external services where appropriate, but do not mistake mocked tests for proof that a live integration is configured correctly.

## Security requirements

Never:

- Store passwords or OAuth tokens in MongoDB.
- Trust client-supplied ownership or role claims.
- Expose private keys or provider secrets.
- Issue tickets from frontend-only payment confirmation.
- Skip webhook signature verification.
- Allow concurrent requests to oversell inventory.
- Allow a QR ticket to be checked in successfully more than once.
- Log raw QR tokens or sensitive credentials.
- Disable authorization checks to make local development easier without a safe, explicit development-only mechanism.

## Completion report

When finished, summarize:

1. The API or backend behavior implemented.
2. The files and models changed.
3. The business rules enforced.
4. Any database indexes or schema changes.
5. Tests, lint checks, and build commands run, with results.
6. Any integration configuration still required.
7. Assumptions, limitations, and follow-up work.

Do not claim that live payments, Clerk authentication, email delivery, or other external integrations work unless they have been configured and actually verified.

## Backend quality bar

The backend is the authority for identity, permissions, inventory, payment confirmation, ticket issuance, and check-in. Correctness under retries and concurrent requests matters more than a happy-path demo. Build small, testable workflows with explicit invariants and safe failure handling.
