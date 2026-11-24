# EventNest frontend

React, TypeScript, Vite, Tailwind CSS, and Clerk power the current frontend scaffold. The public home page is available without signing in. Sign-in, sign-up, email verification, optional phone verification, and a protected account placeholder are implemented.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_CLERK_PUBLISHABLE_KEY` to the Clerk publishable key for this environment. Never put a Clerk secret key in a `VITE_` variable.
3. Run `npm ci` and `npm run dev`.

The Clerk Dashboard instance must have email/password sign-in, Google OAuth, and email verification codes enabled. In **User & authentication → Phone**, make phone collection optional at sign-up; verify that Clerk's sign-up form no longer marks Phone number as required. Keep phone capability enabled if users should be able to add a number later through `/verify-phone`. The app requires a verified primary email before signed-in users can continue. Optional phone verification depends on Clerk SMS availability for the user's country. Clerk's sign-in and sign-up components follow Dashboard settings and own password, OAuth, and initial sign-up verification flows; EventNest never stores credentials.

## Routes and redirects

- `/` is public.
- `/sign-in` and `/sign-up` use Clerk's prebuilt components.
- `/verify-email` completes required email verification with Clerk APIs. `/verify-phone` lets signed-in users add a verified phone number voluntarily when Clerk SMS is available.
- `/account` is protected and currently contains only account status and sign-out.

Protected-route redirects keep a same-origin destination in `return_to` and tab-local session storage. The `destinationFromLocation` helper also carries `location.state.ticketSelection.eventId` and `.quantity` into the return URL. A future event or checkout screen must pass that state when it starts sign-in; no checkout route or backend ticket endpoint exists yet.

## Backend API dependency

`useAuthenticatedApi()` in `src/features/auth/api.ts` retrieves a fresh Clerk session token and sends it as `Authorization: Bearer ...` to `VITE_API_BASE_URL`. It is ready for future protected API calls and is not currently called by the account placeholder. The backend still needs a protected product endpoint and CORS configured for the frontend origin before a live cross-origin request can be verified. Set `VITE_API_BASE_URL` to the backend origin when those routes are available.

## Checks

Run `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`. The build first typechecks the TypeScript source and tests. Tests mock Clerk account operations and cover route gating, destination preservation, OTP interactions, sign-out, and Bearer-token request construction. They do not prove live Google OAuth, email delivery, SMS delivery, or Clerk Dashboard configuration.
