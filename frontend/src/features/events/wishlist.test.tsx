import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { eventId, eventRows } from '../../app/testApi'
import { WishlistButton } from './EventCard'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isSignedIn: true, getToken: async () => 'test-token' }),
}))

function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <WishlistButton eventId={eventId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('server wishlist', () => {
  beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test'))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('adds and removes a saved event through authenticated mutations', async () => {
    let saved = false
    const requests: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method ?? 'GET'
        requests.push(`${method} ${new URL(String(input)).pathname}`)
        if (method === 'GET')
          return new Response(
            JSON.stringify({
              data: saved ? [{ _id: 'one', eventId: eventRows[0] }] : [],
              pagination: { page: 1, limit: 100, total: saved ? 1 : 0 },
            }),
          )
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token')
        saved = method === 'PUT'
        return method === 'DELETE'
          ? new Response(null, { status: 204 })
          : new Response(JSON.stringify({ data: { eventId, saved: true } }))
      }),
    )
    mount()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Save to wishlist' }))
    await screen.findByRole('button', { name: 'Remove from wishlist' })
    await user.click(screen.getByRole('button', { name: 'Remove from wishlist' }))
    await screen.findByRole('button', { name: 'Save to wishlist' })
    expect(requests).toContain(`PUT /api/wishlist/${eventId}`)
    expect(requests).toContain(`DELETE /api/wishlist/${eventId}`)
  })

  it('shows the backend error when saving fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === 'PUT'
          ? new Response(
              JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Unavailable' } }),
              { status: 503 },
            )
          : new Response(
              JSON.stringify({ data: [], pagination: { page: 1, limit: 100, total: 0 } }),
            ),
      ),
    )
    mount()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Save to wishlist' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Could not update your wishlist',
    )
  })
})
