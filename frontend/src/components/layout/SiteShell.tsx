import { useAuth, useClerk, useUser } from '@clerk/react'
import { useState, type ReactNode } from 'react'
import {
  LuArrowRight,
  LuCalendarDays,
  LuChevronDown,
  LuCompass,
  LuHeart,
  LuHouse,
  LuLogOut,
  LuMenu,
  LuSearch,
  LuTicket,
  LuUserRound,
} from 'react-icons/lu'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { clearDestination } from '../../features/auth/returnTo'
import { useOrganizerAccess } from '../../features/organizer/api'
import { ApiRequestError } from '../../lib/api'

const links = [
  { to: '/', label: 'Home', icon: LuHouse },
  { to: '/explore', label: 'Explore', icon: LuCompass },
  { to: '/wishlist', label: 'Wishlist', icon: LuHeart },
  { to: '/tickets', label: 'My Tickets', icon: LuTicket },
]

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}
    >
      <span
        aria-hidden="true"
        className="flex size-8 rotate-[-13deg] items-center justify-center rounded-md bg-brand text-lg font-bold text-white"
      >
        N
      </span>
      EventNest
    </Link>
  )
}

export function PreviewNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="border-b border-orange-100 bg-orange-50 px-4 py-1.5 text-center text-[11px] font-normal text-stone-600">
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
  const [accountOpen, setAccountOpen] = useState(false)
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
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-orange-50 text-brand-dark' : 'text-stone-600 hover:bg-stone-50 hover:text-ink'}`
                }
              >
                <Icon aria-hidden="true" className="size-4" /> {label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/search"
            className="hidden items-center gap-2 rounded-lg border border-stone-200 bg-paper px-3 py-2 text-sm font-normal text-stone-500 hover:border-stone-300 hover:text-ink xl:inline-flex"
          >
            <LuSearch aria-hidden="true" className="size-4" /> Search events
          </Link>
          <div className="hidden items-center gap-3 lg:flex">
            {isLoaded && isSignedIn ? (
              <details
                className="group relative"
                onToggle={(event) => setAccountOpen(event.currentTarget.open)}
              >
                <summary
                  aria-label="Account menu"
                  className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-1.5 text-sm font-medium hover:border-stone-400"
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
                  <LuChevronDown aria-hidden="true" className="mr-1 size-3.5 text-stone-500" />
                </summary>
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
                  <MenuLink to="/profile" icon={<LuUserRound />} label="My profile" />
                  <MenuLink to="/tickets" icon={<LuTicket />} label="My tickets" />
                  <MenuLink to="/wishlist" icon={<LuHeart />} label="Wishlist" />
                  {accountOpen && <OrganizerMenuLink />}
                  <button
                    onClick={leave}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
                  >
                    <LuLogOut aria-hidden="true" className="text-brand" /> Sign out
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
                  className="text-sm font-medium"
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
            className="rounded-lg border border-stone-200 p-2 lg:hidden"
          >
            <LuMenu aria-hidden="true" className="size-5" />
          </button>
        </div>
        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-stone-200 bg-white p-3 lg:hidden"
          >
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium hover:bg-stone-100"
              >
                <Icon aria-hidden="true" className="size-4 text-brand" /> {label}
              </Link>
            ))}
            <Link
              to="/search"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-stone-100"
            >
              <LuSearch aria-hidden="true" className="size-4 text-brand" /> Search events
            </Link>
            <Link
              to={isSignedIn ? '/profile' : '/sign-in'}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium hover:bg-stone-100"
            >
              <LuUserRound aria-hidden="true" className="size-4 text-brand" />
              {isSignedIn ? 'My profile' : 'Sign in'}
            </Link>
            {isSignedIn && <OrganizerMenuLink mobile onSelect={() => setMobileOpen(false)} />}
          </nav>
        )}
      </header>
      {children}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 px-4 py-7 text-sm text-stone-500 sm:flex-row sm:px-6 lg:px-8">
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

function OrganizerMenuLink({
  mobile = false,
  onSelect,
}: {
  mobile?: boolean
  onSelect?: () => void
}) {
  const access = useOrganizerAccess()
  const className = mobile
    ? 'flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium hover:bg-stone-100'
    : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100'

  if (access.isPending)
    return (
      <span role="status" className={className}>
        Checking organizer access...
      </span>
    )
  if (access.isError && !(access.error instanceof ApiRequestError && access.error.status === 403)) {
    return (
      <button type="button" className={className} onClick={() => void access.refetch()}>
        Retry organizer access
      </button>
    )
  }
  const isOrganizer = access.isSuccess
  return (
    <Link
      to={isOrganizer ? '/organizer/events' : '/become-organizer'}
      onClick={onSelect}
      className={className}
    >
      <LuCalendarDays aria-hidden="true" className="size-4 text-brand" />{' '}
      {isOrganizer ? 'Manage events' : 'Become an organizer'}
    </Link>
  )
}
