import { useAuth, useUser } from '@clerk/react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LoadingScreen } from './LoadingScreen'
import {
  clearDestination,
  consumeDestination,
  destinationFromLocation,
  readDestination,
  safeDestination,
  signInPathFor,
} from './returnTo'

function isVerificationRoute(pathname: string) {
  return pathname === '/verify-email' || pathname === '/verify-phone'
}

function isSignInOrSignUpRoute(pathname: string) {
  return /^\/(?:sign-in|sign-up)(?:\/|$)/.test(pathname)
}

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const { isLoaded: userLoaded, user } = useUser()
  const location = useLocation()

  if (!isLoaded || (isSignedIn && !userLoaded)) return <LoadingScreen />

  const requested = new URLSearchParams(location.search).get('return_to')
  const destination = requested
    ? safeDestination(requested)
    : isVerificationRoute(location.pathname) ||
        isSignInOrSignUpRoute(location.pathname) ||
        location.pathname === '/auth/complete'
      ? readDestination()
      : destinationFromLocation(location)
  const query = `?return_to=${encodeURIComponent(destination)}`

  if (!isSignedIn) {
    if (isVerificationRoute(location.pathname) || location.pathname === '/auth/complete') {
      return <Navigate to={`/sign-in${query}`} replace />
    }
    return children
  }

  if (!user) return <LoadingScreen />
  const emailVerified = user.primaryEmailAddress?.verification?.status === 'verified'

  if (!emailVerified && location.pathname !== '/verify-email') {
    return <Navigate to={`/verify-email${query}`} replace />
  }
  if (
    emailVerified &&
    (location.pathname === '/verify-email' || isSignInOrSignUpRoute(location.pathname))
  ) {
    return <Navigate to={`/auth/complete${query}`} replace />
  }
  return children
}

export function RequireAuth() {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()
  if (!isLoaded) return <LoadingScreen />
  if (!isSignedIn) return <Navigate to={signInPathFor(location)} replace />
  return <Outlet />
}

export function AuthComplete() {
  const navigate = useNavigate()
  const location = useLocation()
  const completed = useRef(false)

  useEffect(() => {
    if (completed.current) return
    completed.current = true
    const requested = new URLSearchParams(location.search).get('return_to')
    const destination = requested ? safeDestination(requested) : consumeDestination()
    clearDestination()
    navigate(destination, { replace: true })
  }, [location.search, navigate])

  return <LoadingScreen message="Taking you to your destination..." />
}
