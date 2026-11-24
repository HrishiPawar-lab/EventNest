import { useAuth } from '@clerk/react'
import {
  LuArrowLeft,
  LuArrowRight,
  LuCalendarDays,
  LuCircleCheck,
  LuLockKeyhole,
  LuMapPin,
  LuTicket,
} from 'react-icons/lu'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { eventById, eventDate, formatPrice, type Event } from '../events/catalog'

function useSelection() {
  const { eventId } = useParams()
  const [params] = useSearchParams()
  const event = eventById(eventId)
  const parsed = Number(params.get('quantity') || '1')
  const quantity = Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 1
  return { event, quantity }
}

function BookingSummary({ event, quantity }: { event: Event; quantity: number }) {
  return (
    <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 sm:p-6">
      <img src={event.image} alt="" className="aspect-[2.2] w-full rounded-lg object-cover" />
      <h2 className="mt-5 text-xl font-black">{event.title}</h2>
      <p className="mt-3 flex items-center gap-2 text-sm text-stone-600">
        <LuCalendarDays aria-hidden="true" className="text-brand" /> {eventDate(event.date)} ·{' '}
        {event.time}
      </p>
      <p className="mt-2 flex items-center gap-2 text-sm text-stone-600">
        <LuMapPin aria-hidden="true" className="text-brand" /> {event.venue}, {event.city}
      </p>
      <div className="mt-6 border-t border-stone-200 pt-4 text-sm">
        <p className="flex justify-between text-stone-600">
          <span>General admission × {quantity}</span>
          <span>{formatPrice(event.price * quantity)}</span>
        </p>
        <p className="mt-4 flex justify-between border-t border-stone-100 pt-4 text-lg font-black">
          <span>Estimated total</span>
          <span>{formatPrice(event.price * quantity)}</span>
        </p>
      </div>
      <p className="mt-4 text-xs leading-5 text-stone-500">
        Example pricing only. Final totals, availability and fees require a live checkout service.
      </p>
    </aside>
  )
}

function MissingSelection() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black">Choose an event first</h1>
        <p className="mt-3 text-stone-600">We could not find that event in the preview catalog.</p>
        <Button asChild className="mt-6">
          <Link to="/explore">Explore events</Link>
        </Button>
      </main>
    </SiteShell>
  )
}

export function BookingReviewPage() {
  const { event, quantity } = useSelection()
  const { isSignedIn } = useAuth()
  if (!event) return <MissingSelection />

  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to={`/events/${event.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to event
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Step 1 of 2</p>
            <h1 className="mt-2 text-4xl font-black">Review your tickets</h1>
            <p className="mt-3 text-stone-600">
              A quick look before checkout. Your selection stays with you if you need to sign in.
            </p>
            <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-brand">
                  <LuTicket aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-bold">General admission</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    One entry per ticket. No assigned seats.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-between border-t border-stone-100 pt-5 text-sm">
                <span>Selected quantity</span>
                <strong>
                  {quantity} {quantity === 1 ? 'ticket' : 'tickets'}
                </strong>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5 text-sm text-stone-700">
              <LuLockKeyhole aria-hidden="true" className="mb-2 text-brand" />
              <p>
                Signing in is required before a reservation can be created. This preview has no live
                inventory hold.
              </p>
            </div>
            <Button asChild size="lg" className="mt-7">
              <Link to={`/checkout/${event.id}?quantity=${quantity}`}>
                {isSignedIn ? 'Continue to checkout' : 'Sign in to continue'}{' '}
                <LuArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <BookingSummary event={event} quantity={quantity} />
        </div>
      </main>
    </SiteShell>
  )
}

export function CheckoutPage() {
  const { event, quantity } = useSelection()
  if (!event) return <MissingSelection />
  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to={`/booking/review/${event.id}?quantity=${quantity}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to review
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Step 2 of 2</p>
            <h1 className="mt-2 text-4xl font-black">Checkout</h1>
            <p className="mt-3 text-stone-600">
              Your selection is ready. Payment will open here when reservations and Razorpay are
              connected.
            </p>
            <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="text-lg font-bold">Payment method</h2>
              <div className="mt-5 rounded-lg border border-dashed border-stone-300 bg-paper px-5 py-8 text-center">
                <LuLockKeyhole aria-hidden="true" className="mx-auto size-8 text-stone-400" />
                <p className="mt-3 font-semibold">Secure payment is not available yet</p>
                <p className="mt-1 text-sm text-stone-600">
                  No card details or payment will be collected in this preview.
                </p>
              </div>
              <Button disabled className="mt-5 w-full" size="lg">
                Reserve and pay
              </Button>
            </div>
            <p className="mt-5 text-sm text-stone-500">
              Tickets are issued only after the backend verifies payment. This screen does not
              create a reservation.
            </p>
          </div>
          <BookingSummary event={event} quantity={quantity} />
        </div>
      </main>
    </SiteShell>
  )
}

export function BookingConfirmationPage() {
  const { event, quantity } = useSelection()
  if (!event) return <MissingSelection />
  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-100 text-brand">
          <LuCircleCheck aria-hidden="true" className="size-8" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-brand">
          Confirmation preview
        </p>
        <h1 className="mt-2 text-4xl font-black">A great night is one step away</h1>
        <p className="mx-auto mt-4 max-w-xl text-stone-600">
          This is how a booking confirmation will look once the payment service verifies a purchase.
          No booking or ticket has been created.
        </p>
        <div className="mx-auto mt-8 max-w-xl rounded-xl border border-stone-200 bg-white p-6 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Example order
          </p>
          <h2 className="mt-3 text-xl font-black">{event.title}</h2>
          <p className="mt-2 text-sm text-stone-600">
            {eventDate(event.date)} · {event.venue}, {event.city}
          </p>
          <p className="mt-4 border-t border-stone-100 pt-4 text-sm">
            General admission × {quantity}
          </p>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/explore">
              Explore more events <LuArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/tickets">My tickets</Link>
          </Button>
        </div>
      </main>
    </SiteShell>
  )
}
