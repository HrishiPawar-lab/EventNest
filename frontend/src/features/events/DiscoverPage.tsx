import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LuArrowRight, LuMapPin, LuSearch, LuSparkles } from 'react-icons/lu'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { categories, sampleEvents } from './catalog'
import { EventCard } from './EventCard'

const searchSchema = z.object({ query: z.string().trim().max(100) })
type SearchValues = z.infer<typeof searchSchema>

export function DiscoverPage() {
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
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:py-28">
            <p className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.23em] text-orange-200">
              <LuSparkles aria-hidden="true" /> Experiences worth showing up for
            </p>
            <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Discover unforgettable <span className="text-brand">events.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/85 sm:text-lg">
              The best nights, new ideas, great food, and everything in between. Find your next
              moment here.
            </p>
            <form
              onSubmit={search}
              role="search"
              className="mt-9 flex max-w-xl items-center rounded-lg bg-white p-1.5 text-ink focus-within:ring-2 focus-within:ring-brand"
            >
              <LuSearch aria-hidden="true" className="ml-3 size-5 shrink-0 text-stone-500" />
              <input
                {...register('query')}
                aria-label="Search events"
                placeholder="Search events, places or artists"
                maxLength={100}
                className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
              />
              <Button type="submit" size="sm">
                Search <LuArrowRight aria-hidden="true" />
              </Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {categories.slice(0, 5).map((category) => (
                <Link
                  key={category}
                  to={`/explore?category=${encodeURIComponent(category)}`}
                  className="rounded-full border border-white/35 px-3 py-1.5 text-xs font-semibold text-white hover:border-brand hover:bg-brand"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
                Handpicked for you
              </p>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                This season's highlights
              </h2>
            </div>
            <Link
              to="/explore"
              className="hidden items-center gap-2 text-sm font-bold text-ink hover:text-brand sm:inline-flex"
            >
              Explore all <LuArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sampleEvents.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <Link
            to="/explore"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand sm:hidden"
          >
            Explore all <LuArrowRight aria-hidden="true" />
          </Link>
        </section>

        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
                <LuMapPin aria-hidden="true" /> Around you
              </p>
              <h2 className="text-2xl font-black sm:text-3xl">
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

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
                More to explore
              </p>
              <h2 className="text-3xl font-black tracking-tight">Make room for something new</h2>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sampleEvents.slice(3).map((event) => (
              <EventCard key={event.id} event={event} compact />
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  )
}
