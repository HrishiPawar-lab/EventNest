const STORAGE_KEY = 'eventnest.auth.returnTo'
const DEFAULT_DESTINATION = '/account'
const authRoute = /^\/(?:sign-in|sign-up|verify-email|verify-phone|auth\/complete)(?:\/|$)/

type DestinationLocation = {
  pathname: string
  search?: string
  hash?: string
  state?: { ticketSelection?: { eventId?: unknown; quantity?: unknown } } | null
}

function currentOrigin() {
  return globalThis.location?.origin || 'http://localhost'
}

export function safeDestination(value: unknown, origin = currentOrigin()) {
  if (typeof value !== 'string' || !value.startsWith('/') || /^\/[\\/]/.test(value)) {
    return DEFAULT_DESTINATION
  }
  try {
    const url = new URL(value, origin)
    if (url.origin !== origin || authRoute.test(url.pathname)) return DEFAULT_DESTINATION
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_DESTINATION
  }
}

export function destinationFromLocation(location: DestinationLocation) {
  const url = new URL(
    `${location.pathname || '/'}${location.search || ''}${location.hash || ''}`,
    currentOrigin(),
  )
  const selection = location.state?.ticketSelection
  if (typeof selection?.eventId === 'string' && selection.eventId.trim()) {
    url.searchParams.set('eventId', selection.eventId.trim())
  }
  if (
    typeof selection?.quantity === 'number' &&
    Number.isSafeInteger(selection.quantity) &&
    selection.quantity > 0
  ) {
    url.searchParams.set('quantity', String(selection.quantity))
  }
  return safeDestination(`${url.pathname}${url.search}${url.hash}`)
}

export function rememberDestination(
  destination: string,
  storage: Storage = globalThis.sessionStorage,
) {
  const safe = safeDestination(destination)
  storage?.setItem(STORAGE_KEY, safe)
  return safe
}

export function readDestination(storage: Storage = globalThis.sessionStorage) {
  return safeDestination(storage?.getItem(STORAGE_KEY))
}

export function consumeDestination(storage: Storage = globalThis.sessionStorage) {
  const destination = readDestination(storage)
  storage?.removeItem(STORAGE_KEY)
  return destination
}

export function clearDestination(storage: Storage = globalThis.sessionStorage) {
  storage?.removeItem(STORAGE_KEY)
}

export function signInPathFor(location: DestinationLocation) {
  const destination = destinationFromLocation(location)
  return `/sign-in?return_to=${encodeURIComponent(destination)}`
}
