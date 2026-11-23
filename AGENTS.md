AGENTS.md --- EventNest Project Instructions
This file defines the project-wide instructions for AI coding agents
working in the EventNest repository.

Every agent must read and follow this file before making changes. If a
task-specific instruction conflicts with this file, follow the more
specific instruction only when it does not violate the project's
security requirements or established architectural decisions. Ask for
clarification when a conflict cannot be resolved safely.
1. Project purpose
EventNest is an event discovery, management, and ticketing platform.

The goal is to build a reliable, secure, maintainable application that
supports:
- Event discovery and search.
- Organizer event and venue management.
- General-admission ticket sales.
- Secure checkout and payment processing.
- Individual ticket issuance.
- QR-based event check-in.
- Attendee and organizer dashboards.
- Wishlists and event reminders.
- Event and sales analytics.
Do not turn EventNest into a generic e-commerce platform, social
network, booking marketplace, or unrelated application. New
functionality must support the event-management and ticketing purpose.
2. Core engineering principles
All agents must:
1. Understand the existing code before changing it.
2. Prefer simple, maintainable solutions over unnecessary abstractions.
3. Preserve established architecture unless the task explicitly
   authorizes a change.
4. Avoid introducing dependencies without a clear technical reason.
5. Avoid duplicating existing utilities, components, services, or
   business logic.
6. Keep business logic out of route handlers and UI components when a
   service or dedicated module is appropriate.
7. Validate untrusted input at system boundaries.
8. Handle errors explicitly; do not silently swallow exceptions.
9. Write or update tests for meaningful behavior changes.
10. Explain important trade-offs and assumptions in the final summary.
Do not claim that code, tests, migrations, or integrations work unless
they have actually been checked.
3. Agreed technology stack
Use the following stack unless the project owner explicitly approves a
change.

  Area                      Technology
  Frontend                  React.js
Styling                   Tailwind CSS
Animation                 Framer Motion
Backend                   Node.js
API framework             Express.js
Database                  MongoDB
ODM                       Mongoose
Authentication            Clerk
Payments                  Razorpay
QR generation             qrcode.js
QR scanning               react-qr-scanner
Email delivery            SendGrid through Nodemailer
Media storage             Cloudinary
Real-time communication   Socket.IO
Frontend deployment       Vercel
Backend deployment        Render or AWS EC2
Database hosting          MongoDB Atlas

Do not replace a technology because another library is fashionable or
marginally more convenient. Propose the change and explain its benefits,
costs, and migration impact first.
4. Product scope and v1 constraints
The following are deliberate v1 constraints:
- General admission only; no assigned seats or seat maps.
- One venue per event.
- One ticket type and one ticket price per event.
- One organizer owns and manages a venue.
- A venue can be reused for multiple events by its owner.
- One user can act as both an attendee and an organizer.
- A purchaser owns the tickets from their checkout in v1.
- A group checkout creates one ticket document per entry.
- One checkout/payment attempt corresponds to one payment record.
- A reservation may have multiple payment attempts.
- Each issued ticket has its own QR credential.
- Promo codes are not part of v1.
Do not quietly add multi-tier tickets, assigned seating, promo codes,
multiple venues per event, or separate attendee ownership. These require
an explicit product decision.
5. Database architecture
The current v1 database design contains these collections:
1. users
2. venues
3. events
4. tickets
5. ticketReservations
6. qrCredentials
7. payments
8. wishlists
Use the existing database architecture document in the repository as the
detailed reference when available.
Important data rules
- MongoDB document references are logical relationships; Mongoose
  ref does not enforce referential integrity.
- Validate referenced documents and ownership in application logic.
- Use MongoDB ObjectId references for relationships between
  application collections.
- organizerId, userId, and similar application references point to
  users._id, not Clerk IDs.
- clerkId connects the local user profile to the Clerk identity.
- Add indexes based on actual query patterns and verify important
  queries with explain("executionStats").
- Do not add indexes indiscriminately.
User identity and authentication
- Clerk is responsible for authentication and identity verification.
- MongoDB stores the EventNest user profile and application-specific
  roles and state.
- Never store passwords, OAuth access tokens, refresh tokens, or Clerk
  secrets in MongoDB.
- Every account must have a verified email and a verified phone number
  under the current v1 authentication design.
- Phone numbers must use E.164 format.
- Normalize email addresses to lowercase.
- A user may have both attendee and organizer roles.
- Never trust a client-supplied user ID for authorization. Derive
  identity from verified authentication context.
Venue and event ownership
- An organizer owns their venues.
- An event must reference a venue the organizer is authorized to use.
- Do not allow one organizer to edit another organizer's venue or
  event.
- Event capacity must not exceed venue capacity.
- Event capacity must not be reduced below already sold tickets plus
  active reservations.
Ticket inventory
- Tickets with status valid and used both occupy sold capacity.
- Tickets with status cancelled or refunded do not occupy sold
  capacity.
- Only reservations with status pending and expiresAt later than
  the current time count as active holds.
- A reservation is a temporary inventory hold, not an issued ticket.
- Prevent overselling with atomic inventory operations and appropriate
  transaction boundaries.
- Do not rely on a UI count or a non-atomic read-then-write sequence
  to protect inventory.
- TTL deletion is asynchronous. Never use TTL deletion as the
  mechanism that releases inventory.
- Do not keep a database transaction open while waiting for a user or
  payment provider.
Payments
- Razorpay payment verification must happen on the backend.
- Verify webhook signatures.
- Treat webhook delivery as at-least-once: the same event may arrive
  more than once.
- Payment processing and ticket issuance must be idempotent.
- Do not issue tickets based only on a frontend success message or
  redirect.
- A delayed payment notification must not cause duplicate ticket
  issuance or unsafe inventory changes.
- Never log secret keys, payment credentials, or sensitive payment
  data.
QR tickets and check-in
- QR codes must contain opaque, unpredictable credentials.
- Do not encode personal information or raw database IDs in QR codes.
- Store a hash of the QR token, not the raw token.
- Validate QR credentials on the backend.
- Check-in must be atomic so that a ticket cannot be used more than
  once.
- A successful check-in changes the ticket from valid to used.
- Do not trust a scanner's client-side result without backend
  validation.
6. Backend conventions
Follow the repository's existing folder structure and naming
conventions. Do not create a new architecture or reorganize folders
without a task-specific reason.

Unless the repository has already established a different convention:
- Keep route definitions focused on HTTP routing.
- Put business logic in service modules.
- Put database access and model definitions in appropriate model/data
  modules.
- Use middleware for authentication, authorization, validation, and
  shared request processing.
- Keep controllers focused on translating HTTP requests into service
  calls and responses.
- Use centralized error handling.
- Use environment variables for configuration and secrets.
- Validate request bodies, route parameters, and query parameters.
- Use appropriate HTTP status codes and consistent response
  structures.
- Avoid returning internal stack traces or sensitive implementation
  details to clients.
Do not introduce a new validation, logging, or error-handling library if
the project already has a suitable solution.
7. Frontend conventions
- Use React components that have clear responsibilities.
- Reuse existing components and hooks before creating alternatives.
- Keep API communication in the established API/service layer.
- Represent loading, success, empty, and error states where relevant.
- Prevent stale requests and handle component lifecycle cleanup where
  needed.
- Do not put secrets or privileged credentials in frontend code.
- Do not treat frontend validation as a replacement for backend
  validation.
- Ensure important user actions have clear feedback and accessible
  controls.
- Follow existing responsive design and styling conventions.
8. Security requirements
Security is a core requirement, not a later enhancement.

Agents must:
- Enforce authentication and authorization on protected backend
  operations.
- Verify ownership before allowing organizers to modify resources.
- Validate and sanitize untrusted input appropriately.
- Protect against NoSQL injection and unsafe query construction.
- Apply appropriate rate limits to sensitive endpoints.
- Keep secrets in environment variables or the approved secret
  manager.
- Avoid exposing internal errors, secrets, tokens, or unnecessary
  personal data.
- Verify third-party webhook signatures.
- Make payment and check-in operations safe against duplicate
  requests.
- Avoid logging passwords, authentication tokens, QR tokens, or
  sensitive payment information.
Never weaken authentication, authorization, payment verification, or
inventory consistency to make a feature easier to implement.
9. Testing expectations
For meaningful changes, add or update tests that cover the expected
behavior and important failure cases.

Prioritize tests for:
- Authentication and authorization.
- Organizer ownership checks.
- Event capacity validation.
- Concurrent ticket reservations.
- Reservation expiration.
- Payment retries and duplicate webhooks.
- Duplicate ticket issuance prevention.
- QR validation and duplicate check-in prevention.
- Invalid request payloads.
- Error handling and edge cases.
Use the test framework already configured in the repository. Do not add
a second test framework without approval.
10. Agent workflow
Before implementing a task:
1. Read this file.
2. Inspect the relevant existing files and project structure.
3. Identify the behavior requested and the parts of the system it
   affects.
4. Check for existing implementations that should be reused.
5. Identify assumptions, missing requirements, and potential side
   effects.
6. If a product or architecture decision is missing and materially
   affects the implementation, ask before making an irreversible
   choice.
While implementing:
1. Make the smallest coherent change that fulfills the task.
2. Keep changes within the requested scope.
3. Preserve existing behavior unless the task requires changing it.
4. Add validation and error handling.
5. Add or update tests.
6. Do not modify unrelated files just to make broad stylistic changes.
After implementing:
1. Run the relevant tests, linting, and build commands that are
   available.
2. Report exactly which checks passed and which were not run.
3. Summarize the files changed.
4. Explain important implementation decisions.
5. List known limitations or follow-up work.
6. Do not claim completion if required checks failed.
11. Scope control: things agents must not do
Unless explicitly requested, agents must not:
- Replace the agreed technology stack.
- Add unrelated product features.
- Expand v1 into a multi-vendor or general e-commerce platform.
- Implement assigned seating or multiple ticket tiers.
- Add promo-code functionality.
- Change the database architecture without explaining the impact.
- Remove existing functionality to simplify implementation.
- Introduce unnecessary dependencies or abstractions.
- Rewrite large parts of the codebase for a small task.
- Hardcode credentials, API keys, URLs that should be configured, or
  user-specific data.
- Generate fake success responses for unfinished integrations.
- Skip tests and report that implementation is fully verified.
If a requested feature conflicts with these instructions, explain the
conflict and ask for a decision rather than silently changing the
product direction.
12. Documentation and decision records
When changing architecture or an important product rule:
- Update the relevant project documentation.
- Explain why the change is needed.
- Record important trade-offs.
- Keep documentation consistent with the implemented behavior.
Do not update documentation to describe behavior that has not actually
been implemented.
Final principle
Build the EventNest that has been specified, not the EventNest an
agent independently imagines.

Agents should be proactive about identifying bugs, risks, missing
requirements, and better engineering approaches---but must not silently
redefine the product or architecture.