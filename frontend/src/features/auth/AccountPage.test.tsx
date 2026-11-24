import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AccountPage } from './AccountPage'
import { rememberDestination } from './returnTo'

const clerkState = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock('@clerk/react', () => ({
  useUser: () => ({ user: { firstName: 'Ada' } }),
  useClerk: () => ({ signOut: clerkState.signOut }),
}))

describe('account session controls', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clerkState.signOut.mockReset()
  })
  afterEach(cleanup)

  it('logs out through Clerk and clears a pending destination', async () => {
    clerkState.signOut.mockResolvedValue(undefined)
    rememberDestination('/account?eventId=evt_42')
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(clerkState.signOut).toHaveBeenCalledWith({ redirectUrl: '/' }))
    expect(sessionStorage.length).toBe(0)
  })

  it('offers optional phone verification when no phone is present', () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Phone not added (optional)')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Add a phone number' }).getAttribute('href')).toBe(
      '/verify-phone',
    )
  })

  it('shows a recoverable error when Clerk sign-out fails', async () => {
    clerkState.signOut.mockRejectedValue(new Error('Offline'))
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Could not sign out'),
    )
    expect((screen.getByRole('button', { name: 'Sign out' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })
})
