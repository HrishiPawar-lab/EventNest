# EventNest frontend

React, TypeScript, Vite, Tailwind CSS, and Clerk power the EventNest interface. The frontend has public event discovery, account screens, an attendee journey, and an organizer workspace preview. The event, booking, ticket, and organizer content is **sample presentation data** until the corresponding backend APIs exist. The app does not create reservations, accept payments, issue tickets, or check guests in.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_CLERK_PUBLISHABLE_KEY` to the Clerk publishable key. Never put a Clerk secret key in a `VITE_` variable.
3. Run `npm ci` and `npm run dev`.

The Clerk instance must enable email/password sign-in, Google OAuth, and email verification. In the Clerk Dashboard, make phone collection optional at sign-up. Phone verification can be offered later through `/verify-phone` where Clerk SMS is supported. If Clerk Organizations are enabled, set membership optional and disable automatic first-organization creation so attendee registration does not require an organization. EventNest requires a verified primary email but never requires a phone number.

## Frontend structure and routes

`src/app/router.tsx` owns route composition. `src/features/` groups auth, events, booking, tickets, wishlist, profile, and organizer screens. `src/components/layout/SiteShell.tsx` provides shared attendee navigation; organizer preview screens share `OrganizerShell.tsx`. Shared UI primitives remain in `src/components/ui/`. The public event catalog is defined once in `src/features/events/catalog.ts`.

- Public: `/`, `/explore`, `/search`, `/events/:eventId`, `/booking/review/:eventId`, `/organizers/:slug`.
- Clerk and account: `/sign-in`, `/sign-up`, `/verify-email`, optional `/verify-phone`, `/profile`, `/settings`.
- Protected attendee: `/checkout/:eventId`, `/booking/confirmation/:eventId`, `/tickets`, `/tickets/:ticketId`, `/wishlist`.
- Protected organizer **preview**: `/become-organizer` and `/organizer/preview/*` for dashboard, events, venues, attendees, check-in, and analytics. Preview access does not grant organizer permissions or permit data changes.

Guests can browse, search, filter, and open event details. The event ID and selected `quantity` remain in the checkout URL through the Clerk sign-in redirect. Only authenticated users can open checkout, and the payment action remains disabled while reservation and payment APIs are absent. The ticket detail screen contains no scannable QR code. Organizer forms validate input and show a local preview; they do not save or publish anything. Preview wishlist selections are stored per Clerk user in this browser, with no backend sync.

## Backend integration needed

The backend currently exposes health and Clerk webhook functionality, with no confirmed product endpoints. Live screens require documented contracts for public event search and details, local user roles and organizer onboarding, organizer-owned venues and events, wishlist persistence, atomic ticket reservations, Razorpay payment verification, issued tickets and QR credentials, check-in, and analytics. Role and ownership decisions must be enforced on the backend. The frontend must not infer organizer permission from Clerk alone.

`useAuthenticatedApi()` in `src/features/auth/api.ts` is ready to attach a fresh Clerk session token as a Bearer token to future protected requests. Set `VITE_API_BASE_URL` to the backend origin when product endpoints and CORS are available.

## Assets and checks

The visual direction is recorded in `docs/ui/image.png`. Event photography in `public/images` is sourced from Unsplash. The images are used as generic scenes, not as photos of the sample events. Run `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`. Tests mock Clerk operations and do not prove live OAuth, email/SMS delivery, database connectivity, or payment integration.
