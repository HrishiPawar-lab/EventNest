# EventNest architecture

## Current status

The repository contains a `frontend/` React and TypeScript application and a `backend/` Express API. The frontend has public discovery and Clerk authentication screens with required email and optional phone verification. The backend defines the eight v1 Mongoose models and has Clerk identity synchronization, authentication, authorization, event and venue management, public discovery, reservations, payment fulfillment, ticket issuance, QR check-in, wishlists, organizer reporting, and Cloudinary cover upload. Automatic refunds cover captured payments whose reservation can no longer be fulfilled. Purchaser-requested refunds for issued tickets remain deferred pending an eligibility policy. Live Razorpay and MongoDB replica-set behavior has not been verified. The root [`AGENTS.md`](../../AGENTS.md) defines the current v1 product rules and agreed stack.

## Product and platform

EventNest is an event discovery, management, and ticketing platform for attendees and organizers. The selected frontend stack is React, Tailwind CSS, and Framer Motion where useful. The selected backend is Node.js and Express with MongoDB and Mongoose. Clerk handles identity, Razorpay handles payments, and the other selected integrations are listed in `AGENTS.md`.

V1 events are in-person and each event has one physical venue, as specified in the approved [database design](../../docs/architecture/database-design.md).

The frontend deployment target is Vercel; the backend target is Render or AWS EC2. A separate mobile client has not been specified.

## Application boundaries

- **Frontend:** event discovery, organizer management, checkout, tickets, and dashboards. It renders backend state and does not decide payment or ticket validity.
- **API:** Express routes and controllers handle HTTP concerns, middleware handles authentication and validation, and services enforce domain rules.
- **Data:** Mongoose models persist application records in MongoDB. References to users use local `users._id`; `clerkId` links a local user to Clerk.
- **Integrations:** provider-specific code handles identity, payments, email, media, and real-time updates without putting secrets in the frontend.

Keep these responsibilities clear within the existing `frontend/` and `backend/` applications. Backend feature modules and API contracts are documented in [`docs/api`](../../docs/api/).

## V1 data model

The eight defined collections are `users`, `venues`, `events`, `tickets`, `ticketReservations`, `qrCredentials`, `payments`, and `wishlists`. The important relationships are:

```text
User (organizer) 1 -- * Venue
User (organizer) 1 -- * Event
Venue            1 -- * Event
Event            1 -- * Ticket
Event            1 -- * TicketReservation
TicketReservation 1 -- * Payment
Ticket           1 -- 1 QrCredential
```

This is a conceptual map. The [database design](../../docs/architecture/database-design.md) specifies the v1 collection fields, indexes, and subsequent implementation decisions. Inventory, payment, and check-in invariants are specified in `AGENTS.md`; implemented backend API contracts are documented in [`docs/api`](../../docs/api/).

## Decisions still open

- Purchaser-requested refund eligibility for issued tickets.
- Deployment configuration and live provider verification.
- Whether a separate mobile client will be built.

Update this document when those decisions are confirmed. Do not describe an unimplemented feature as complete.
