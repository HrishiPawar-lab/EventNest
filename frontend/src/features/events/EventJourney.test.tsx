import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { RequireAuth } from '../auth/AuthRoutes'
import { BookingReviewPage } from '../booking/BookingReviewPage'
import { DiscoverPage } from './DiscoverPage'
import { EventDetailsPage } from './EventDetailsPage'
import { ExplorePage } from './ExplorePage'
import { eventId, installTestApi } from '../../app/testApi'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false, getToken: async () => null }),
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
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
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
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('public event journey', () => {
  beforeEach(() => vi.stubGlobal('fetch', installTestApi()))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('searches published events and shows a useful empty state', async () => {
    const user = userEvent.setup()
    renderJourney()
    await user.type(screen.getByRole('textbox', { name: 'Search events' }), 'Food')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Search results' })).toBeTruthy(),
    )
    expect(await screen.findByRole('link', { name: 'View Street Food Social' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'View Afterglow Live' })).toBeNull()

    await user.clear(screen.getByRole('textbox', { name: 'Search events' }))
    await user.type(screen.getByRole('textbox', { name: 'Search events' }), 'no such event')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'No events match those filters' })).toBeTruthy(),
    )
  })

  it('filters events from category shortcuts and can restore the full list', async () => {
    const user = userEvent.setup()
    renderJourney('/explore')

    await user.click(screen.getByRole('button', { name: 'Food' }))
    expect(screen.getByRole('button', { name: 'Food' }).getAttribute('aria-pressed')).toBe('true')
    expect(await screen.findByRole('link', { name: 'View Street Food Social' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'View Afterglow Live' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'All events' }))
    expect(await screen.findByRole('link', { name: 'View Afterglow Live' })).toBeTruthy()
  })

  it('keeps selected tickets through the guest sign-in redirect', async () => {
    const user = userEvent.setup()
    renderJourney()
    await user.click(await screen.findByRole('link', { name: 'View Afterglow Live' }))
    await screen.findByRole('heading', { name: 'Afterglow Live' })
    await user.click(screen.getByRole('button', { name: 'Add one ticket' }))
    await user.click(screen.getByRole('button', { name: 'Add one ticket' }))
    expect(screen.getAllByText('₹7,497')).toHaveLength(2)
    await user.click(screen.getAllByRole('link', { name: 'Review tickets' })[0])
    expect(screen.getByText('3 tickets')).toBeTruthy()
    await user.click(screen.getByRole('link', { name: 'Continue to checkout' }))
    await waitFor(() =>
      expect(screen.getByText(`Return to: /checkout/${eventId}?quantity=3`)).toBeTruthy(),
    )
    expect(screen.queryByText('Checkout')).toBeNull()
  })
})
