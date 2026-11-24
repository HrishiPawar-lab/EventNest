import { LuHeart } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { toEvent } from '../events/api'
import { EventCard } from '../events/EventCard'
import { useWishlist } from '../events/wishlist'

export function WishlistPage() {
  const wishlist = useWishlist()
  const saved = (wishlist.data?.data ?? [])
    .map((entry) => entry.eventId)
    .filter((event): event is NonNullable<typeof event> => event?.status === 'published')
    .map((event) => toEvent({ ...event, venueName: null, organizerName: null }))
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Saved moments</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">Your wishlist</h1>
        <p className="mt-3 text-stone-600">
          Keep interesting events close while you plan what is next.
        </p>
        {wishlist.isPending && (
          <p role="status" className="mt-8">
            Loading your wishlist...
          </p>
        )}
        {wishlist.isError && (
          <div role="alert" className="mt-8 rounded-xl border border-red-200 bg-white p-6">
            <p>{wishlist.error.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void wishlist.refetch()}
            >
              Try again
            </Button>
          </div>
        )}
        {wishlist.isSuccess && saved.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {saved.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : wishlist.isSuccess ? (
          <div
            role="status"
            className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"
          >
            <LuHeart aria-hidden="true" className="mx-auto size-10 text-stone-400" />
            <h2 className="mt-4 text-xl font-semibold">No saved events yet</h2>
            <p className="mt-2 text-sm text-stone-600">
              Tap the heart on an event to keep it here.
            </p>
            <Button asChild className="mt-6">
              <Link to="/explore">Explore events</Link>
            </Button>
          </div>
        ) : null}
        {wishlist.isSuccess && wishlist.data.pagination.total > wishlist.data.pagination.limit && (
          <p className="mt-6 text-sm text-stone-600">Showing the 100 most recently saved events.</p>
        )}
      </main>
    </SiteShell>
  )
}
