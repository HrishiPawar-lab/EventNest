import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthPage } from './AuthPage'

const clerkComponents = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }))
vi.mock('@clerk/react', () => ({
  SignIn: (props: unknown) => {
    clerkComponents.signIn(props)
    return <div>Clerk sign-in form</div>
  },
  SignUp: (props: unknown) => {
    clerkComponents.signUp(props)
    return <div>Clerk sign-up form</div>
  },
}))

describe('Clerk authentication screens', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clerkComponents.signIn.mockClear()
    clerkComponents.signUp.mockClear()
  })
  afterEach(cleanup)

  it('renders Clerk sign-in with a safe destination and its configured social/password flow', async () => {
    render(
      <MemoryRouter initialEntries={['/sign-in?return_to=%2Faccount%3Fquantity%3D2']}>
        <AuthPage mode="sign-in" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Clerk sign-in form')).toBeTruthy()
    expect(clerkComponents.signIn.mock.lastCall?.[0]).toMatchObject({
      routing: 'path',
      path: '/sign-in',
      fallbackRedirectUrl: '/auth/complete',
      signUpUrl: '/sign-up',
    })
    await waitFor(() =>
      expect(sessionStorage.getItem('eventnest.auth.returnTo')).toBe('/account?quantity=2'),
    )
  })

  it('renders Clerk sign-up and rejects an external requested destination', async () => {
    render(
      <MemoryRouter initialEntries={['/sign-up?return_to=https%3A%2F%2Fevil.example']}>
        <AuthPage mode="sign-up" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Clerk sign-up form')).toBeTruthy()
    expect(clerkComponents.signUp.mock.lastCall?.[0]).toMatchObject({
      routing: 'path',
      path: '/sign-up',
      fallbackRedirectUrl: '/auth/complete',
      signInUrl: '/sign-in',
    })
    await waitFor(() => expect(sessionStorage.getItem('eventnest.auth.returnTo')).toBe('/account'))
  })
})
