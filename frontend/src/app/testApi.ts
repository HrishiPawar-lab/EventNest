import { vi } from 'vitest'

export const eventId = '507f1f77bcf86cd799439011'
export const foodId = '507f1f77bcf86cd799439012'
export const ticketId = '507f1f77bcf86cd799439013'
export const reservationId = '507f1f77bcf86cd799439014'
export const paymentId = '507f1f77bcf86cd799439015'

export const eventRows = [
  {
    _id: eventId,
    name: 'Afterglow Live',
    description: 'An evening of music.',
    category: 'Music',
    venueName: 'Harbour Arena',
    organizerName: 'Good Nights Collective',
    location: { city: 'Mumbai', country: 'India' },
    startDate: '2027-02-20T13:30:00.000Z',
    endDate: '2027-02-20T16:30:00.000Z',
    ticketPrice: 2499,
    imageUrl: '/images/concert.jpg',
  },
  {
    _id: foodId,
    name: 'Street Food Social',
    description: 'A day of great food.',
    category: 'Food',
    venueName: 'Old Mill Grounds',
    organizerName: 'The Table Project',
    location: { city: 'Delhi', country: 'India' },
    startDate: '2027-03-13T06:30:00.000Z',
    endDate: '2027-03-13T12:30:00.000Z',
    ticketPrice: 499,
    imageUrl: '/images/food.jpg',
  },
]

function reply(data: unknown, status = 200, total?: number) {
  return new Response(
    JSON.stringify({
      data,
      ...(total === undefined ? {} : { pagination: { page: 1, limit: 20, total } }),
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

export function installTestApi() {
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const path = url.pathname
    if (path === '/api/events') {
      const q = url.searchParams.get('q')?.toLowerCase() ?? ''
      const category = url.searchParams.get('category') ?? ''
      const rows = eventRows.filter(
        (event) =>
          (!q || `${event.name} ${event.description}`.toLowerCase().includes(q)) &&
          (!category || event.category === category),
      )
      return reply(rows, 200, rows.length)
    }
    if (path.startsWith('/api/events/')) {
      const event = eventRows.find((row) => row._id === path.split('/').at(-1))
      return event
        ? reply(event)
        : new Response(
            JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Event not found' } }),
            { status: 404 },
          )
    }
    if (path === '/api/tickets')
      return reply(
        [
          {
            _id: ticketId,
            ticketNumber: 'EN-TEST',
            reservationId,
            pricePaid: 2499,
            status: 'valid',
            issuedAt: '2026-11-24T00:00:00.000Z',
            eventId: { ...eventRows[0], name: 'Afterglow Live' },
          },
        ],
        200,
        1,
      )
    if (path === `/api/tickets/${ticketId}`)
      return reply({
        _id: ticketId,
        ticketNumber: 'EN-TEST',
        reservationId,
        pricePaid: 2499,
        status: 'valid',
        issuedAt: '2026-11-24T00:00:00.000Z',
        eventId: eventRows[0],
      })
    if (path === `/api/tickets/${ticketId}/qr`)
      return reply({ token: 'test_opaque_qr_token_12345678901234567890' })
    if (path === '/api/wishlist') return reply([], 200, 0)
    if (path === '/api/organizer/events') return reply([], 200, 0)
    if (path === `/api/reservations/${reservationId}`)
      return reply({
        _id: reservationId,
        eventId,
        quantity: 2,
        status: 'confirmed',
        expiresAt: '2026-11-24T12:00:00.000Z',
      })
    if (path === `/api/payments/${paymentId}`)
      return reply({
        id: paymentId,
        reservationId,
        amount: 499800,
        currency: 'INR',
        status: 'successful',
        refundStatus: null,
        paidAt: '2026-11-24T11:59:00.000Z',
        refundedAt: null,
      })
    if (path === '/api/bookings') return reply([], 200, 0)
    throw new Error(`Unexpected test API request: ${init?.method ?? 'GET'} ${path}`)
  })
}
