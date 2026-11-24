import { useUser } from '@clerk/react'
import { useSyncExternalStore } from 'react'

const keyPrefix = 'eventnest.preview.wishlist.'
const eventName = 'eventnest:wishlist-change'
const empty: string[] = []
const snapshots = new Map<string, string[]>()

function read(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]') as unknown
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function getSnapshot(key: string) {
  const next = read(key)
  const current = snapshots.get(key)
  if (!current || next.join('|') !== current.join('|')) snapshots.set(key, next)
  return snapshots.get(key) || empty
}

function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(eventName, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useWishlist() {
  const { user } = useUser()
  const key = user ? `${keyPrefix}${user.id}` : ''
  const ids = useSyncExternalStore(
    subscribe,
    () => (key ? getSnapshot(key) : empty),
    () => empty,
  )
  function toggle(id: string) {
    if (!key) return false
    const next = ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]
    try {
      localStorage.setItem(key, JSON.stringify(next))
      window.dispatchEvent(new Event(eventName))
      return true
    } catch {
      return false
    }
  }
  return { ids, toggle }
}
