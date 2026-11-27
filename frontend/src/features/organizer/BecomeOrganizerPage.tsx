import { LuArrowRight, LuCalendarDays, LuMapPin, LuShieldAlert, LuUsers } from 'react-icons/lu'
import { Link, useNavigate } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { useActivateOrganizer, useOrganizerAccess } from './api'

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
  const activate = useActivateOrganizer()
  const access = useOrganizerAccess()
  const navigate = useNavigate()

  async function start() {
    try {
      await activate.mutateAsync()
      navigate('/organizer/venues/new')
    } catch {
      // The mutation error is shown below so the user can retry.
    }
  }
  return (
    <SiteShell>
      <main>
        <section className="bg-ink px-4 py-10 text-white sm:px-6 lg:py-14">
          <div className="mx-auto grid max-w-[1280px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-orange-200">
                For the people who bring us together
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                Make your next event happen.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/75">
                One account can be both an attendee and an organizer. Build a place, plan an
                experience and welcome your crowd.
              </p>
              {access.isSuccess ? (
                <Button asChild className="mt-7">
                  <Link to="/organizer/venues/new">
                    Create a venue <LuArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="mt-7"
                  disabled={activate.isPending || access.isPending}
                  onClick={() => void start()}
                >
                  {activate.isPending ? 'Setting up...' : 'Become an organizer'}{' '}
                  <LuArrowRight aria-hidden="true" />
                </Button>
              )}
              {activate.isError && (
                <p role="alert" className="mt-3 text-sm text-red-200">
                  {activate.error.message}
                </p>
              )}
            </div>
            <img
              src="/images/stage.jpg"
              alt="Musician performing in front of a live audience"
              className="aspect-[1.8] w-full rounded-xl object-cover"
            />
          </div>
        </section>
        <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold">From idea to open doors</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map(({ title, text, icon: Icon }, index) => (
              <div key={title} className="rounded-xl border border-stone-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <Icon aria-hidden="true" className="size-7 text-brand" />
                  <span className="text-xs font-medium text-stone-400">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-[1280px] px-4 pb-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start gap-4 rounded-xl border border-orange-200 bg-orange-50 p-6">
            <LuShieldAlert aria-hidden="true" className="size-6 text-brand" />
            <div className="flex-1">
              <h2 className="font-semibold">One account for both experiences</h2>
              <p className="mt-1 text-sm leading-6 text-stone-700">
                Your attendee account stays the same. Organizer access lets you create venues and
                events when you are ready.
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
        <h1 className="mt-5 text-3xl font-semibold">Organizer access required</h1>
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
