# Ticket and booking history API

All routes require an active, email-verified EventNest user with a valid Clerk session. They return only the caller's own records. Both attendee and organizer roles use the same account. Ticket IDs and reservation IDs are MongoDB ObjectIds; a foreign ticket is indistinguishable from a missing ticket.

| Method | Route                    | Query/parameter                                            | Success                                                                                                       |
| ------ | ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/tickets`           | Optional `page` (default 1), `limit` (default 20, max 100) | `200 { "data": [ticket], "pagination": { "page", "limit", "total" } }`                                        |
| `GET`  | `/api/tickets/:ticketId` | Ticket ObjectId                                            | `200 { "data": ticket }`                                                                                      |
| `GET`  | `/api/bookings`          | Optional `page`, `limit`                                   | `200 { "data": [{ "reservation", "payments", "ticketCounts" }], "pagination": { "page", "limit", "total" } }` |

Tickets include a selected event summary. Booking history is ordered by reservation creation time and includes payment attempt status, refund status, refund completion time, and counts of tickets by status. A `successful` payment with `refundStatus: pending` or `failed` has not issued tickets and requires refund reconciliation; `refunded` means the provider confirmed the refund. Booking history does not expose provider payment IDs or Clerk identity data. A missing event reference may appear as `null` for legacy records. QR credential retrieval is documented in [Payments](payments.md); these reads never issue tickets.

Malformed IDs or pagination return `400 VALIDATION_ERROR`; a missing or foreign ticket returns `404 NOT_FOUND`; missing/invalid sessions return `401 UNAUTHORIZED`; inactive/unverified accounts return `403 FORBIDDEN` or `403 VERIFICATION_REQUIRED`. Unexpected failures return `500 INTERNAL_ERROR` with no internal detail.
