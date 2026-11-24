import { LuArrowRight, LuCalendarDays, LuTicket, LuUsers } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { eventDate, sampleEvents } from '../events/catalog'
import { OrganizerHeading, OrganizerShell } from './OrganizerShell'

const stats = [
  { label: 'Tickets sold', value: '1,240', icon: LuTicket },
  { label: 'Events hosted', value: '12', icon: LuCalendarDays },
  { label: 'Total attendees', value: '8.4k', icon: LuUsers },
]
const bars = [34, 44, 51, 47, 62, 58, 72, 67, 84, 76, 93, 88]

export function OrganizerDashboardPage() {
  return (
    <OrganizerShell>
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <OrganizerHeading
          eyebrow="Workspace overview"
          title="Organizer dashboard"
          description="A look at how your events and audience will come together."
          action={
            <Button asChild>
              <Link to="/organizer/preview/events/new">
                Plan an event <LuArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-start justify-between rounded-xl border border-stone-200 bg-white p-5"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-lg bg-orange-50 text-brand">
                <Icon aria-hidden="true" className="size-5" />
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Event performance</h2>
                <p className="text-sm text-stone-500">
                  Illustrative ticket activity over 12 months
                </p>
              </div>
              <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-brand-dark">
                Preview
              </span>
            </div>
            <div
              role="img"
              aria-label="Illustrative bar chart showing ticket activity increasing over twelve months"
              className="mt-8 flex h-48 items-end gap-2 border-b border-stone-200 sm:gap-3"
            >
              {bars.map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-sm bg-brand/80"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-stone-500">
              <span>Jan</span>
              <span>Jun</span>
              <span>Dec</span>
            </div>
          </section>
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Upcoming in your workspace</h2>
            <p className="mt-1 text-sm text-stone-500">Example events for layout preview</p>
            <div className="mt-5 divide-y divide-stone-100">
              {sampleEvents.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  to={`/organizer/preview/events/${event.id}`}
                  className="flex items-center gap-3 py-3 first:pt-0 hover:bg-stone-50"
                >
                  <img src={event.image} alt="" className="size-14 rounded-md object-cover" />
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-medium">{event.title}</strong>
                    <span className="text-xs text-stone-500">{eventDate(event.date)}</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link
              to="/organizer/preview/events"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand"
            >
              View all events <LuArrowRight aria-hidden="true" />
            </Link>
          </section>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ink p-6 text-white">
          <div>
            <h2 className="text-xl font-semibold">Set the stage for something great.</h2>
            <p className="mt-1 text-sm text-white/70">
              Start with a venue, then shape your event around it.
            </p>
          </div>
          <Button asChild>
            <Link to="/organizer/preview/venues/new">
              Preview venue form <LuArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </main>
    </OrganizerShell>
  )
}
