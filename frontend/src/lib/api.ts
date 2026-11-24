import { useCallback } from 'react'
import { useAuthenticatedApi } from '../features/auth/api'

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

function targetUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) throw new Error('VITE_API_BASE_URL is not configured')
  if (!path.startsWith('/') || /^\/[\\/]/.test(path)) throw new Error('Invalid API path')
  const base = new URL(baseUrl)
  const target = new URL(path, base)
  if (target.origin !== base.origin) throw new Error('Invalid API origin')
  return target.toString()
}

export type ApiPage<T> = {
  data: T[]
  pagination: { page: number; limit: number; total: number }
}

export async function responseEnvelope<T>(
  response: Response,
): Promise<{ data: T; pagination?: ApiPage<never>['pagination'] }> {
  if (response.status === 204) return { data: undefined as T }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? body.error : null
    const code =
      error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'REQUEST_FAILED'
    const message =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Request failed. Please try again.'
    throw new ApiRequestError(response.status, code, message)
  }
  if (!body || typeof body !== 'object' || !('data' in body))
    throw new Error('Unexpected API response')
  return body as { data: T; pagination?: ApiPage<never>['pagination'] }
}

export async function responseData<T>(response: Response): Promise<T> {
  return (await responseEnvelope<T>(response)).data
}

export async function publicApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(targetUrl(path), options)
  return responseData<T>(response)
}

export async function publicApiPage<T>(path: string, signal?: AbortSignal): Promise<ApiPage<T>> {
  const result = await responseEnvelope<T[]>(await fetch(targetUrl(path), { signal }))
  if (!result.pagination) throw new Error('Missing API pagination')
  return { data: result.data, pagination: result.pagination }
}

export function usePrivateApi() {
  const request = useAuthenticatedApi()
  return useCallback(
    async <T>(path: string, options?: RequestInit): Promise<T> =>
      responseData<T>(await request(path, options)),
    [request],
  )
}

export function usePrivateApiPage() {
  const request = useAuthenticatedApi()
  return useCallback(
    async <T>(path: string, signal?: AbortSignal): Promise<ApiPage<T>> => {
      const result = await responseEnvelope<T[]>(await request(path, { signal }))
      if (!result.pagination) throw new Error('Missing API pagination')
      return { data: result.data, pagination: result.pagination }
    },
    [request],
  )
}

export function jsonBody(body: object): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
