import { LuCalendarDays, LuMapPin } from 'react-icons/lu'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { eventDate, formatPrice, type Event } from '../events/catalog'
import { useEvent } from '../events/api'

export function useSelection() {
  const { eventId } = useParams()
  const [params] = useSearchParams()
  const event = useEvent(eventId)
  const parsed = Number(params.get('quantity') || '1')
  const quantity = Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 1
  return { event, quantity, eventId, params }
}

export function BookingSummary({ event, quantity }: { event: Event; quantity: number }) {
  return (
    <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 sm:p-6">
      {event.image && (
        <img src={event.image} alt="" className="aspect-[2.2] w-full rounded-lg object-cover" />
      )}
      <h2 className="mt-4 text-xl font-semibold">{event.title}</h2>
      <p className="mt-3 flex items-center gap-2 text-sm text-stone-600">
        <LuCalendarDays aria-hidden="true" className="text-brand" />
        {eventDate(event.date)} · {event.time}
      </p>
      <p className="mt-2 flex items-center gap-2 text-sm text-stone-600">
        <LuMapPin aria-hidden="true" className="text-brand" />
        {event.venue}, {event.city}
      </p>
      <div className="mt-6 border-t border-stone-200 pt-4 text-sm">
        <p className="flex justify-between text-stone-600">
          <span>General admission × {quantity}</span>
          <span>{formatPrice(event.price * quantity)}</span>
        </p>
        <p className="mt-4 flex justify-between border-t border-stone-100 pt-4 text-lg font-semibold">
          <span>Estimated total</span>
          <span>{formatPrice(event.price * quantity)}</span>
        </p>
      </div>
      <p className="mt-4 text-xs leading-5 text-stone-500">
        The backend confirms the final amount and availability before payment.
      </p>
    </aside>
  )
}

export function BookingUnavailable({ message, retry }: { message: string; retry: () => void }) {
  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Event unavailable</h1>
        <p className="mt-3 text-stone-600">{message}</p>
        <Button type="button" variant="outline" className="mt-6 mr-3" onClick={retry}>
          Try again
        </Button>
        <Button asChild className="mt-6">
          <Link to="/explore">Explore events</Link>
        </Button>
      </main>
    </SiteShell>
  )
}
