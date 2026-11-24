import { LuArrowLeft, LuArrowRight, LuLockKeyhole, LuTicket } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { BookingSummary, BookingUnavailable, useSelection } from './BookingUi'

export function BookingReviewPage() {
  const { event, quantity, eventId } = useSelection()
  if (event.isPending)
    return (
      <SiteShell>
        <main role="status" className="mx-auto max-w-4xl px-4 py-24">
          Loading booking details...
        </main>
      </SiteShell>
    )
  if (!event.data)
    return (
      <BookingUnavailable
        message={event.error?.message ?? 'Choose another event.'}
        retry={() => {
          void event.refetch()
        }}
      />
    )

  return (
    <SiteShell>
      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={`/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to event
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Step 1 of 2</p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Review your tickets
            </h1>
            <p className="mt-3 text-stone-600">
              Your event and quantity stay selected if you need to sign in.
            </p>
            <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-brand">
                  <LuTicket aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">General admission</h2>
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
                Sign in before reserving. A five-minute hold starts only when you choose to reserve
                on the next screen.
              </p>
            </div>
            <Button asChild size="lg" className="mt-7">
              <Link to={`/checkout/${eventId}?quantity=${quantity}`}>
                Continue to checkout <LuArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <BookingSummary event={event.data} quantity={quantity} />
        </div>
      </main>
    </SiteShell>
  )
}
