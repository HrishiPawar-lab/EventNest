# Wishlist API

All routes require an active, email-verified EventNest user with a valid Clerk session. Both attendee and organizer roles may use the same wishlist. Ownership is always derived from the session, never a client supplied user ID.

| Method   | Route                    | Request                                                    | Success                                                                       |
| -------- | ------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET`    | `/api/wishlist`          | Optional `page` (default 1), `limit` (default 20, max 100) | `200 { "data": [wishlistEntry], "pagination": { "page", "limit", "total" } }` |
| `PUT`    | `/api/wishlist/:eventId` | Published event ObjectId                                   | `200 { "data": { "eventId": "...", "saved": true } }`                         |
| `DELETE` | `/api/wishlist/:eventId` | Event ObjectId                                             | `204`                                                                         |

`PUT` is idempotent and the unique `{ userId, eventId }` index prevents duplicate records under concurrent requests. `DELETE` is idempotent. List entries include a selected event summary (name, category, dates, price, status, location, cover URL); the event may be `null` if a legacy wishlist entry points to a missing event.

Missing or invalid sessions return `401 UNAUTHORIZED`. An inactive or unverified account returns `403 FORBIDDEN` or `403 VERIFICATION_REQUIRED`. Malformed IDs and pagination return `400 VALIDATION_ERROR`. A missing or unpublished event on `PUT` returns `404 NOT_FOUND`. Unexpected failures return `500 INTERNAL_ERROR` without internal details.
