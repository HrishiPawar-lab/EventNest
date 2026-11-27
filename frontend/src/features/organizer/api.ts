import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/react'
import { jsonBody, usePrivateApi, usePrivateApiPage } from '../../lib/api'

export type OrganizerEvent = {
  _id: string
  name: string
  description?: string
  category?: string
  venueId: string
  location: { city: string; state?: string; country: string }
  startDate: string
  endDate: string
  maxAttendees: number
  ticketPrice: number
  ticketsSold: number
  ticketsReserved: number
  imageUrl?: string
  status: 'draft' | 'published' | 'cancelled' | 'completed'
}

export type OrganizerVenue = {
  _id: string
  name: string
  type: 'bar' | 'club' | 'restaurant' | 'auditorium' | 'outdoor' | 'other'
  description?: string
  capacity: number
  address: { street?: string; city: string; state?: string; country: string; postalCode?: string }
  location: { type: 'Point'; coordinates: [number, number] }
}

export type VenueInput = Omit<OrganizerVenue, '_id'>

export type EventInput = Pick<
  OrganizerEvent,
  | 'venueId'
  | 'name'
  | 'description'
  | 'category'
  | 'startDate'
  | 'endDate'
  | 'maxAttendees'
  | 'ticketPrice'
>

export const organizerKeys = {
  all: ['organizer'] as const,
  events: ['organizer', 'events'] as const,
  eventList: (userId: string, page: number) => ['organizer', userId, 'event-list', page] as const,
  eventDetail: (userId: string, id: string) => ['organizer', userId, 'event', id] as const,
  venues: (userId: string) => ['organizer', userId, 'venues'] as const,
  venueDetail: (userId: string, id: string) => ['organizer', userId, 'venue', id] as const,
  access: (userId: string) => ['organizer', userId, 'access'] as const,
  attendees: (eventId: string) => ['organizer', 'attendees', eventId] as const,
}

export function useOrganizerAccess() {
  const api = usePrivateApiPage()
  const { user } = useUser()
  return useQuery({
    queryKey: organizerKeys.access(user?.id ?? ''),
    queryFn: ({ signal }) => api<OrganizerEvent>('/api/organizer/events?limit=1', signal),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    retry: false,
  })
}

export function useOwnedEvents(page = 1) {
  const api = usePrivateApiPage()
  const { user } = useUser()
  return useQuery({
    queryKey: organizerKeys.eventList(user?.id ?? '', page),
    queryFn: ({ signal }) =>
      api<OrganizerEvent>(`/api/organizer/events?page=${page}&limit=20`, signal),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    retry: false,
  })
}

export function useOwnedEvent(id: string | undefined) {
  const api = usePrivateApi()
  const { user } = useUser()
  return useQuery({
    queryKey: organizerKeys.eventDetail(user?.id ?? '', id ?? ''),
    queryFn: ({ signal }) => api<OrganizerEvent>(`/api/organizer/events/${id}`, { signal }),
    enabled: Boolean(user?.id && id),
    staleTime: 30_000,
    retry: false,
  })
}

export function useOwnedVenues() {
  const api = usePrivateApiPage()
  const { user } = useUser()
  return useQuery({
    queryKey: organizerKeys.venues(user?.id ?? ''),
    queryFn: ({ signal }) => api<OrganizerVenue>('/api/venues?limit=100', signal),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    retry: false,
  })
}

export function useOwnedVenue(id: string | undefined) {
  const api = usePrivateApi()
  const { user } = useUser()
  return useQuery({
    queryKey: organizerKeys.venueDetail(user?.id ?? '', id ?? ''),
    queryFn: ({ signal }) => api<OrganizerVenue>(`/api/venues/${id}`, { signal }),
    enabled: Boolean(user?.id && id),
    retry: false,
  })
}

export function useVenueManagement() {
  const api = usePrivateApi()
  const cache = useQueryClient()
  const { user } = useUser()
  const refresh = (id?: string) => {
    cache.invalidateQueries({ queryKey: organizerKeys.venues(user?.id ?? '') })
    if (id) cache.invalidateQueries({ queryKey: organizerKeys.venueDetail(user?.id ?? '', id) })
  }
  const create = useMutation({
    mutationFn: (input: VenueInput) =>
      api<OrganizerVenue>('/api/venues', { method: 'POST', ...jsonBody(input) }),
    onSuccess: (venue) => refresh(venue._id),
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: VenueInput }) =>
      api<OrganizerVenue>(`/api/venues/${id}`, { method: 'PATCH', ...jsonBody(input) }),
    onSuccess: (venue) => refresh(venue._id),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/venues/${id}`, { method: 'DELETE' }),
    onSuccess: (_result, id) => refresh(id),
  })
  return { create, update, remove }
}

export function useActivateOrganizer() {
  const api = usePrivateApi()
  const cache = useQueryClient()
  const { user } = useUser()
  return useMutation({
    mutationFn: () =>
      api<{ roles: string[] }>('/api/organizer/activate', {
        method: 'POST',
        ...jsonBody({}),
      }),
    onSuccess: () => cache.invalidateQueries({ queryKey: organizerKeys.access(user?.id ?? '') }),
  })
}

export function useEventManagement() {
  const api = usePrivateApi()
  const cache = useQueryClient()
  const { user } = useUser()
  const refresh = (id?: string) => {
    cache.invalidateQueries({ queryKey: ['organizer', user?.id] })
    cache.invalidateQueries({ queryKey: ['events'] })
    if (id) cache.invalidateQueries({ queryKey: organizerKeys.eventDetail(user?.id ?? '', id) })
  }
  const create = useMutation({
    mutationFn: (input: EventInput) =>
      api<OrganizerEvent>('/api/organizer/events', { method: 'POST', ...jsonBody(input) }),
    onSuccess: (event) => refresh(event._id),
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: EventInput }) =>
      api<OrganizerEvent>(`/api/organizer/events/${id}`, { method: 'PATCH', ...jsonBody(input) }),
    onSuccess: (event) => refresh(event._id),
  })
  const publish = useMutation({
    mutationFn: (id: string) =>
      api<OrganizerEvent>(`/api/organizer/events/${id}/publish`, {
        method: 'POST',
        ...jsonBody({}),
      }),
    onSuccess: (event) => refresh(event._id),
  })
  const cancel = useMutation({
    mutationFn: (id: string) =>
      api<OrganizerEvent>(`/api/organizer/events/${id}/cancel`, {
        method: 'POST',
        ...jsonBody({}),
      }),
    onSuccess: (event) => refresh(event._id),
  })
  const uploadCover = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      api<{ imageUrl: string }>(`/api/organizer/events/${id}/cover`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      }),
    onSuccess: (_result, input) => refresh(input.id),
  })
  return { create, update, publish, cancel, uploadCover }
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
