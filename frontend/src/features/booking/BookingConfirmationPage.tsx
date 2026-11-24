import { LuArrowRight, LuCircleCheck } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { eventDate, formatPrice } from '../events/catalog'
import { usePayment, useReservation, useRetryRefund } from './api'
import { useSelection } from './BookingUi'

export function BookingConfirmationPage() {
  const { event, eventId, params } = useSelection()
  const paymentId = params.get('paymentId')
  const payment = usePayment(paymentId)
  const reservation = useReservation(payment.data?.reservationId ?? null)
  const retryRefund = useRetryRefund()
  const confirmed =
    payment.data?.status === 'successful' &&
    !payment.data.refundStatus &&
    reservation.data?.eventId === eventId &&
    reservation.data?.status === 'confirmed'
  const loading =
    Boolean(paymentId) &&
    (payment.isPending ||
      payment.isFetching ||
      event.isPending ||
      (payment.data && (reservation.isPending || reservation.isFetching)))

  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
        {loading ? (
          <p role="status">Checking your booking...</p>
        ) : confirmed && event.data && reservation.data && payment.data ? (
          <>
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-100 text-brand">
              <LuCircleCheck aria-hidden="true" className="size-8" />
            </span>
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-brand">
              Payment verified
            </p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your tickets are confirmed
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-stone-600">
              The backend confirmed your payment and issued your tickets. Open My Tickets to view
              each entry credential.
            </p>
            <div className="mx-auto mt-8 max-w-xl rounded-xl border border-stone-200 bg-white p-6 text-left">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
                Confirmed booking
              </p>
              <h2 className="mt-3 text-xl font-semibold">{event.data.title}</h2>
              <p className="mt-2 text-sm text-stone-600">
                {eventDate(event.data.date)} · {event.data.venue}, {event.data.city}
              </p>
              <p className="mt-4 border-t border-stone-100 pt-4 text-sm">
                {reservation.data.quantity} {reservation.data.quantity === 1 ? 'ticket' : 'tickets'}{' '}
                · Paid {formatPrice(payment.data.amount / 100)}
              </p>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/tickets">
                  My tickets <LuArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/explore">Explore more events</Link>
              </Button>
            </div>
          </>
        ) : (
          <div
            role="alert"
            className="mx-auto max-w-xl rounded-xl border border-orange-200 bg-white p-8"
          >
            <h1 className="text-2xl font-semibold">Booking is not confirmed</h1>
            <p className="mt-3 text-sm text-stone-600">
              {payment.error?.message ??
                reservation.error?.message ??
                (payment.data?.refundStatus
                  ? payment.data.refundStatus === 'failed'
                    ? 'The automatic refund failed. No tickets were issued. Retry the refund below.'
                    : payment.data.refundStatus === 'processed'
                      ? 'Your payment was refunded. No tickets were issued.'
                      : 'Your payment is being refunded. No tickets were issued.'
                  : 'A verified payment is required before tickets can be shown.')}
            </p>
            {payment.data?.refundStatus === 'failed' && paymentId && (
              <Button
                type="button"
                className="mt-5"
                disabled={retryRefund.isPending}
                onClick={() => retryRefund.mutate(paymentId)}
              >
                {retryRefund.isPending ? 'Retrying...' : 'Retry refund'}
              </Button>
            )}
            {retryRefund.isError && (
              <p className="mt-3 text-sm text-red-700">{retryRefund.error.message}</p>
            )}
            <div className="mt-5 flex justify-center gap-3">
              <Button type="button" variant="outline" onClick={() => void payment.refetch()}>
                Check status
              </Button>
              <Button asChild>
                <Link to={`/checkout/${eventId}?quantity=${reservation.data?.quantity ?? 1}`}>
                  Return to checkout
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </SiteShell>
  )
}
