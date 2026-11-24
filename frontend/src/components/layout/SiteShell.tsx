import { useAuth, useClerk, useUser } from '@clerk/react'
import { useState, type ReactNode } from 'react'
import {
  LuArrowRight,
  LuCalendarDays,
  LuHeart,
  LuMenu,
  LuTicket,
  LuUserRound,
} from 'react-icons/lu'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { clearDestination } from '../../features/auth/returnTo'

const links = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/tickets', label: 'My Tickets' },
]

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 text-lg font-black tracking-tight ${light ? 'text-white' : 'text-ink'}`}
    >
      <span
        aria-hidden="true"
        className="flex size-8 rotate-[-13deg] items-center justify-center rounded-md bg-brand text-lg font-black text-white"
      >
        N
      </span>
      EventNest
    </Link>
  )
}

export function PreviewNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="border-b border-orange-200 bg-orange-50 px-4 py-2 text-center text-xs font-medium text-stone-700">
      {children ||
        'Explore a preview of EventNest. Event listings, bookings, and organizer metrics shown here are examples.'}
    </p>
  )
}

export function SiteShell({
  children,
  preview = true,
}: {
  children: ReactNode
  preview?: boolean
}) {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  async function leave() {
    try {
      clearDestination()
      await signOut({ redirectUrl: '/' })
    } catch {
      setSignOutError('Could not sign out. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {preview && <PreviewNotice />}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `border-b-2 px-4 py-6 text-sm font-semibold transition-colors ${isActive ? 'border-brand text-ink' : 'border-transparent text-stone-600 hover:text-ink'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {isLoaded && isSignedIn ? (
              <details className="group relative">
                <summary
                  aria-label="Account menu"
                  className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-1.5 text-sm font-semibold hover:border-stone-400"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-ink text-white">
                    {user?.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt=""
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <LuUserRound aria-hidden="true" />
                    )}
                  </span>
                  <span className="max-w-28 truncate">{user?.firstName || 'My account'}</span>
                </summary>
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
                  <MenuLink to="/profile" icon={<LuUserRound />} label="My profile" />
                  <MenuLink to="/tickets" icon={<LuTicket />} label="My tickets" />
                  <MenuLink to="/wishlist" icon={<LuHeart />} label="Wishlist" />
                  <MenuLink
                    to="/become-organizer"
                    icon={<LuCalendarDays />}
                    label="Become an organizer"
                  />
                  <button
                    onClick={leave}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
                  >
                    Sign out
                  </button>
                  {signOutError && (
                    <p role="alert" className="px-3 pb-1 text-xs text-red-700">
                      {signOutError}
                    </p>
                  )}
                </div>
              </details>
            ) : (
              <>
                <Link
                  to={`/sign-in?return_to=${encodeURIComponent(location.pathname + location.search)}`}
                  className="text-sm font-semibold"
                >
                  Sign in
                </Link>
                <Button asChild size="sm">
                  <Link to="/sign-up">
                    Join EventNest <LuArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </>
            )}
          </div>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg border border-stone-200 p-2 md:hidden"
          >
            <LuMenu aria-hidden="true" className="size-5" />
          </button>
        </div>
        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-stone-200 bg-white p-3 md:hidden"
          >
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-stone-100"
              >
                {label}
              </Link>
            ))}
            <Link
              to={isSignedIn ? '/profile' : '/sign-in'}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-stone-100"
            >
              {isSignedIn ? 'My profile' : 'Sign in'}
            </Link>
            <Link
              to="/become-organizer"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-stone-100"
            >
              Become an organizer
            </Link>
          </nav>
        )}
      </header>
      {children}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:px-6 lg:px-8">
          <Brand />
          <p>Good things happen together. © {new Date().getFullYear()} EventNest.</p>
        </div>
      </footer>
    </div>
  )
}

function MenuLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
    >
      <span aria-hidden="true" className="text-brand">
        {icon}
      </span>
      {label}
    </Link>
  )
}
