import { useAuth } from '@clerk/react'
import { useState } from 'react'
import {
  LuCalendarDays,
  LuCpu,
  LuHeart,
  LuMapPin,
  LuMusic2,
  LuPalette,
  LuTicket,
  LuTrophy,
  LuUtensils,
  LuWrench,
} from 'react-icons/lu'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signInPathFor } from '../auth/returnTo'
import { eventDate, formatPrice, type Event, type EventCategory } from './catalog'
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

const categoryIcons = {
  Music: LuMusic2,
  Food: LuUtensils,
  Arts: LuPalette,
  Sports: LuTrophy,
  Technology: LuCpu,
  Workshops: LuWrench,
} satisfies Record<EventCategory, typeof LuMusic2>

export function CategoryIcon({ category }: { category: EventCategory }) {
  const Icon = categoryIcons[category]
  return <Icon aria-hidden="true" className="size-4 shrink-0" />
}

export function EventCard({ event }: { event: Event }) {
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition-[border-color,box-shadow] duration-200 hover:border-stone-300 hover:shadow-sm">
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
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
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-ink">
          <CategoryIcon category={event.category} /> {event.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-brand-dark">
          <LuCalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
          {eventDate(event.date)} · {event.time}
        </p>
        <Link
          to={`/events/${event.id}`}
          className="mt-2 line-clamp-2 min-h-11 text-[16px] font-semibold leading-[1.4] text-ink hover:text-brand"
        >
          {event.title}
        </Link>
        <p className="mb-3 mt-1 flex items-start gap-1.5 text-[13px] leading-5 text-stone-600">
          <LuMapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span className="line-clamp-1">
            {event.venue}, {event.city}
          </span>
        </p>
        <div className="mt-auto flex items-baseline gap-1.5 border-t border-stone-100 pt-3 text-stone-600">
          <LuTicket aria-hidden="true" className="size-4 shrink-0 text-brand" />
          <span className="text-sm font-medium text-ink">{formatPrice(event.price)}</span>
          <span className="text-xs">per ticket</span>
        </div>
      </div>
    </article>
  )
}
