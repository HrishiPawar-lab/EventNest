# EventNest architecture

## Current status

The repository contains project instructions and skills, but no application code yet. The root [`AGENTS.md`](../../AGENTS.md) defines the current v1 product rules and agreed stack. This document gives a shorter architectural map; it must stay consistent with that guide as implementation decisions are made.

## Product and platform

EventNest is an event discovery, management, and ticketing platform for attendees and organizers. The selected frontend stack is React, Tailwind CSS, and Framer Motion where useful. The selected backend is Node.js and Express with MongoDB and Mongoose. Clerk handles identity, Razorpay handles payments, and the other selected integrations are listed in `AGENTS.md`.

The frontend deployment target is Vercel; the backend target is Render or AWS EC2. A separate mobile client has not been specified.

## Application boundaries

- **Frontend:** event discovery, organizer management, checkout, tickets, and dashboards. It renders backend state and does not decide payment or ticket validity.
- **API:** Express routes and controllers handle HTTP concerns, middleware handles authentication and validation, and services enforce domain rules.
- **Data:** Mongoose models persist application records in MongoDB. References to users use local `users._id`; `clerkId` links a local user to Clerk.
- **Integrations:** provider-specific code handles identity, payments, email, media, and real-time updates without putting secrets in the frontend.

Keep these responsibilities clear within a simple application structure. The exact source tree has not been chosen yet.

## V1 data model

The planned collections are `users`, `venues`, `events`, `tickets`, `ticketReservations`, `qrCredentials`, `payments`, and `wishlists`. The important relationships are:

```text
User (organizer) 1 -- * Venue
User (organizer) 1 -- * Event
Venue            1 -- * Event
Event            1 -- * Ticket
Event            1 -- * TicketReservation
TicketReservation 1 -- * Payment
Ticket           1 -- 1 QrCredential
```

This is a conceptual map, not a complete schema. The detailed fields, indexes, lifecycle states, and transaction design should be documented as the backend is built. Inventory, payment, and check-in invariants are specified in `AGENTS.md`.

## Decisions still open

- The first implementation milestone and order of attendee versus organizer features.
- Whether v1 supports online events or only events with a physical venue.
- The exact source tree, API contracts, schema fields, and deployment configuration.
- Whether a separate mobile client will be built.

Update this document when those decisions are confirmed. Do not describe an unimplemented feature as complete.
