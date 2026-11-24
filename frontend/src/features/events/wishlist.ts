import { useAuth } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePrivateApi, usePrivateApiPage } from '../../lib/api'
import type { PublicEvent } from './api'

export type WishlistEntry = {
  _id: string
  eventId: (PublicEvent & { status?: string }) | null
}

export const wishlistKeys = { all: ['wishlist'] as const }

export function useWishlist() {
  const { isSignedIn } = useAuth()
  const api = usePrivateApi()
  const apiPage = usePrivateApiPage()
  const cache = useQueryClient()
  const list = useQuery({
    queryKey: wishlistKeys.all,
    queryFn: ({ signal }) => apiPage<WishlistEntry>('/api/wishlist?limit=100', signal),
    enabled: Boolean(isSignedIn),
    staleTime: 15_000,
  })
  const ids = (list.data?.data ?? [])
    .map((item) => item.eventId?._id)
    .filter((id): id is string => Boolean(id))
  const change = useMutation({
    mutationFn: async ({ id, saved }: { id: string; saved: boolean }) => {
      if (saved) await api<void>(`/api/wishlist/${id}`, { method: 'DELETE' })
      else await api<{ saved: true }>(`/api/wishlist/${id}`, { method: 'PUT' })
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: wishlistKeys.all }),
  })
  return {
    ...list,
    ids,
    toggle: (id: string) => change.mutateAsync({ id, saved: ids.includes(id) }),
    isChanging: change.isPending,
  }
}
