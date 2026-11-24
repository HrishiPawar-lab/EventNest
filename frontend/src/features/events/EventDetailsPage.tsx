import { useState } from 'react'
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
import { eventById, eventDate, formatPrice, sampleEvents } from './catalog'
import { EventCard, WishlistButton } from './EventCard'

export function EventDetailsPage() {
  const { eventId } = useParams()
  const event = eventById(eventId)
  const [quantity, setQuantity] = useState(1)

  if (!event)
    return (
      <SiteShell>
        <main className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-3xl font-black">Event not found</h1>
          <p className="mt-3 text-stone-600">
            The event may have moved or the link may be incorrect.
          </p>
          <Button asChild className="mt-6">
            <Link to="/explore">Explore events</Link>
          </Button>
        </main>
      </SiteShell>
    )

  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to explore
        </Link>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
          <div>
            <img
              src={event.image}
              alt={`Scene from a ${event.category.toLowerCase()} event`}
              className="aspect-[1.55] w-full rounded-xl object-cover"
            />
            <div className="mt-8 border-b border-stone-200 pb-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-md bg-orange-100 px-2.5 py-1 text-xs font-bold text-brand-dark">
                  {event.category}
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                  Featured experience
                </span>
              </div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{event.title}</h1>
              <p className="mt-3 text-lg text-stone-600">{event.description}</p>
            </div>
            <div className="grid gap-8 border-b border-stone-200 py-8 sm:grid-cols-2">
              <section>
                <h2 className="text-xl font-bold">What to expect</h2>
                <ul className="mt-4 space-y-3">
                  {event.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-3 text-sm text-stone-600">
                      <LuShieldCheck aria-hidden="true" className="shrink-0 text-brand" />{' '}
                      {highlight}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold">The venue</h2>
                <p className="mt-4 text-sm font-semibold">{event.venue}</p>
                <p className="mt-1 text-sm text-stone-600">{event.city}, India</p>
                <p className="mt-3 text-sm text-stone-500">
                  Venue details and entry instructions will appear on a confirmed ticket.
                </p>
              </section>
            </div>
            <section className="py-8">
              <h2 className="text-xl font-bold">Hosted by</h2>
              <Link
                to={`/organizers/${encodeURIComponent(event.organizer.toLowerCase().replaceAll(' ', '-'))}`}
                className="mt-4 inline-flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 font-semibold hover:border-brand"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-ink text-white">
                  {event.organizer[0]}
                </span>
                {event.organizer}
              </Link>
            </section>
          </div>
          <aside className="h-fit rounded-xl border border-stone-200 bg-white p-6 lg:sticky lg:top-24">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  General admission
                </p>
                <p className="mt-2 text-3xl font-black">{formatPrice(event.price)}</p>
                <p className="text-sm text-stone-500">per ticket · example price</p>
              </div>
              <WishlistButton eventId={event.id} />
            </div>
            <div className="mt-6 space-y-4 border-y border-stone-200 py-5 text-sm">
              <p className="flex items-start gap-3">
                <LuCalendarDays aria-hidden="true" className="mt-0.5 size-5 text-brand" />
                <span>
                  <strong className="block">{eventDate(event.date)}</strong>
                  <span className="text-stone-500">{event.time}</span>
                </span>
              </p>
              <p className="flex items-start gap-3">
                <LuMapPin aria-hidden="true" className="mt-0.5 size-5 text-brand" />
                <span>
                  <strong className="block">{event.venue}</strong>
                  <span className="text-stone-500">{event.city}, India</span>
                </span>
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm font-semibold">Tickets</span>
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
                <output aria-live="polite" className="w-4 text-center font-bold">
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
              <span className="font-semibold">Estimated total</span>
              <span className="text-xl font-black">{formatPrice(event.price * quantity)}</span>
            </div>
            <Button asChild className="mt-5 w-full" size="lg">
              <Link to={`/booking/review/${event.id}?quantity=${quantity}`}>
                <LuTicket aria-hidden="true" /> Review tickets
              </Link>
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-stone-500">
              Demo listing. No reservation or payment is made on this screen.
            </p>
          </aside>
        </div>
        <section className="mt-12">
          <h2 className="text-2xl font-black">You might also like</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sampleEvents
              .filter((item) => item.id !== event.id)
              .slice(0, 3)
              .map((item) => (
                <EventCard key={item.id} event={item} compact />
              ))}
          </div>
        </section>
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
          <h1 className="text-3xl font-black">Organizer not found</h1>
          <Button asChild className="mt-6">
            <Link to="/explore">Explore events</Link>
          </Button>
        </main>
      </SiteShell>
    )
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-ink px-8 py-12 text-white sm:px-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-200">
            Event organizer
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">{organizer}</h1>
          <p className="mt-4 max-w-xl text-white/75">
            Thoughtful experiences, memorable places, and people worth gathering with.
          </p>
        </div>
        <div className="mt-10 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
              From this organizer
            </p>
            <h2 className="mt-2 text-2xl font-black">Upcoming events</h2>
          </div>
          <span className="text-sm text-stone-500">Sample profile</span>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </main>
    </SiteShell>
  )
}
