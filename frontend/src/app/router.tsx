import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthComplete, RequireAuth } from '../features/auth/AuthRoutes'
import { LoadingScreen } from '../features/auth/LoadingScreen'

const DiscoverPage = lazy(() =>
  import('../features/events/DiscoverPage').then((module) => ({ default: module.DiscoverPage })),
)
const ExplorePage = lazy(() =>
  import('../features/events/ExplorePage').then((module) => ({ default: module.ExplorePage })),
)
const EventDetailsPage = lazy(() =>
  import('../features/events/EventDetailsPage').then((module) => ({
    default: module.EventDetailsPage,
  })),
)
const PublicOrganizerPage = lazy(() =>
  import('../features/events/EventDetailsPage').then((module) => ({
    default: module.PublicOrganizerPage,
  })),
)
const BookingReviewPage = lazy(() =>
  import('../features/booking/BookingPages').then((module) => ({
    default: module.BookingReviewPage,
  })),
)
const CheckoutPage = lazy(() =>
  import('../features/booking/BookingPages').then((module) => ({ default: module.CheckoutPage })),
)
const BookingConfirmationPage = lazy(() =>
  import('../features/booking/BookingPages').then((module) => ({
    default: module.BookingConfirmationPage,
  })),
)
const MyTicketsPage = lazy(() =>
  import('../features/tickets/TicketPages').then((module) => ({ default: module.MyTicketsPage })),
)
const TicketDetailsPage = lazy(() =>
  import('../features/tickets/TicketPages').then((module) => ({
    default: module.TicketDetailsPage,
  })),
)
const WishlistPage = lazy(() =>
  import('../features/wishlist/WishlistPage').then((module) => ({ default: module.WishlistPage })),
)
const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })),
)
const AccountSettingsPage = lazy(() =>
  import('../features/profile/AccountSettingsPage').then((module) => ({
    default: module.AccountSettingsPage,
  })),
)
const AuthPage = lazy(() =>
  import('../features/auth/AuthPage').then((module) => ({ default: module.AuthPage })),
)
const EmailVerificationPage = lazy(() =>
  import('../features/auth/EmailVerificationPage').then((module) => ({
    default: module.EmailVerificationPage,
  })),
)
const PhoneVerificationPage = lazy(() =>
  import('../features/auth/PhoneVerificationPage').then((module) => ({
    default: module.PhoneVerificationPage,
  })),
)
const BecomeOrganizerPage = lazy(() =>
  import('../features/organizer/BecomeOrganizerPage').then((module) => ({
    default: module.BecomeOrganizerPage,
  })),
)
const OrganizerAccessDeniedPage = lazy(() =>
  import('../features/organizer/BecomeOrganizerPage').then((module) => ({
    default: module.OrganizerAccessDeniedPage,
  })),
)
const OrganizerDashboardPage = lazy(() =>
  import('../features/organizer/OrganizerDashboardPage').then((module) => ({
    default: module.OrganizerDashboardPage,
  })),
)
const OrganizerEventsPage = lazy(() =>
  import('../features/organizer/OrganizerEventPages').then((module) => ({
    default: module.OrganizerEventsPage,
  })),
)
const EventFormPage = lazy(() =>
  import('../features/organizer/OrganizerEventPages').then((module) => ({
    default: module.EventFormPage,
  })),
)
const EventManagementPage = lazy(() =>
  import('../features/organizer/OrganizerEventPages').then((module) => ({
    default: module.EventManagementPage,
  })),
)
const VenueManagementPage = lazy(() =>
  import('../features/organizer/OrganizerVenuePages').then((module) => ({
    default: module.VenueManagementPage,
  })),
)
const VenueFormPage = lazy(() =>
  import('../features/organizer/OrganizerVenuePages').then((module) => ({
    default: module.VenueFormPage,
  })),
)
const AttendeeManagementPage = lazy(() =>
  import('../features/organizer/OrganizerPeoplePages').then((module) => ({
    default: module.AttendeeManagementPage,
  })),
)
const CheckInPage = lazy(() =>
  import('../features/organizer/OrganizerPeoplePages').then((module) => ({
    default: module.CheckInPage,
  })),
)
const OrganizerAnalyticsPage = lazy(() =>
  import('../features/organizer/OrganizerAnalyticsPage').then((module) => ({
    default: module.OrganizerAnalyticsPage,
  })),
)

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/search" element={<ExplorePage searchResults />} />
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
        <Route path="/booking/review/:eventId" element={<BookingReviewPage />} />
        <Route path="/organizers/:slug" element={<PublicOrganizerPage />} />
        <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
        <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/verify-phone" element={<PhoneVerificationPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/auth/complete" element={<AuthComplete />} />
          <Route path="/checkout/:eventId" element={<CheckoutPage />} />
          <Route path="/booking/confirmation/:eventId" element={<BookingConfirmationPage />} />
          <Route path="/tickets" element={<MyTicketsPage />} />
          <Route path="/tickets/:ticketId" element={<TicketDetailsPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/account" element={<ProfilePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<AccountSettingsPage />} />
          <Route path="/become-organizer" element={<BecomeOrganizerPage />} />
          <Route path="/organizer/access-denied" element={<OrganizerAccessDeniedPage />} />
          <Route path="/organizer/preview" element={<OrganizerDashboardPage />} />
          <Route path="/organizer/preview/events" element={<OrganizerEventsPage />} />
          <Route path="/organizer/preview/events/new" element={<EventFormPage />} />
          <Route path="/organizer/preview/events/:eventId/edit" element={<EventFormPage />} />
          <Route path="/organizer/preview/events/:eventId" element={<EventManagementPage />} />
          <Route path="/organizer/preview/venues" element={<VenueManagementPage />} />
          <Route path="/organizer/preview/venues/new" element={<VenueFormPage />} />
          <Route path="/organizer/preview/venues/:venueId/edit" element={<VenueFormPage />} />
          <Route path="/organizer/preview/attendees" element={<AttendeeManagementPage />} />
          <Route path="/organizer/preview/check-in" element={<CheckInPage />} />
          <Route path="/organizer/preview/analytics" element={<OrganizerAnalyticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
