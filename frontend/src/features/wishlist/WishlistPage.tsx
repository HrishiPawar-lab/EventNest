import { LuHeart } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { sampleEvents } from '../events/catalog'
import { EventCard } from '../events/EventCard'
import { useWishlist } from '../events/wishlist'

export function WishlistPage() {
  const { ids } = useWishlist()
  const saved = sampleEvents.filter((event) => ids.includes(event.id))
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Saved moments</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">Your wishlist</h1>
        <p className="mt-3 text-stone-600">
          Keep interesting events close while you plan what is next.
        </p>
        {saved.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {saved.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
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
        )}
        <p className="mt-6 text-xs text-stone-500">
          Preview wishlists are stored in this browser. They will sync to your account when the
          wishlist API is available.
        </p>
      </main>
    </SiteShell>
  )
}
