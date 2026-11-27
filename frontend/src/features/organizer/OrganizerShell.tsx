import {
  LuArrowLeft,
  LuChartBar,
  LuCalendarDays,
  LuChartNoAxesCombined,
  LuMapPin,
  LuScanLine,
  LuUsers,
} from 'react-icons/lu'
import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Brand } from '../../components/layout/SiteShell'

const navigation = [
  { to: '/organizer/preview', label: 'Overview', icon: LuChartNoAxesCombined, end: true },
  { to: '/organizer/preview/events', label: 'My events', icon: LuCalendarDays },
  { to: '/organizer/preview/venues', label: 'Venues', icon: LuMapPin },
  { to: '/organizer/preview/attendees', label: 'Attendees', icon: LuUsers },
  { to: '/organizer/preview/check-in', label: 'Check-in', icon: LuScanLine },
  { to: '/organizer/preview/analytics', label: 'Analytics', icon: LuChartBar },
]

export function OrganizerShell({
  children,
  preview = true,
}: {
  children: ReactNode
  preview?: boolean
}) {
  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      <aside className="bg-ink text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-56 lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between px-5 py-4 lg:px-5 lg:py-6">
          <Brand light />
          <Link to="/" className="text-xs text-white/65 hover:text-white lg:hidden">
            Attendee view
          </Link>
        </div>
        <nav
          aria-label="Organizer navigation"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3"
        >
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={
                !preview && label === 'My events'
                  ? '/organizer/events'
                  : !preview && label === 'Venues'
                    ? '/organizer/venues'
                    : to
              }
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon aria-hidden="true" className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-5 pb-6 pt-4 lg:mt-auto lg:block">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <LuArrowLeft aria-hidden="true" /> Back to attendee view
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {preview && (
          <div className="border-b border-orange-100 bg-orange-50 px-5 py-1.5 text-[11px] font-normal text-stone-600">
            Organizer workspace preview · sample data only · no changes are saved
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function OrganizerHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-stone-600">{description}</p>
      </div>
      {action}
    </div>
  )
}
