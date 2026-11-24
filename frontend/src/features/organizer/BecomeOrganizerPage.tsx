import { LuArrowRight, LuCalendarDays, LuMapPin, LuShieldAlert, LuUsers } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'

const steps = [
  {
    title: 'Create a venue',
    text: 'Set up the place where your guests will gather.',
    icon: LuMapPin,
  },
  {
    title: 'Plan an event',
    text: 'Share the details, date and one general-admission price.',
    icon: LuCalendarDays,
  },
  {
    title: 'Welcome guests',
    text: 'Manage bookings and check people in when the doors open.',
    icon: LuUsers,
  },
]

export function BecomeOrganizerPage() {
  return (
    <SiteShell>
      <main>
        <section className="bg-ink px-4 py-16 text-white sm:px-6 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-200">
              For the people who bring us together
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight sm:text-6xl">
              Make your next event happen.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-white/75">
              One account can be both an attendee and an organizer. Build a place, plan an
              experience and welcome your crowd.
            </p>
            <Button asChild className="mt-8">
              <Link to="/organizer/preview">
                Explore organizer workspace <LuArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">How it works</p>
          <h2 className="mt-2 text-3xl font-black">From idea to open doors</h2>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {steps.map(({ title, text, icon: Icon }, index) => (
              <div key={title} className="rounded-xl border border-stone-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <Icon aria-hidden="true" className="size-7 text-brand" />
                  <span className="text-xs font-bold text-stone-400">0{index + 1}</span>
                </div>
                <h3 className="mt-7 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <div className="flex flex-wrap items-start gap-4 rounded-xl border border-orange-200 bg-orange-50 p-6">
            <LuShieldAlert aria-hidden="true" className="size-6 text-brand" />
            <div className="flex-1">
              <h2 className="font-bold">Organizer access is not available yet</h2>
              <p className="mt-1 text-sm leading-6 text-stone-700">
                The current backend has no endpoint to grant organizer permissions or create venues
                and events. You can explore the preview workspace; no records will be changed.
              </p>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  )
}

export function OrganizerAccessDeniedPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <LuShieldAlert aria-hidden="true" className="mx-auto size-10 text-brand" />
        <h1 className="mt-5 text-3xl font-black">Organizer access required</h1>
        <p className="mt-3 text-stone-600">
          This action is available to accounts with organizer permissions. You can still explore the
          sample workspace.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/become-organizer">Become an organizer</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/organizer/preview">View workspace preview</Link>
          </Button>
        </div>
      </main>
    </SiteShell>
  )
}
