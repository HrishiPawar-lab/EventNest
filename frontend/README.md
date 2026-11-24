# EventNest frontend

React, TypeScript, Vite, Tailwind CSS, TanStack Query, and Clerk power the EventNest interface. Public discovery, attendee booking, tickets, wishlist, QR check-in, and organizer event management use the backend API. Some organizer dashboard, venue, attendee, and analytics screens remain labeled previews with sample data.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL` to the Clerk publishable key and backend origin. Never put a secret in a `VITE_` variable.
3. Run `npm ci` and `npm run dev`.

The Clerk instance must enable email/password sign-in, Google OAuth, and email verification. Phone collection is optional; `/verify-phone` is available where Clerk SMS is supported. If Clerk Organizations are enabled, keep membership optional and disable automatic first-organization creation. EventNest requires a verified primary email but never requires a phone number.

## Routes and data

`src/app/router.tsx` composes the routes. `src/features/` groups auth, events, booking, tickets, wishlist, profile, and organizer code. `SiteShell.tsx` provides attendee navigation; `OrganizerShell.tsx` supports live and preview organizer screens. API calls use the configured backend origin, and authenticated calls attach a fresh Clerk session token. The backend enforces roles and ownership.

- Public: `/`, `/explore`, `/search`, `/events/:eventId`, `/booking/review/:eventId`. Event lists and details show published events from the API.
- Clerk and account: `/sign-in`, `/sign-up`, `/verify-email`, optional `/verify-phone`, `/profile`, `/settings`.
- Protected attendee: `/checkout/:eventId`, `/booking/confirmation/:eventId`, `/tickets`, `/tickets/:ticketId`, `/wishlist`. Checkout creates a reservation and Razorpay order; ticket issuance and QR status come from backend verification.
- Live organizer events: `/organizer/events`, `/organizer/events/new`, `/organizer/events/:eventId`, `/organizer/events/:eventId/edit`. These use the organizer and venue APIs. Creation saves a draft at an owned venue; draft edits, cover uploads, publishing, and eligible cancellation call the backend. Published events cannot be edited under the current backend policy. Cancellation is not permanent deletion.
- Organizer previews: `/organizer/preview/*` for illustrative dashboard, event, venue, attendee, and analytics screens. Preview forms do not save data. The QR check-in screen uses the live check-in API and is marked separately.

Guests can browse and select ticket quantity. The event ID and quantity survive the Clerk sign-in redirect. The live organizer event form can select from the first 100 owned venues returned by the venue API. Venue creation still uses a preview form, so an organizer with no venue needs a connected venue-management UI before they can create an event from the browser.

## Verification and limitations

Run `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`. Component tests mock Clerk and API responses; they do not prove live OAuth, email or SMS delivery, Razorpay checkout, Cloudinary upload, or production database connectivity. See `docs/api/` for backend contracts. The public organizer profile and several organizer preview screens still use presentation data; their labels identify that content.
