import { useUser } from '@clerk/react'
import {
  LuArrowRight,
  LuHeart,
  LuMailCheck,
  LuPhoneCall,
  LuSettings2,
  LuTicket,
  LuUserRound,
} from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'

const shortcuts = [
  {
    to: '/tickets',
    label: 'My tickets',
    description: 'Your confirmed experiences',
    icon: LuTicket,
  },
  { to: '/wishlist', label: 'Wishlist', description: 'Events you have saved', icon: LuHeart },
  {
    to: '/settings',
    label: 'Account settings',
    description: 'Personal details and contact',
    icon: LuSettings2,
  },
]

export function ProfilePage() {
  const { user } = useUser()
  const email = user?.primaryEmailAddress?.emailAddress
  const phoneVerified = user?.primaryPhoneNumber?.verification?.status === 'verified'
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Your account</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome, {user?.firstName || 'friend'}
        </h1>
        <p className="mt-3 text-stone-600">Your home for the moments you have saved and shared.</p>
        <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_320px]">
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="size-16 rounded-full object-cover" />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-full bg-ink text-white">
                  <LuUserRound aria-hidden="true" className="size-8" />
                </span>
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {user?.fullName || user?.firstName || 'EventNest member'}
                </h2>
                <p className="text-sm text-stone-500">{email || 'Email unavailable'}</p>
              </div>
            </div>
            <div className="mt-7 grid gap-4 border-t border-stone-100 pt-6 sm:grid-cols-2">
              <p className="flex items-center gap-3 text-sm">
                <LuMailCheck aria-hidden="true" className="text-brand" /> Email verified
              </p>
              <p className="flex items-center gap-3 text-sm">
                <LuPhoneCall aria-hidden="true" className="text-brand" />{' '}
                {phoneVerified ? 'Phone verified' : 'Phone not added (optional)'}
              </p>
            </div>
            {!phoneVerified && (
              <Button asChild variant="outline" size="sm" className="mt-6">
                <Link to="/verify-phone">Add a phone number</Link>
              </Button>
            )}
          </section>
          <aside className="rounded-xl bg-ink p-6 text-white">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-200">
              Bring people together
            </p>
            <h2 className="mt-3 text-2xl font-semibold">Have an event in mind?</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              Explore the organizer workspace and see how venues, events and guests come together.
            </p>
            <Button asChild className="mt-6">
              <Link to="/become-organizer">
                Become an organizer <LuArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </aside>
        </div>
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Quick links</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {shortcuts.map(({ to, label, description, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl border border-stone-200 bg-white p-5 hover:border-brand"
              >
                <Icon aria-hidden="true" className="size-6 text-brand" />
                <h3 className="mt-4 font-semibold group-hover:text-brand">{label}</h3>
                <p className="mt-1 text-sm text-stone-500">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  )
}
