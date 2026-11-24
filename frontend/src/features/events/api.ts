import { useQuery } from '@tanstack/react-query'
import { publicApi, publicApiPage } from '../../lib/api'
import type { Event } from './catalog'

export type PublicEvent = {
  _id: string
  name: string
  description?: string
  category?: string
  venueName: string | null
  organizerName: string | null
  location?: { city?: string; state?: string; country?: string }
  startDate: string
  endDate: string
  ticketPrice: number
  imageUrl?: string
}

export type EventFilters = {
  page?: number
  q?: string
  category?: string
  city?: string
  maxPrice?: number
  sort?: 'date' | 'price'
}

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
})

export function toEvent(raw: PublicEvent): Event {
  return {
    id: raw._id,
    title: raw.name,
    description: raw.description ?? '',
    category: raw.category ?? 'Event',
    city: raw.location?.city ?? '',
    venue: raw.venueName ?? 'Venue to be announced',
    organizer: raw.organizerName ?? 'Event organizer',
    date: raw.startDate,
    time: timeFormatter.format(new Date(raw.startDate)),
    price: raw.ticketPrice,
    image: raw.imageUrl,
    highlights: [],
  }
}

export const eventKeys = {
  all: ['events'] as const,
  list: (filters: EventFilters) => ['events', 'list', filters] as const,
  detail: (id: string) => ['events', 'detail', id] as const,
}

export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ page: String(filters.page ?? 1), limit: '20' })
      if (filters.q) params.set('q', filters.q)
      if (filters.category) params.set('category', filters.category)
      if (filters.city) params.set('city', filters.city)
      if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice))
      if (filters.sort === 'price') params.set('sort', 'price')
      const page = await publicApiPage<PublicEvent>(`/api/events?${params}`, signal)
      return { ...page, data: page.data.map(toEvent) }
    },
    staleTime: 60_000,
  })
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ''),
    queryFn: async ({ signal }) =>
      toEvent(await publicApi<PublicEvent>(`/api/events/${id}`, { signal })),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}
