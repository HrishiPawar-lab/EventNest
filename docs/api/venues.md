# Venue API

All routes use the existing Clerk session middleware. The local EventNest account must be active, email verified, and have the `organizer` role. Supply the Clerk session token according to the existing frontend API client. A user ID or organizer ID sent by the client is never used for ownership.

Responses use `{ "data": ... }` on success and `{ "error": { "code": "...", "message": "..." } }` on failure. A malformed or missing session returns `401 UNAUTHORIZED`; an attendee or inactive account receives `403 FORBIDDEN` (unverified accounts receive `403 VERIFICATION_REQUIRED`). Invalid bodies, IDs, or pagination return `400 VALIDATION_ERROR`; database failures return a generic `500 INTERNAL_ERROR`.

## Endpoints

| Method   | Route                  | Auth and authorization     | Request                                                    | Success                                                               |
| -------- | ---------------------- | -------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `POST`   | `/api/venues`          | Organizer                  | JSON venue fields below                                    | `201 { "data": venue }`                                               |
| `GET`    | `/api/venues`          | Organizer; own venues only | Optional `page` (default 1), `limit` (default 20, max 100) | `200 { "data": [venue], "pagination": { "page", "limit", "total" } }` |
| `GET`    | `/api/venues/:venueId` | Organizer; owner only      | Venue ObjectId                                             | `200 { "data": venue }`                                               |
| `PATCH`  | `/api/venues/:venueId` | Organizer; owner only      | Nonempty subset of venue fields                            | `200 { "data": venue }`                                               |
| `DELETE` | `/api/venues/:venueId` | Organizer; owner only      | Venue ObjectId                                             | `204`                                                                 |

Create requires `name` (nonempty string), `type` (`bar`, `club`, `restaurant`, `auditorium`, `outdoor`, `other`), `capacity` (positive integer), `address.city`, `address.country`, and `location: { "type": "Point", "coordinates": [longitude, latitude] }`. Optional fields: `description`, `address.street`, `address.state`, `address.postalCode`. PATCH accepts partial `address` fields; it replaces the GeoJSON point as a unit. Unknown fields, including client supplied `organizerId`, `imageUrl`, and `imagePublicId`, are rejected. Cover images will be set only by a trusted Cloudinary upload flow.

An invalid ID returns `400 VALIDATION_ERROR`, a missing venue returns `404 NOT_FOUND`, and another organizer's venue returns `403 FORBIDDEN`. Deletion is rejected with `409 VENUE_IN_USE` while any event references the venue. A change to city, state, or country is rejected with `409 VENUE_IN_USE` while any event references the venue, preserving event location copies. Reducing venue capacity below any linked event's `maxAttendees` returns `409 CAPACITY_CONFLICT`. Updates and deletion run in MongoDB transactions; event creation must also lock the referenced venue within its transaction to preserve these checks during concurrent writes.
