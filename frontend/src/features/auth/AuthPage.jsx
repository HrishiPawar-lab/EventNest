import { SignIn, SignUp } from '@clerk/react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { clerkAppearance } from './clerkAppearance'
import { rememberDestination, safeDestination } from './returnTo'

export function AuthPage({ mode }) {
  const location = useLocation()
  const requested = new URLSearchParams(location.search).get('return_to')

  useEffect(() => {
    if (requested) rememberDestination(safeDestination(requested))
  }, [requested])

  const clerkProps = {
    appearance: clerkAppearance,
    routing: 'path',
    fallbackRedirectUrl: '/auth/complete',
  }

  return (
    <AuthShell
      eyebrow={mode === 'sign-up' ? 'Your next chapter starts here' : 'Your events are waiting'}
    >
      {mode === 'sign-up' ? (
        <SignUp {...clerkProps} path="/sign-up" signInUrl="/sign-in" />
      ) : (
        <SignIn {...clerkProps} path="/sign-in" signUpUrl="/sign-up" />
      )}
    </AuthShell>
  )
}
