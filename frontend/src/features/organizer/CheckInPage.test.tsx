import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CheckInPage } from './CheckInPage'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: async () => 'organizer-token' }),
}))

const token = 'opaque-credential-value-from-qr'
const eventId = '507f191e810c19729de860ea'

describe('organizer check-in integration', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('submits the QR credential and reports a duplicate check-in error', async () => {
    let attempts = 0
    const fetcher = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const path = new URL(String(input)).pathname
      if (path === '/api/organizer/events') {
        return new Response(
          JSON.stringify({
            data: [
              {
                _id: eventId,
                name: 'Live Event',
                status: 'published',
                startDate: '2026-12-01T12:00:00Z',
                endDate: '2026-12-01T16:00:00Z',
              },
            ],
            pagination: { page: 1, limit: 100, total: 1 },
          }),
        )
      }
      if (path === `/api/organizer/events/${eventId}/check-ins`) {
        expect(options?.method).toBe('POST')
        expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer organizer-token')
        expect(JSON.parse(String(options?.body))).toEqual({ token })
        attempts += 1
        return attempts === 1
          ? new Response(
              JSON.stringify({
                data: { ticketId: 'ticket-1', status: 'used', usedAt: new Date().toISOString() },
              }),
            )
          : new Response(
              JSON.stringify({
                error: { code: 'ALREADY_USED', message: 'Ticket has already been checked in' },
              }),
              { status: 409 },
            )
      }
      throw new Error(`Unexpected request ${path}`)
    })
    vi.stubGlobal('fetch', fetcher)
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <CheckInPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    const input = await screen.findByRole('textbox', { name: 'QR credential' })
    await user.type(input, token)
    await user.click(screen.getByRole('button', { name: 'Validate and check in' }))
    expect(await screen.findByText('Check-in complete for ticket ticket-1.')).toBeTruthy()
    await user.type(input, token)
    await user.click(screen.getByRole('button', { name: 'Validate and check in' }))
    expect(await screen.findByText('Ticket has already been checked in')).toBeTruthy()
    expect(attempts).toBe(2)
  })
})
