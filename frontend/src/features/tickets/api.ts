import { useQuery } from '@tanstack/react-query'
import { useAuth, useUser } from '@clerk/react'
import { usePrivateApi, usePrivateApiPage } from '../../lib/api'

export type Ticket = {
  _id: string
  ticketNumber: string
  reservationId: string
  pricePaid: number
  status: 'valid' | 'used' | 'cancelled' | 'refunded'
  issuedAt: string
  usedAt?: string
  eventId: {
    _id: string
    name: string
    startDate: string
    endDate: string
    location?: { city?: string; state?: string; country?: string }
    imageUrl?: string
  } | null
}

export const ticketKeys = {
  all: ['tickets'] as const,
  list: (page: number) => ['tickets', 'list', page] as const,
  detail: (id: string) => ['tickets', 'detail', id] as const,
  qr: (id: string) => ['tickets', 'qr', id] as const,
  ownership: (userId: string, eventId: string) =>
    ['tickets', 'ownership', userId, eventId] as const,
}

export function useOwnsEventTicket(eventId: string | undefined) {
  const api = usePrivateApi()
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  return useQuery({
    queryKey: ticketKeys.ownership(user?.id ?? '', eventId ?? ''),
    queryFn: ({ signal }) =>
      api<{ owned: boolean }>(
        `/api/tickets/ownership?eventId=${encodeURIComponent(eventId ?? '')}`,
        { signal },
      ),
    enabled: Boolean(isLoaded && isSignedIn && user?.id && eventId),
    staleTime: 15_000,
    retry: false,
  })
}

export function useTickets(page = 1) {
  const api = usePrivateApiPage()
  return useQuery({
    queryKey: ticketKeys.list(page),
    queryFn: ({ signal }) => api<Ticket>(`/api/tickets?page=${page}&limit=20`, signal),
    staleTime: 15_000,
  })
}

export function useTicket(id: string | undefined) {
  const api = usePrivateApi()
  return useQuery({
    queryKey: ticketKeys.detail(id ?? ''),
    queryFn: ({ signal }) => api<Ticket>(`/api/tickets/${id}`, { signal }),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

export function useTicketQr(id: string | undefined, enabled: boolean) {
  const api = usePrivateApi()
  return useQuery({
    queryKey: ticketKeys.qr(id ?? ''),
    queryFn: ({ signal }) => api<{ token: string }>(`/api/tickets/${id}/qr`, { signal }),
    enabled: Boolean(id) && enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
}
