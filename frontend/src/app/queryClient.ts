import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, error) =>
        !(
          error instanceof Error &&
          'status' in error &&
          [400, 401, 403, 404, 409, 422].includes(Number(error.status))
        ) && count < 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
})
