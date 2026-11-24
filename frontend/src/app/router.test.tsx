import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './router'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
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

afterEach(cleanup)

describe('screen routes', () => {
  it.each([
    ['/', 'Discover unforgettable events.'],
    ['/explore', 'Explore events'],
    ['/search?q=music', 'Search results'],
    ['/events/afterglow-live', 'Afterglow Live'],
    ['/booking/review/afterglow-live?quantity=2', 'Review your tickets'],
    ['/checkout/afterglow-live?quantity=2', 'Checkout'],
    ['/booking/confirmation/afterglow-live', 'A great night is one step away'],
    ['/tickets', 'My tickets'],
    ['/tickets/example', 'Afterglow Live'],
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
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 5000 }),
    ).toBeTruthy()
  })
})
