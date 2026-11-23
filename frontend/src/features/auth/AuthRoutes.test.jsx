import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthComplete, OnboardingGate, RequireAuth } from './AuthRoutes'
import { rememberDestination } from './returnTo'

const clerkState = vi.hoisted(() => ({
  auth: { isLoaded: true, isSignedIn: false },
  user: { isLoaded: true, user: null },
}))

vi.mock('@clerk/react', () => ({
  useAuth: () => clerkState.auth,
  useUser: () => clerkState.user,
}))

function LocationDisplay({ label }) {
  const location = useLocation()
  return (
    <p>
      {label}: {location.pathname}
      {location.search}
    </p>
  )
}

function renderAuthRoutes(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <OnboardingGate>
        <Routes>
          <Route path="/" element={<LocationDisplay label="Public" />} />
          <Route path="/sign-in" element={<LocationDisplay label="Sign in" />} />
          <Route path="/verify-email" element={<LocationDisplay label="Verify email" />} />
          <Route path="/verify-phone" element={<LocationDisplay label="Verify phone" />} />
          <Route element={<RequireAuth />}>
            <Route path="/account" element={<LocationDisplay label="Account" />} />
            <Route path="/auth/complete" element={<AuthComplete />} />
          </Route>
        </Routes>
      </OnboardingGate>
    </MemoryRouter>,
  )
}

describe('authentication routing', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clerkState.auth = { isLoaded: true, isSignedIn: false }
    clerkState.user = { isLoaded: true, user: null }
  })
  afterEach(cleanup)

  it('keeps public discovery available to guests', () => {
    renderAuthRoutes('/')
    expect(screen.getByText('Public: /')).toBeTruthy()
  })

  it('redirects a guest to sign-in with event ID and quantity preserved', async () => {
    renderAuthRoutes({
      pathname: '/account',
      search: '?tab=tickets',
      state: { ticketSelection: { eventId: 'evt_42', quantity: 3 } },
    })
    await waitFor(() => expect(screen.getByText(/Sign in: \/sign-in/)).toBeTruthy())
    const text = screen.getByText(/Sign in: \/sign-in/).textContent
    const query = new URLSearchParams(text.split('?')[1])
    expect(query.get('return_to')).toBe('/account?tab=tickets&eventId=evt_42&quantity=3')
  })

  it('waits for Clerk session loading before showing protected content', () => {
    clerkState.auth = { isLoaded: false, isSignedIn: undefined }
    renderAuthRoutes('/account')
    expect(screen.getByRole('status').textContent).toContain('Loading')
    expect(screen.queryByText('Account: /account')).toBeNull()
  })

  it('gates signed-in accounts behind email and phone verification', async () => {
    clerkState.auth = { isLoaded: true, isSignedIn: true }
    clerkState.user = {
      isLoaded: true,
      user: {
        primaryEmailAddress: { verification: { status: 'unverified' } },
        primaryPhoneNumber: { verification: { status: 'unverified' } },
      },
    }
    renderAuthRoutes('/account?eventId=evt_42&quantity=3')
    await waitFor(() => expect(screen.getByText(/Verify email: \/verify-email/)).toBeTruthy())
    expect(screen.queryByText(/Account:/)).toBeNull()
  })

  it('redirects phone-unverified users before account content', async () => {
    clerkState.auth = { isLoaded: true, isSignedIn: true }
    clerkState.user = {
      isLoaded: true,
      user: {
        primaryEmailAddress: { verification: { status: 'verified' } },
        primaryPhoneNumber: { verification: { status: 'unverified' } },
      },
    }
    renderAuthRoutes('/account?eventId=evt_42&quantity=3')
    await waitFor(() => expect(screen.getByText(/Verify phone: \/verify-phone/)).toBeTruthy())
    expect(screen.queryByText(/Account:/)).toBeNull()
  })

  it('restores a saved destination after a verified session completes', async () => {
    clerkState.auth = { isLoaded: true, isSignedIn: true }
    clerkState.user = {
      isLoaded: true,
      user: {
        primaryEmailAddress: { verification: { status: 'verified' } },
        primaryPhoneNumber: { verification: { status: 'verified' } },
      },
    }
    rememberDestination('/account?eventId=evt_42&quantity=3')
    renderAuthRoutes('/auth/complete')
    await waitFor(() =>
      expect(screen.getByText('Account: /account?eventId=evt_42&quantity=3')).toBeTruthy(),
    )
    expect(sessionStorage.length).toBe(0)
  })
})
