import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { jsonBody, usePrivateApi, usePrivateApiPage } from '../../lib/api'

export type OrganizerEvent = {
  _id: string
  name: string
  startDate: string
  endDate: string
  status: string
}

export const organizerKeys = {
  all: ['organizer'] as const,
  events: ['organizer', 'events'] as const,
  attendees: (eventId: string) => ['organizer', 'attendees', eventId] as const,
}

export function useOrganizerEvents() {
  const api = usePrivateApiPage()
  return useQuery({
    queryKey: organizerKeys.events,
    queryFn: ({ signal }) =>
      api<OrganizerEvent>('/api/organizer/events?status=published&limit=100', signal),
    staleTime: 30_000,
  })
}

export function useCheckIn() {
  const api = usePrivateApi()
  const cache = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, token }: { eventId: string; token: string }) =>
      api<{ ticketId: string; status: 'used'; usedAt: string }>(
        `/api/organizer/events/${eventId}/check-ins`,
        { method: 'POST', ...jsonBody({ token }) },
      ),
    onSuccess: (_result, input) => {
      cache.invalidateQueries({ queryKey: organizerKeys.attendees(input.eventId) })
      cache.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
