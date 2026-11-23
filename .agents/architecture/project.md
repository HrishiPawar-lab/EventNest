# EventNest architecture

## Current status

The repository contains a `frontend/` React starter and a `backend/` Express starter. The frontend currently renders a static empty state; the backend exposes a health endpoint, connects to MongoDB at startup, defines the eight v1 Mongoose models, synchronizes users through verified Clerk webhooks, and provides reusable authentication middleware. Payments, ticketing workflows, and protected attendee/organizer product routes are not yet implemented. The root [`AGENTS.md`](../../AGENTS.md) defines the current v1 product rules and agreed stack. This document gives a shorter architectural map; it must stay consistent with that guide as implementation decisions are made.

## Product and platform

EventNest is an event discovery, management, and ticketing platform for attendees and organizers. The selected frontend stack is React, Tailwind CSS, and Framer Motion where useful. The selected backend is Node.js and Express with MongoDB and Mongoose. Clerk handles identity, Razorpay handles payments, and the other selected integrations are listed in `AGENTS.md`.

V1 events are in-person and each event has one physical venue, as specified in the approved [database design](../../docs/architecture/database-design.md).

The frontend deployment target is Vercel; the backend target is Render or AWS EC2. A separate mobile client has not been specified.

## Application boundaries

- **Frontend:** event discovery, organizer management, checkout, tickets, and dashboards. It renders backend state and does not decide payment or ticket validity.
- **API:** Express routes and controllers handle HTTP concerns, middleware handles authentication and validation, and services enforce domain rules.
- **Data:** Mongoose models persist application records in MongoDB. References to users use local `users._id`; `clerkId` links a local user to Clerk.
- **Integrations:** provider-specific code handles identity, payments, email, media, and real-time updates without putting secrets in the frontend.

Keep these responsibilities clear within a simple application structure. The initial source tree separates `frontend/` and `backend/`; feature modules and API contracts will be added as product milestones are defined.

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

This is a conceptual map. The approved [database design](../../docs/architecture/database-design.md) specifies the v1 collection fields and initial indexes. Inventory, payment, and check-in invariants are specified in `AGENTS.md`; their workflows remain to be implemented.

## Decisions still open

- The first implementation milestone and order of attendee versus organizer features.
- Feature module structure, API contracts, and deployment configuration.
- Whether a separate mobile client will be built.

Update this document when those decisions are confirmed. Do not describe an unimplemented feature as complete.
