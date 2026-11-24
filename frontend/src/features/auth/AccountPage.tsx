import { useClerk, useUser } from '@clerk/react'
import { useState } from 'react'
import { LuLogOut, LuMailCheck, LuPhoneCall } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { clearDestination } from './returnTo'

export function AccountPage() {
  const { user } = useUser()
  const phoneVerified = user?.primaryPhoneNumber?.verification?.status === 'verified'
  const { signOut } = useClerk()
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setError('')
    setSigningOut(true)
    try {
      clearDestination()
      await signOut({ redirectUrl: '/' })
    } catch {
      setError('Could not sign out. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <main className="min-h-screen bg-sky-50 px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          ← Discover events
        </Link>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your EventNest account</CardTitle>
            <CardDescription>
              Welcome back, {user?.firstName || user?.primaryEmailAddress?.emailAddress || 'friend'}
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="rounded-2xl bg-sky-50 p-4 text-sm text-slate-600">
              Your event and ticket history will appear here as those features are added.
            </p>
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <LuMailCheck aria-hidden="true" className="text-amber-600" /> Email verified
              </p>
              <p className="flex items-center gap-2">
                <LuPhoneCall aria-hidden="true" className="text-amber-600" />{' '}
                {phoneVerified ? 'Phone verified' : 'Phone not added (optional)'}
              </p>
            </div>
            {!phoneVerified && (
              <Button asChild variant="outline">
                <Link to="/verify-phone">Add a phone number</Link>
              </Button>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
              <LuLogOut aria-hidden="true" /> {signingOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
