import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { RequireAuth } from '../auth/AuthRoutes'
import { BookingReviewPage } from '../booking/BookingPages'
import { DiscoverPage } from './DiscoverPage'
import { EventDetailsPage } from './EventDetailsPage'
import { ExplorePage } from './ExplorePage'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useUser: () => ({ isLoaded: true, user: null }),
  useClerk: () => ({ signOut: vi.fn() }),
}))

function SignInDestination() {
  const location = useLocation()
  const destination = new URLSearchParams(location.search).get('return_to')
  return <p>Return to: {destination}</p>
}

function renderJourney(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/search" element={<ExplorePage searchResults />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
        <Route path="/booking/review/:eventId" element={<BookingReviewPage />} />
        <Route path="/sign-in" element={<SignInDestination />} />
        <Route element={<RequireAuth />}>
          <Route path="/checkout/:eventId" element={<p>Checkout</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('public event journey', () => {
  afterEach(cleanup)

  it('searches sample events and shows a useful empty state', async () => {
    const user = userEvent.setup()
    renderJourney()
    await user.type(screen.getByRole('textbox', { name: 'Search events' }), 'Food')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Search results' })).toBeTruthy(),
    )
    expect(screen.getByRole('link', { name: 'View Street Food Social' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'View Afterglow Live' })).toBeNull()

    await user.clear(screen.getByRole('textbox', { name: 'Search events' }))
    await user.type(screen.getByRole('textbox', { name: 'Search events' }), 'no such event')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'No events match those filters' })).toBeTruthy(),
    )
  })

  it('keeps selected tickets through the guest sign-in redirect', async () => {
    const user = userEvent.setup()
    renderJourney()
    await user.click(screen.getByRole('link', { name: 'View Afterglow Live' }))
    await user.click(screen.getByRole('button', { name: 'Add one ticket' }))
    await user.click(screen.getByRole('button', { name: 'Add one ticket' }))
    expect(screen.getByText('₹7,497')).toBeTruthy()
    await user.click(screen.getByRole('link', { name: 'Review tickets' }))
    expect(screen.getByText('3 tickets')).toBeTruthy()
    await user.click(screen.getByRole('link', { name: 'Sign in to continue' }))
    await waitFor(() =>
      expect(screen.getByText('Return to: /checkout/afterglow-live?quantity=3')).toBeTruthy(),
    )
    expect(screen.queryByText('Checkout')).toBeNull()
  })
})
