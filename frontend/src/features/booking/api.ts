import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { jsonBody, usePrivateApi } from '../../lib/api'
import { eventKeys } from '../events/api'

export type Reservation = {
  _id: string
  eventId: string
  quantity: number
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled'
  expiresAt: string
}

export type PaymentOrder = {
  paymentId: string
  providerOrderId: string
  amount: number
  currency: 'INR'
  keyId: string
}

export type Payment = {
  id: string
  reservationId: string
  providerOrderId: string
  keyId: string
  amount: number
  currency: 'INR'
  status: 'created' | 'pending' | 'successful' | 'failed' | 'refunded'
  refundStatus: null | 'pending' | 'processed' | 'failed'
  paidAt: string | null
  refundedAt: string | null
}

export type VerificationResult = {
  status: 'confirmed' | 'refund_pending' | 'refund_failed' | 'refunded'
  paymentId: string
}

export const bookingKeys = {
  reservation: (id: string) => ['reservations', id] as const,
  payment: (id: string) => ['payments', id] as const,
  history: ['bookings'] as const,
}

export function useReservation(id: string | null) {
  const api = usePrivateApi()
  return useQuery({
    queryKey: bookingKeys.reservation(id ?? ''),
    queryFn: ({ signal }) => api<Reservation>(`/api/reservations/${id}`, { signal }),
    enabled: Boolean(id),
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 10_000 : false),
  })
}

export function useCreateReservation() {
  const api = usePrivateApi()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, quantity }: { eventId: string; quantity: number }) =>
      api<Reservation>('/api/reservations', { method: 'POST', ...jsonBody({ eventId, quantity }) }),
    onSuccess: (reservation) => {
      cache.setQueryData(bookingKeys.reservation(reservation._id), reservation)
      cache.invalidateQueries({ queryKey: eventKeys.detail(reservation.eventId) })
    },
  })
}

export function useCancelReservation() {
  const api = usePrivateApi()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/reservations/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      cache.invalidateQueries({ queryKey: bookingKeys.reservation(id) })
      cache.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

export function useCreatePaymentOrder() {
  const api = usePrivateApi()
  return useMutation({
    mutationFn: (reservationId: string) =>
      api<PaymentOrder>('/api/payments/orders', {
        method: 'POST',
        ...jsonBody({ reservationId }),
      }),
  })
}

export function useVerifyPayment() {
  const api = usePrivateApi()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: ({
      paymentId,
      providerPaymentId,
      signature,
    }: {
      paymentId: string
      providerPaymentId: string
      signature: string
    }) =>
      api<VerificationResult>(`/api/payments/${paymentId}/verify`, {
        method: 'POST',
        ...jsonBody({ providerPaymentId, signature }),
      }),
    onSuccess: (_result, input) => {
      cache.invalidateQueries({ queryKey: bookingKeys.payment(input.paymentId) })
      cache.invalidateQueries({ queryKey: ['reservations'] })
      cache.invalidateQueries({ queryKey: bookingKeys.history })
      cache.invalidateQueries({ queryKey: ['tickets'] })
      cache.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

export function usePayment(id: string | null) {
  const api = usePrivateApi()
  return useQuery({
    queryKey: bookingKeys.payment(id ?? ''),
    queryFn: ({ signal }) => api<Payment>(`/api/payments/${id}`, { signal }),
    enabled: Boolean(id),
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.status === 'created' || query.state.data?.status === 'pending'
        ? 5_000
        : false,
  })
}

export function useRetryRefund() {
  const api = usePrivateApi()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) =>
      api<{ status: string }>(`/api/payments/${paymentId}/retry-refund`, { method: 'POST' }),
    onSuccess: (_data, paymentId) =>
      cache.invalidateQueries({ queryKey: bookingKeys.payment(paymentId) }),
  })
}
