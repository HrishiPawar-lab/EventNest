# Reservation API

All routes require an active, email-verified EventNest user with a valid Clerk session. The user ID comes from the session. Both attendees and organizers may reserve tickets through their shared account.

| Method   | Route                              | Request                                                        | Success                         |
| -------- | ---------------------------------- | -------------------------------------------------------------- | ------------------------------- |
| `POST`   | `/api/reservations`                | JSON `{ "eventId": "<ObjectId>", "quantity": <integer 1–10> }` | `201 { "data": reservation }`   |
| `GET`    | `/api/reservations/:reservationId` | Reservation ObjectId                                           | `200 { "data": reservation }`   |
| `DELETE` | `/api/reservations/:reservationId` | Reservation ObjectId                                           | `204` (cancels, retains record) |

Only published future events can be reserved. One user may hold at most ten tickets and have one active reservation per event. A hold lasts five minutes from creation. The backend atomically increments `events.ticketsReserved` only when `maxAttendees - ticketsSold - ticketsReserved` can accommodate the request. Expired pending holds are transitioned to `expired` and their inventory is released in a MongoDB transaction before new reservations; a background worker also releases expired holds every 15 seconds. Cancellation changes a pending reservation to `cancelled` and releases the counter in one transaction. Neither operation uses MongoDB TTL for inventory release.

All routes return `401 UNAUTHORIZED` for a missing/invalid session, `403 FORBIDDEN` or `403 VERIFICATION_REQUIRED` for an inactive/unverified account, `400 VALIDATION_ERROR` for malformed input or IDs, `404 NOT_FOUND` for a missing/ineligible event or reservation, and `500 INTERNAL_ERROR` for unexpected failures. `POST` returns `409 SOLD_OUT` when available capacity is insufficient, `409 ACTIVE_HOLD` when the user already has an active hold for the event, and `429 RATE_LIMITED` after ten create attempts per user in one minute. This limiter is held in each API process; a shared store is needed for multi-instance enforcement. `DELETE` returns `409 RESERVATION_EXPIRED` or `409 RESERVATION_NOT_PENDING` when the hold can no longer be cancelled. Payment attempts and ticket issuance are separate backend workflows; a reservation alone never issues tickets.
