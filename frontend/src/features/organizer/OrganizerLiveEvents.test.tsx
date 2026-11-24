import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteShell } from '../../components/layout/SiteShell'
import { OrganizerLiveEventForm } from './OrganizerLiveEventForm'
import { OrganizerLiveEventDetailPage, OrganizerLiveEventsPage } from './OrganizerLiveEventsPage'

const eventId = '507f191e810c19729de860eb'
const venueId = '507f191e810c19729de860ec'
const venue = {
  _id: venueId,
  name: 'Harbour Arena',
  capacity: 500,
  address: { city: 'Mumbai', country: 'India' },
}
const draft = {
  _id: eventId,
  name: 'Monsoon Sessions',
  venueId,
  status: 'draft',
  startDate: '2027-02-20T18:00:00.000Z',
  endDate: '2027-02-20T21:00:00.000Z',
  location: { city: 'Mumbai', country: 'India' },
  ticketPrice: 499,
  maxAttendees: 200,
  ticketsSold: 0,
  ticketsReserved: 0,
  description: 'A live music evening.',
  category: 'Music',
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
          <Route path="/organizer/events" element={<OrganizerLiveEventsPage />} />
          <Route path="/organizer/events/new" element={<OrganizerLiveEventForm />} />
          <Route path="/organizer/events/:eventId/edit" element={<OrganizerLiveEventForm />} />
          <Route path="/organizer/events/:eventId" element={<OrganizerLiveEventDetailPage />} />
          <Route
            path="/profile"
            element={
              <SiteShell>
                <p>Account</p>
              </SiteShell>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function installApi(initialStatus: typeof draft.status = 'draft', coverFailsOnce = false) {
  let status = initialStatus
  let coverFailed = false
  const requests: { path: string; method: string; body: unknown; authorization: string | null }[] =
    []
  const fetcher = vi.fn().mockImplementation(async (url: string, options: RequestInit = {}) => {
    const path = new URL(url).pathname
    const method = options.method ?? 'GET'
    const body: unknown =
      options.body && !(options.body instanceof File) ? JSON.parse(String(options.body)) : null
    requests.push({
      path,
      method,
      body,
      authorization: new Headers(options.headers).get('Authorization'),
    })
    const reply = (data: unknown, code = 200, pagination?: object) =>
      new Response(JSON.stringify({ data, pagination }), { status: code })
    if (path === '/api/venues') return reply([venue], 200, { page: 1, limit: 100, total: 1 })
    if (path === '/api/organizer/events' && method === 'GET')
      return reply([{ ...draft, status }], 200, { page: 1, limit: 20, total: 1 })
    if (path === '/api/organizer/events' && method === 'POST')
      return reply({ ...draft, ...(body as object) }, 201)
    if (path === `/api/organizer/events/${eventId}` && method === 'PATCH')
      return reply({ ...draft, ...(body as object) })
    if (path === `/api/organizer/events/${eventId}/cover` && method === 'PUT') {
      if (coverFailsOnce && !coverFailed) {
        coverFailed = true
        return new Response(
          JSON.stringify({ error: { code: 'MEDIA_UNAVAILABLE', message: 'Upload unavailable' } }),
          { status: 503 },
        )
      }
      return reply({ imageUrl: 'https://example.com/cover.jpg' })
    }
    if (path === `/api/organizer/events/${eventId}`) return reply({ ...draft, status })
    if (path === `/api/organizer/events/${eventId}/publish`) {
      status = 'published'
      return reply({ ...draft, status })
    }
    if (path === `/api/organizer/events/${eventId}/cancel`) {
      status = 'cancelled'
      return reply({ ...draft, status })
    }
    throw new Error(`Unexpected request: ${method} ${path}`)
  })
  vi.stubGlobal('fetch', fetcher)
  return requests
}

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000'))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('live organizer event management', () => {
  it('lists an owned draft and opens its details with a Clerk token', async () => {
    const requests = installApi()
    renderRoute('/organizer/events')
    expect(await screen.findByRole('heading', { name: 'Monsoon Sessions' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Manage' }))
    expect(await screen.findByRole('link', { name: 'Edit draft' })).toBeTruthy()
    expect(requests.every((request) => request.authorization === 'Bearer test-token')).toBe(true)
  })

  it('creates a draft using a real owned venue and exact backend fields', async () => {
    const requests = installApi()
    renderRoute('/organizer/events/new')
    await screen.findByRole('option', { name: /Harbour Arena/ })
    fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'New Music Night' } })
    fireEvent.change(screen.getByLabelText('Venue'), { target: { value: venueId } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Music' } })
    fireEvent.change(screen.getByLabelText('Starts (your local time)'), {
      target: { value: '2027-02-20T18:00' },
    })
    fireEvent.change(screen.getByLabelText('Ends (your local time)'), {
      target: { value: '2027-02-20T21:00' },
    })
    fireEvent.change(screen.getByLabelText('Ticket price (₹)'), { target: { value: '250' } })
    fireEvent.change(screen.getByLabelText('Capacity'), { target: { value: '100' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Create draft' }))
    await waitFor(() => expect(requests.some((request) => request.method === 'POST')).toBe(true))
    const create = requests.find((request) => request.method === 'POST')
    expect(create?.path).toBe('/api/organizer/events')
    expect(create?.body).toMatchObject({
      name: 'New Music Night',
      venueId,
      maxAttendees: 100,
      ticketPrice: 250,
    })
    expect(create?.authorization).toBe('Bearer test-token')
  })

  it('retries a failed cover upload without creating a duplicate event', async () => {
    const requests = installApi('draft', true)
    renderRoute('/organizer/events/new')
    await screen.findByRole('option', { name: /Harbour Arena/ })
    fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'New Music Night' } })
    fireEvent.change(screen.getByLabelText('Venue'), { target: { value: venueId } })
    fireEvent.change(screen.getByLabelText('Starts (your local time)'), {
      target: { value: '2027-02-20T18:00' },
    })
    fireEvent.change(screen.getByLabelText('Ends (your local time)'), {
      target: { value: '2027-02-20T21:00' },
    })
    fireEvent.change(screen.getByLabelText('Ticket price (₹)'), { target: { value: '250' } })
    fireEvent.change(screen.getByLabelText('Capacity'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Cover image (optional)'), {
      target: { files: [new File(['image'], 'cover.jpg', { type: 'image/jpeg' })] },
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Create draft' }))
    expect(
      await screen.findByText(/Event details were saved, but the cover upload failed/),
    ).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() =>
      expect(requests.filter((request) => request.path.endsWith('/cover')).length).toBe(2),
    )
    expect(
      requests.filter(
        (request) => request.path === '/api/organizer/events' && request.method === 'POST',
      ),
    ).toHaveLength(1)
    expect(
      requests.filter(
        (request) =>
          request.path === `/api/organizer/events/${eventId}` && request.method === 'PATCH',
      ),
    ).toHaveLength(1)
  })

  it('edits a draft through the backend', async () => {
    const requests = installApi()
    renderRoute(`/organizer/events/${eventId}/edit`)
    await screen.findByRole('button', { name: 'Save draft' })
    fireEvent.change(screen.getByLabelText('Event name'), {
      target: { value: 'Revised Music Night' },
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(requests.some((request) => request.method === 'PATCH')).toBe(true))
    expect(requests.find((request) => request.method === 'PATCH')?.body).toMatchObject({
      name: 'Revised Music Night',
      venueId,
    })
  })

  it('blocks editing a published event', async () => {
    installApi('published')
    renderRoute(`/organizer/events/${eventId}/edit`)
    expect(
      await screen.findByText('Only draft events can be edited under the current event policy.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull()
  })

  it('publishes a draft through the backend and refreshes its status', async () => {
    const requests = installApi()
    renderRoute(`/organizer/events/${eventId}`)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Publish event' }))
    await waitFor(() =>
      expect(
        requests.some((request) => request.path.endsWith('/publish') && request.method === 'POST'),
      ).toBe(true),
    )
    expect(await screen.findByText('published')).toBeTruthy()
  })

  it('requires a second action before cancelling an event', async () => {
    const requests = installApi()
    renderRoute(`/organizer/events/${eventId}`)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Cancel event' }))
    expect(requests.some((request) => request.path.endsWith('/cancel'))).toBe(false)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    await waitFor(() =>
      expect(
        requests.some((request) => request.path.endsWith('/cancel') && request.method === 'POST'),
      ).toBe(true),
    )
    expect(await screen.findByText('Event cancelled.')).toBeTruthy()
  })

  it('shows the attendee account-menu path when organizer permission is denied', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }), {
          status: 403,
        }),
      ),
    )
    renderRoute('/profile')
    await userEvent.setup().click(screen.getByLabelText('Account menu'))
    expect(
      (await screen.findByRole('link', { name: 'Become an organizer' })).getAttribute('href'),
    ).toBe('/become-organizer')
  })
})
