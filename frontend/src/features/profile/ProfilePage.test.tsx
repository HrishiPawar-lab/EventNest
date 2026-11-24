import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProfilePage } from './ProfilePage'
import { rememberDestination } from '../auth/returnTo'

const clerkState = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock('@clerk/react', () => ({
  useUser: () => ({ user: { id: 'user-ada', firstName: 'Ada' } }),
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: async () => 'test-token' }),
  useClerk: () => ({ signOut: clerkState.signOut }),
}))

function renderProfile() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('account session controls', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clerkState.signOut.mockReset()
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }), {
          status: 403,
        }),
      ),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('logs out through Clerk and clears a pending destination', async () => {
    clerkState.signOut.mockResolvedValue(undefined)
    rememberDestination('/account?eventId=evt_42')
    renderProfile()
    await userEvent.setup().click(screen.getByLabelText('Account menu'))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(clerkState.signOut).toHaveBeenCalledWith({ redirectUrl: '/' }))
    expect(sessionStorage.length).toBe(0)
  })

  it('offers optional phone verification when no phone is present', () => {
    renderProfile()
    expect(screen.getByText('Phone not added (optional)')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Add a phone number' }).getAttribute('href')).toBe(
      '/verify-phone',
    )
  })

  it('shows a recoverable error when Clerk sign-out fails', async () => {
    clerkState.signOut.mockRejectedValue(new Error('Offline'))
    renderProfile()
    await userEvent.setup().click(screen.getByLabelText('Account menu'))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Could not sign out'),
    )
    expect((screen.getByRole('button', { name: 'Sign out' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })
})
