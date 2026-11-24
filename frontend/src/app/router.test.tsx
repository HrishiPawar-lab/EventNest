import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './router'
import { eventId, installTestApi, paymentId, ticketId } from './testApi'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: async () => 'test-token' }),
  useUser: () => ({
    isLoaded: true,
    user: {
      id: 'user-preview',
      firstName: 'Ada',
      lastName: 'Lovelace',
      primaryEmailAddress: {
        emailAddress: 'ada@example.com',
        verification: { status: 'verified' },
      },
      primaryPhoneNumber: null,
    },
  }),
  useClerk: () => ({ signOut: vi.fn() }),
}))

beforeEach(() => vi.stubGlobal('fetch', installTestApi()))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('screen routes', () => {
  it.each([
    ['/', 'Discover unforgettable events.'],
    ['/explore', 'Explore events'],
    ['/search?q=music', 'Search results'],
    [`/events/${eventId}`, 'Afterglow Live'],
    [`/booking/review/${eventId}?quantity=2`, 'Review your tickets'],
    [`/checkout/${eventId}?quantity=2`, 'Checkout'],
    [`/booking/confirmation/${eventId}?paymentId=${paymentId}`, 'Your tickets are confirmed'],
    ['/tickets', 'My tickets'],
    [`/tickets/${ticketId}`, 'Afterglow Live'],
    ['/wishlist', 'Your wishlist'],
    ['/profile', 'Welcome, Ada'],
    ['/settings', 'Account settings'],
    ['/become-organizer', 'Make your next event happen.'],
    ['/organizer/preview', 'Organizer dashboard'],
    ['/organizer/preview/events', 'My events'],
    ['/organizer/preview/events/new', 'Create an event'],
    ['/organizer/preview/events/afterglow-live/edit', 'Edit event'],
    ['/organizer/preview/events/afterglow-live', 'Afterglow Live'],
    ['/organizer/preview/attendees', 'Attendee management'],
    ['/organizer/preview/check-in', 'QR check-in'],
    ['/organizer/preview/venues', 'Venue management'],
    ['/organizer/preview/venues/new', 'Create a venue'],
    ['/organizer/preview/venues/harbour-arena/edit', 'Edit venue'],
    ['/organizer/preview/analytics', 'Sales & analytics'],
    ['/organizers/good-nights-collective', 'Good Nights Collective'],
  ])('renders %s', async (path, heading) => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 5000 }),
    ).toBeTruthy()
  })
})
