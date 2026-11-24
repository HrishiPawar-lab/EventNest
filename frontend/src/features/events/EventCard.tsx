import { useAuth } from '@clerk/react'
import { useState } from 'react'
import { LuArrowUpRight, LuHeart, LuMapPin } from 'react-icons/lu'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signInPathFor } from '../auth/returnTo'
import { eventDate, formatPrice, type Event } from './catalog'
import { useWishlist } from './wishlist'

export function WishlistButton({
  eventId,
  className = '',
}: {
  eventId: string
  className?: string
}) {
  const { isSignedIn } = useAuth()
  const { ids, toggle } = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()
  const saved = ids.includes(eventId)
  const [saveError, setSaveError] = useState(false)

  function onClick() {
    if (!isSignedIn) {
      navigate(signInPathFor(location))
      return
    }
    setSaveError(!toggle(eventId))
  }

  return (
    <span className={className}>
      <span className="relative inline-flex">
        <button
          type="button"
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={saved}
          onClick={onClick}
          className="inline-flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <LuHeart
            aria-hidden="true"
            className={`size-4 ${saved ? 'fill-brand text-brand' : ''}`}
          />
        </button>
        {saveError && (
          <span
            role="alert"
            className="absolute right-0 top-11 z-10 w-52 rounded-md border border-red-200 bg-white p-2 text-xs text-red-700"
          >
            Could not save here. Check browser storage and try again.
          </span>
        )}
      </span>
    </span>
  )
}

export function EventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className={`relative overflow-hidden ${compact ? 'aspect-[1.7]' : 'aspect-[1.45]'}`}>
        <Link
          to={`/events/${event.id}`}
          aria-label={`View ${event.title}`}
          className="block size-full"
        >
          <img
            src={event.image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
        <WishlistButton eventId={event.id} className="absolute right-3 top-3" />
        <span className="absolute bottom-3 left-3 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-ink">
          {event.category}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/events/${event.id}`}
            className="line-clamp-2 text-lg font-bold leading-snug hover:text-brand"
          >
            {event.title}
          </Link>
          <LuArrowUpRight aria-hidden="true" className="mt-1 shrink-0 text-stone-400" />
        </div>
        <p className="mt-2 text-sm font-semibold text-brand">
          {eventDate(event.date)} · {event.time}
        </p>
        <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
          <LuMapPin aria-hidden="true" /> {event.city} · {event.venue}
        </p>
        <div className="mt-4 border-t border-stone-100 pt-3 text-sm text-stone-500">
          <span className="text-base font-bold text-ink">{formatPrice(event.price)}</span> per
          ticket
        </div>
      </div>
    </article>
  )
}
