import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { eventId, eventRows, paymentId, reservationId, ticketId } from '../../app/testApi'
import { MyTicketsPage } from '../tickets/TicketPages'
import { BookingConfirmationPage } from './BookingConfirmationPage'
import { CheckoutPage } from './CheckoutPage'
import { openCheckout } from './razorpay'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: async () => 'test-token' }),
  useUser: () => ({
    isLoaded: true,
    user: { primaryEmailAddress: { emailAddress: 'attendee@example.com' } },
  }),
  useClerk: () => ({ signOut: vi.fn() }),
}))
vi.mock('./razorpay', () => ({ openCheckout: vi.fn() }))

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function setupApi({
  expired = false,
  paymentState = 'created',
  refundState = null,
  verificationOutcome = 'confirmed',
}: {
  expired?: boolean
  paymentState?: string
  refundState?: string | null
  verificationOutcome?: 'confirmed' | 'refund_pending' | 'refund_failed' | 'refunded'
} = {}) {
  let paymentStatus = paymentState
  let refundStatus = refundState
  let reservationStatus = expired ? 'expired' : 'pending'
  const requests: { method: string; path: string; body?: unknown; authorization: string | null }[] =
    []
  const fetcher = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = new URL(String(input))
    const method = options?.method ?? 'GET'
    const path = url.pathname
    requests.push({
      method,
      path,
      body: options?.body ? (JSON.parse(String(options.body)) as unknown) : undefined,
      authorization: new Headers(options?.headers).get('Authorization'),
    })
    if (path === `/api/events/${eventId}`) return json(eventRows[0])
    if (path === '/api/reservations' && method === 'POST') {
      reservationStatus = 'pending'
      return json(
        {
          _id: reservationId,
          eventId,
          quantity: 2,
          status: 'pending',
          expiresAt: new Date(Date.now() + 300_000).toISOString(),
        },
        201,
      )
    }
    if (path === `/api/reservations/${reservationId}`)
      return json({
        _id: reservationId,
        eventId,
        quantity: 2,
        status: reservationStatus,
        expiresAt: new Date(
          Date.now() + (reservationStatus === 'expired' ? -1000 : 300_000),
        ).toISOString(),
      })
    if (path === '/api/payments/orders' && method === 'POST')
      return json(
        {
          paymentId,
          providerOrderId: 'order_test123',
          amount: 499800,
          currency: 'INR',
          keyId: 'rzp_test_public',
        },
        201,
      )
    if (path === `/api/payments/${paymentId}/verify` && method === 'POST') {
      paymentStatus = verificationOutcome === 'refunded' ? 'refunded' : 'successful'
      reservationStatus = verificationOutcome === 'confirmed' ? 'confirmed' : 'expired'
      refundStatus =
        verificationOutcome === 'confirmed'
          ? null
          : verificationOutcome === 'refund_failed'
            ? 'failed'
            : verificationOutcome === 'refunded'
              ? 'processed'
              : 'pending'
      return json({ paymentId, status: verificationOutcome })
    }
    if (path === `/api/payments/${paymentId}/retry-refund` && method === 'POST') {
      refundStatus = 'pending'
      return json({ status: 'pending' })
    }
    if (path === `/api/payments/${paymentId}`)
      return json({
        id: paymentId,
        reservationId,
        providerOrderId: 'order_test123',
        keyId: 'rzp_test_public',
        amount: 499800,
        currency: 'INR',
        status: paymentStatus,
        refundStatus,
        paidAt: paymentStatus === 'successful' ? new Date().toISOString() : null,
        refundedAt: null,
      })
    if (path === '/api/tickets')
      return new Response(
        JSON.stringify({
          data: [
            {
              _id: ticketId,
              ticketNumber: 'EN-TEST',
              reservationId,
              pricePaid: 2499,
              status: 'valid',
              issuedAt: new Date().toISOString(),
              eventId: eventRows[0],
            },
          ],
          pagination: { page: 1, limit: 20, total: 1 },
        }),
      )
    throw new Error(`Unexpected request ${method} ${path}`)
  })
  vi.stubGlobal('fetch', fetcher)
  return requests
}

function mount(path: string) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/checkout/:eventId" element={<CheckoutPage />} />
          <Route path="/booking/confirmation/:eventId" element={<BookingConfirmationPage />} />
          <Route path="/tickets" element={<MyTicketsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('attendee checkout integration', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    vi.mocked(openCheckout).mockReset()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('reserves after authentication, verifies a captured payment, and shows issued tickets', async () => {
    const requests = setupApi()
    vi.mocked(openCheckout).mockImplementation(async (_order, options) =>
      options.onSuccess({
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'a'.repeat(64),
      }),
    )
    mount(`/checkout/${eventId}?quantity=2`)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reserve and pay' }))
    expect(await screen.findByRole('heading', { name: 'Your tickets are confirmed' })).toBeTruthy()
    expect(requests.find((item) => item.path === '/api/reservations')?.body).toEqual({
      eventId,
      quantity: 2,
    })
    expect(requests.find((item) => item.path === '/api/reservations')?.authorization).toBe(
      'Bearer test-token',
    )
    expect(
      requests.find((item) => item.path === `/api/payments/${paymentId}/verify`)?.body,
    ).toEqual({ providerPaymentId: 'pay_test123', signature: 'a'.repeat(64) })
    await userEvent.setup().click(screen.getAllByRole('link', { name: /My tickets/i }).at(-1)!)
    expect(await screen.findByText('Ticket EN-TEST')).toBeTruthy()
  })

  it('keeps the hold but does not claim success after a failed checkout', async () => {
    const requests = setupApi()
    vi.mocked(openCheckout).mockImplementation(async (_order, options) => options.onFailure())
    mount(`/checkout/${eventId}?quantity=2`)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reserve and pay' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Payment failed')
    expect(requests.some((item) => item.path === `/api/payments/${paymentId}/verify`)).toBe(false)
    expect(screen.queryByRole('heading', { name: 'Your tickets are confirmed' })).toBeNull()
  })

  it('creates a new hold after the selected reservation has expired', async () => {
    const requests = setupApi({ expired: true })
    vi.mocked(openCheckout).mockImplementation(async (_order, options) => options.onDismiss())
    mount(`/checkout/${eventId}?quantity=2&reservationId=${reservationId}`)
    await screen.findByText('Reservation expired')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reserve and pay' }))
    await waitFor(() =>
      expect(requests.filter((item) => item.path === '/api/reservations')).toHaveLength(1),
    )
  })

  it('reopens the same payment order after returning to an active hold', async () => {
    const requests = setupApi()
    vi.mocked(openCheckout).mockImplementation(async (_order, options) => options.onDismiss())
    mount(`/checkout/${eventId}?quantity=2&reservationId=${reservationId}&paymentId=${paymentId}`)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reopen payment' }))
    await waitFor(() => expect(openCheckout).toHaveBeenCalledOnce())
    expect(vi.mocked(openCheckout).mock.calls[0][0].providerOrderId).toBe('order_test123')
    expect(requests.some((request) => request.path === '/api/payments/orders')).toBe(false)
  })

  it('routes a failed refund to recovery without creating another reservation', async () => {
    const requests = setupApi({ paymentState: 'successful', refundState: 'failed' })
    mount(`/checkout/${eventId}?quantity=2&reservationId=${reservationId}&paymentId=${paymentId}`)
    expect(await screen.findByRole('heading', { name: 'Booking is not confirmed' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry refund' }))
    await waitFor(() =>
      expect(
        requests.some((request) => request.path === `/api/payments/${paymentId}/retry-refund`),
      ).toBe(true),
    )
    expect(
      requests.some((request) => request.path === '/api/reservations' && request.method === 'POST'),
    ).toBe(false)
  })

  it('shows refund recovery after backend verification reports a late capture', async () => {
    setupApi({ verificationOutcome: 'refund_failed' })
    vi.mocked(openCheckout).mockImplementation(async (_order, options) =>
      options.onSuccess({
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'a'.repeat(64),
      }),
    )
    mount(`/checkout/${eventId}?quantity=2`)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reserve and pay' }))
    expect(await screen.findByRole('heading', { name: 'Booking is not confirmed' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry refund' })).toBeTruthy()
  })
})
