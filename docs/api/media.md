# Event and venue cover images

Organizers may upload or replace one cover image on an event or venue they own. Routes require a valid Clerk session, active email-verified local account, and organizer ownership. The backend uploads the image to Cloudinary and stores the returned HTTPS delivery URL and public ID as a pair. Client supplied URLs or public IDs are never accepted.

| Method | Route                                  | Request                               | Success                                         |
| ------ | -------------------------------------- | ------------------------------------- | ----------------------------------------------- |
| `PUT`  | `/api/organizer/venues/:venueId/cover` | Raw JPEG, PNG, or WebP body, max 5 MB | `200 { "data": { "imageUrl": "https://..." } }` |
| `PUT`  | `/api/organizer/events/:eventId/cover` | Raw JPEG, PNG, or WebP body, max 5 MB | `200 { "data": { "imageUrl": "https://..." } }` |

Set `Content-Type` to `image/jpeg`, `image/png`, or `image/webp`; no multipart wrapper is used. The backend checks image signatures and Cloudinary verifies the file. A conditional MongoDB update prevents concurrent uploads from overwriting a newer cover. After replacement, it attempts to delete the previous Cloudinary asset. If storage cleanup fails after MongoDB succeeds, the API still returns success and logs a generic cleanup error. Cover removal is deferred until a recoverable cross-service deletion policy is defined. Cloudinary credentials are required in the backend environment; if absent, the route returns `503 MEDIA_UNAVAILABLE`. No live upload has been verified yet.

Invalid image content returns `400 VALIDATION_ERROR`, unsupported media type returns `415 UNSUPPORTED_MEDIA_TYPE`, a missing resource returns `404 NOT_FOUND`, a foreign resource or attendee returns `403 FORBIDDEN`, and an invalid/absent session returns `401 UNAUTHORIZED`. Concurrent cover changes return `409 COVER_CHANGED`. More than ten uploads per organizer per hour return `429 RATE_LIMITED`; this limiter is held in each API process. Cloudinary responses missing required fields return `502 MEDIA_PROVIDER_ERROR`; unexpected failures return a generic `500 INTERNAL_ERROR`.
