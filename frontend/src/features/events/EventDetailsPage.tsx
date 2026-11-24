import { useEffect, useState } from 'react'
import {
  LuArrowLeft,
  LuCalendarDays,
  LuMapPin,
  LuMinus,
  LuPlus,
  LuShieldCheck,
  LuTicket,
} from 'react-icons/lu'
import { Link, useParams } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { eventDate, formatPrice, sampleEvents } from './catalog'
import { useEvent, useEvents } from './api'
import { EventCard, WishlistButton } from './EventCard'

export function EventDetailsPage() {
  const { eventId } = useParams()
  const eventQuery = useEvent(eventId)
  const recommendations = useEvents()
  const event = eventQuery.data
  const [quantity, setQuantity] = useState(1)
  useEffect(() => setQuantity(1), [eventId])

  if (eventQuery.isPending)
    return (
      <SiteShell>
        <main role="status" className="mx-auto max-w-4xl px-4 py-24">
          Loading event details...
        </main>
      </SiteShell>
    )

  if (eventQuery.isError || !event)
    return (
      <SiteShell>
        <main className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-3xl font-semibold">
            {eventQuery.error && 'status' in eventQuery.error && eventQuery.error.status === 404
              ? 'Event not found'
              : 'Event unavailable'}
          </h1>
          <p className="mt-3 text-stone-600">
            {eventQuery.error?.message ?? 'The event may have moved or the link may be incorrect.'}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6 mr-3"
            onClick={() => eventQuery.refetch()}
          >
            Try again
          </Button>
          <Button asChild className="mt-6">
            <Link to="/explore">Explore events</Link>
          </Button>
        </main>
      </SiteShell>
    )

  return (
    <SiteShell>
      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-14">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to explore
        </Link>
        <div className="mb-5 mt-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-md bg-orange-100 px-2.5 py-1 text-xs font-medium text-brand-dark">
              {event.category}
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
              Featured experience
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
          {event.description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
              {event.description}
            </p>
          )}
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
          <div>
            {event.image ? (
              <img
                src={event.image}
                alt=""
                className="aspect-[1.8] w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex aspect-[1.8] items-center justify-center rounded-xl bg-stone-200 text-stone-500">
                <LuTicket aria-hidden="true" className="size-12" />
              </div>
            )}
            <div className="mt-6 grid gap-6 border-b border-stone-200 pb-6 sm:grid-cols-2">
              {event.highlights.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold">What to expect</h2>
                  <ul className="mt-4 space-y-3">
                    {event.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex items-center gap-3 text-sm text-stone-600"
                      >
                        <LuShieldCheck aria-hidden="true" className="shrink-0 text-brand" />{' '}
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section>
                <h2 className="text-lg font-semibold">The venue</h2>
                <p className="mt-4 text-sm font-medium">{event.venue}</p>
                <p className="mt-1 text-sm text-stone-600">{event.city}, India</p>
                <p className="mt-3 text-sm text-stone-500">
                  Venue details and entry instructions will appear on a confirmed ticket.
                </p>
              </section>
            </div>
            <section className="py-6">
              <h2 className="text-lg font-semibold">Hosted by</h2>
              <span className="mt-4 inline-flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-medium">
                <span className="flex size-9 items-center justify-center rounded-full bg-ink text-white">
                  {event.organizer[0]}
                </span>
                {event.organizer}
              </span>
            </section>
          </div>
          <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 lg:sticky lg:top-20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                  General admission
                </p>
                <p className="mt-2 text-2xl font-semibold">{formatPrice(event.price)}</p>
                <p className="text-sm text-stone-500">per ticket</p>
              </div>
              <WishlistButton eventId={event.id} />
            </div>
            <div className="mt-6 space-y-4 border-y border-stone-200 py-5 text-sm">
              <p className="flex items-start gap-3">
                <LuCalendarDays aria-hidden="true" className="mt-0.5 size-5 text-brand" />
                <span>
                  <strong className="block font-medium">{eventDate(event.date)}</strong>
                  <span className="text-stone-500">{event.time}</span>
                </span>
              </p>
              <p className="flex items-start gap-3">
                <LuMapPin aria-hidden="true" className="mt-0.5 size-5 text-brand" />
                <span>
                  <strong className="block font-medium">{event.venue}</strong>
                  <span className="text-stone-500">{event.city}, India</span>
                </span>
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm font-medium">Tickets</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Remove one ticket"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(quantity - 1)}
                  className="flex size-8 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40"
                >
                  <LuMinus aria-hidden="true" />
                </button>
                <output aria-live="polite" className="w-4 text-center font-medium">
                  {quantity}
                </output>
                <button
                  type="button"
                  aria-label="Add one ticket"
                  disabled={quantity >= 10}
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex size-8 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40"
                >
                  <LuPlus aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-stone-200 pt-5">
              <span className="text-sm font-medium">Estimated total</span>
              <span className="text-lg font-semibold">{formatPrice(event.price * quantity)}</span>
            </div>
            <Button asChild className="mt-5 w-full" size="lg">
              <Link to={`/booking/review/${event.id}?quantity=${quantity}`}>
                <LuTicket aria-hidden="true" /> Review tickets
              </Link>
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-stone-500">
              Availability is confirmed when you reserve.
            </p>
          </aside>
        </div>
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">You might also like</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(recommendations.data?.data ?? [])
              .filter((item) => item.id !== event.id)
              .slice(0, 4)
              .map((item) => (
                <EventCard key={item.id} event={item} />
              ))}
          </div>
        </section>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white px-4 py-3 shadow-sm lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between gap-4">
            <div>
              <p className="text-xs text-stone-500">
                Estimated total · {quantity} {quantity === 1 ? 'ticket' : 'tickets'}
              </p>
              <p className="text-lg font-semibold">{formatPrice(event.price * quantity)}</p>
            </div>
            <Button asChild>
              <Link to={`/booking/review/${event.id}?quantity=${quantity}`}>Review tickets</Link>
            </Button>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}

export function PublicOrganizerPage() {
  const { slug } = useParams()
  const organizer = sampleEvents.find(
    (event) => event.organizer.toLowerCase().replaceAll(' ', '-') === slug,
  )?.organizer
  const events = sampleEvents.filter((event) => event.organizer === organizer)
  if (!organizer)
    return (
      <SiteShell>
        <main className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-3xl font-semibold">Organizer not found</h1>
          <Button asChild className="mt-6">
            <Link to="/explore">Explore events</Link>
          </Button>
        </main>
      </SiteShell>
    )
  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-ink px-6 py-9 text-white sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-200">
            Event organizer
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{organizer}</h1>
          <p className="mt-4 max-w-xl text-white/75">
            Thoughtful experiences, memorable places, and people worth gathering with.
          </p>
        </div>
        <div className="mt-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">
              From this organizer
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold">Upcoming events</h2>
          </div>
          <span className="text-sm text-stone-500">Sample profile</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </main>
    </SiteShell>
  )
}
