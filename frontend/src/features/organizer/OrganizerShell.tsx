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

export function OrganizerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      <aside className="bg-ink text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-7">
          <Brand light />
          <Link to="/" className="text-xs text-white/65 hover:text-white lg:hidden">
            Attendee view
          </Link>
        </div>
        <nav
          aria-label="Organizer navigation"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-4"
        >
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-brand text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon aria-hidden="true" className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-6 pb-6 pt-4 lg:mt-auto lg:block">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <LuArrowLeft aria-hidden="true" /> Back to attendee view
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-orange-200 bg-orange-50 px-5 py-2 text-xs font-medium text-stone-700">
          Organizer workspace preview · sample data only · no changes are saved
        </div>
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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-stone-600">{description}</p>
      </div>
      {action}
    </div>
  )
}
