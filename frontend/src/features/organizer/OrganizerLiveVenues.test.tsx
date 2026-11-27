import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BecomeOrganizerPage } from './BecomeOrganizerPage'
import { OrganizerLiveEventForm } from './OrganizerLiveEventForm'
import { OrganizerLiveVenueForm, OrganizerLiveVenuesPage } from './OrganizerLiveVenuesPage'

const venueId = '507f191e810c19729de860ec'
const venue = {
  _id: venueId,
  name: 'Harbour Arena',
  type: 'auditorium',
  capacity: 500,
  address: { city: 'Mumbai', country: 'India' },
  location: { type: 'Point', coordinates: [72.8777, 19.076] },
}

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: async () => 'test-token' }),
  useUser: () => ({ user: { id: 'clerk-owner', firstName: 'Ada' } }),
  useClerk: () => ({ signOut: vi.fn() }),
}))

function renderRoute(path: string) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/become-organizer" element={<BecomeOrganizerPage />} />
          <Route path="/organizer/venues" element={<OrganizerLiveVenuesPage />} />
          <Route path="/organizer/venues/new" element={<OrganizerLiveVenueForm />} />
          <Route path="/organizer/venues/:venueId/edit" element={<OrganizerLiveVenueForm />} />
          <Route path="/organizer/events/new" element={<OrganizerLiveEventForm />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000'))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('live venue and organizer onboarding', () => {
  it('activates a verified attendee and opens the live venue form', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, options: RequestInit = {}) => {
        const path = new URL(url).pathname
        calls.push(`${options.method ?? 'GET'} ${path}`)
        if (path === '/api/organizer/events')
          return new Response(
            JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
            { status: 403 },
          )
        if (path === '/api/organizer/activate')
          return new Response(JSON.stringify({ data: { roles: ['attendee', 'organizer'] } }))
        return new Response(
          JSON.stringify({ data: [], pagination: { page: 1, limit: 100, total: 0 } }),
        )
      }),
    )
    renderRoute('/become-organizer')
    const activate = await screen.findByRole('button', { name: /Become an organizer/i })
    await waitFor(() => expect(activate.hasAttribute('disabled')).toBe(false))
    fireEvent.click(activate)
    expect(await screen.findByLabelText('Venue name')).toBeTruthy()
    expect(calls).toContain('POST /api/organizer/activate')
  })

  it('creates a venue with GeoJSON coordinates and displays it in the live list', async () => {
    const requests: Array<{ method: string; path: string; body: unknown; token: string | null }> =
      []
    let venues: (typeof venue)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, options: RequestInit = {}) => {
        const path = new URL(url).pathname
        const method = options.method ?? 'GET'
        requests.push({
          method,
          path,
          body: options.body ? JSON.parse(String(options.body)) : null,
          token: new Headers(options.headers).get('Authorization'),
        })
        if (path === '/api/venues' && method === 'POST') {
          venues = [{ ...venue, ...(requests.at(-1)?.body as object) }]
          return new Response(JSON.stringify({ data: venues[0] }), { status: 201 })
        }
        return new Response(
          JSON.stringify({
            data: venues,
            pagination: { page: 1, limit: 100, total: venues.length },
          }),
        )
      }),
    )
    renderRoute('/organizer/venues/new')
    fireEvent.change(screen.getByLabelText('Venue name'), { target: { value: 'Harbour Arena' } })
    fireEvent.change(screen.getByLabelText('Capacity'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Mumbai' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '72.8777' } })
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '19.076' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create venue' }))
    expect(await screen.findByRole('heading', { name: 'Harbour Arena' })).toBeTruthy()
    const create = requests.find((request) => request.method === 'POST')
    expect(create?.token).toBe('Bearer test-token')
    expect(create?.body).toMatchObject({
      name: 'Harbour Arena',
      capacity: 500,
      address: { city: 'Mumbai', country: 'India' },
      location: { type: 'Point', coordinates: [72.8777, 19.076] },
    })
  })

  it('requires coordinates before submitting', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: [], pagination: { page: 1, limit: 100, total: 0 } })),
    )
    vi.stubGlobal('fetch', fetcher)
    renderRoute('/organizer/venues/new')
    fireEvent.change(screen.getByLabelText('Venue name'), { target: { value: 'Harbour Arena' } })
    fireEvent.change(screen.getByLabelText('Capacity'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Mumbai' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create venue' }))
    expect(await screen.findByText('Enter a longitude')).toBeTruthy()
    await waitFor(() =>
      expect(fetcher).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/venues'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})
