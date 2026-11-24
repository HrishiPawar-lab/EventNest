import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LuArrowRight, LuMapPin, LuSearch, LuSparkles } from 'react-icons/lu'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { categories, type Event } from './catalog'
import { useEvents } from './api'
import { CategoryIcon, EventCard } from './EventCard'

const searchSchema = z.object({ query: z.string().trim().max(100) })
type SearchValues = z.infer<typeof searchSchema>

function EventRail({ events }: { events: Event[] }) {
  return (
    <div className="-mr-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-4 sm:mr-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pr-0 lg:grid-cols-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="w-[72vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none"
        >
          <EventCard event={event} />
        </div>
      ))}
    </div>
  )
}

export function DiscoverPage() {
  const events = useEvents()
  const highlights = events.data?.data.slice(0, 4) ?? []
  const more = events.data?.data.slice(4, 8) ?? []
  const navigate = useNavigate()
  const { register, handleSubmit } = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { query: '' },
  })
  const search = handleSubmit(({ query }) => {
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/explore')
  })

  return (
    <SiteShell>
      <main>
        <section className="relative isolate overflow-hidden bg-ink text-white">
          <img
            src="/images/concert.jpg"
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover opacity-55"
          />
          <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
            <p className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-orange-200">
              <LuSparkles aria-hidden="true" /> Experiences worth showing up for
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Discover unforgettable <span className="text-brand">events.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-6 text-white/85 sm:text-base">
              The best nights, new ideas, great food, and everything in between. Find your next
              moment here.
            </p>
            <form
              onSubmit={search}
              role="search"
              className="mt-7 flex max-w-xl items-center rounded-lg bg-white p-1.5 text-ink focus-within:ring-2 focus-within:ring-brand"
            >
              <LuSearch aria-hidden="true" className="ml-3 size-5 shrink-0 text-stone-500" />
              <input
                {...register('query')}
                aria-label="Search events"
                placeholder="Search events"
                maxLength={100}
                className="min-w-0 flex-1 px-3 py-2 text-[15px] outline-none"
              />
              <Button type="submit" size="sm">
                Search <LuArrowRight aria-hidden="true" />
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.slice(0, 5).map((category) => (
                <Link
                  key={category}
                  to={`/explore?category=${encodeURIComponent(category)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-3 py-1.5 text-xs font-medium text-white hover:border-brand hover:bg-brand"
                >
                  <CategoryIcon category={category} /> {category}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-brand">
                Handpicked for you
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                This season's highlights
              </h2>
            </div>
            <Link
              to="/explore"
              className="hidden items-center gap-2 text-[15px] font-medium text-ink hover:text-brand sm:inline-flex"
            >
              Explore all <LuArrowRight aria-hidden="true" />
            </Link>
          </div>
          {events.isPending && (
            <p role="status" className="py-12 text-stone-600">
              Loading events...
            </p>
          )}
          {events.isError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-white p-6">
              <p>Events could not be loaded. {events.error.message}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => events.refetch()}
              >
                Try again
              </Button>
            </div>
          )}
          {events.isSuccess && !highlights.length && (
            <p role="status" className="py-12 text-stone-600">
              No upcoming events yet. Check back soon.
            </p>
          )}
          {highlights.length > 0 && <EventRail events={highlights} />}
          <Link
            to="/explore"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand sm:hidden"
          >
            Explore all <LuArrowRight aria-hidden="true" />
          </Link>
        </section>

        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-brand">
                <LuMapPin aria-hidden="true" /> Around you
              </p>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Every city has a story. Find yours.
              </h2>
              <p className="mt-2 max-w-xl text-stone-600">
                From intimate workshops to stadium nights, explore the events people will talk about
                tomorrow.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/explore">
                Find an event <LuArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>

        {more.length > 0 && (
          <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-brand">
                  More to explore
                </p>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Make room for something new
                </h2>
              </div>
            </div>
            <EventRail events={more} />
          </section>
        )}
      </main>
    </SiteShell>
  )
}
