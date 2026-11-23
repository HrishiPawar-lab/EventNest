import { useAuth } from '@clerk/react'
import { useCallback } from 'react'

export async function authenticatedRequest(
  path,
  { getToken, fetcher = fetch, baseUrl, ...options },
) {
  if (typeof path !== 'string' || !path.startsWith('/') || /^\/[\\/]/.test(path)) {
    throw new Error('API path must be a relative path beginning with /')
  }
  if (!baseUrl) throw new Error('VITE_API_BASE_URL is not configured')

  const base = new URL(baseUrl)
  const target = new URL(path, base)
  if (target.origin !== base.origin) throw new Error('API path must stay on the configured origin')

  const token = await getToken()
  if (!token) throw new Error('An active Clerk session is required')

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  return fetcher(target.toString(), { ...options, headers })
}

export function useAuthenticatedApi() {
  const { getToken } = useAuth()
  return useCallback(
    (path, options = {}) =>
      authenticatedRequest(path, {
        ...options,
        getToken,
        baseUrl: import.meta.env.VITE_API_BASE_URL,
      }),
    [getToken],
  )
}
