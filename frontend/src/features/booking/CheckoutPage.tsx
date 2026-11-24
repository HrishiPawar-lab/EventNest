import { useUser } from '@clerk/react'
import { useEffect, useState } from 'react'
import { LuArrowLeft, LuClock3 } from 'react-icons/lu'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import {
  useCreatePaymentOrder,
  useCreateReservation,
  usePayment,
  useReservation,
  useVerifyPayment,
} from './api'
import { BookingSummary, BookingUnavailable, useSelection } from './BookingUi'
import { openCheckout } from './razorpay'

export function CheckoutPage() {
  const { event, quantity, eventId, params } = useSelection()
  const [, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const reservationId = params.get('reservationId')
  const paymentId = params.get('paymentId')
  const reservation = useReservation(reservationId)
  const payment = usePayment(paymentId)
  const createReservation = useCreateReservation()
  const createOrder = useCreatePaymentOrder()
  const verifyPayment = useVerifyPayment()
  const [now, setNow] = useState(Date.now())
  const [notice, setNotice] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (
      (payment.data?.status === 'successful' || payment.data?.status === 'refunded') &&
      eventId &&
      paymentId
    )
      navigate(`/booking/confirmation/${eventId}?paymentId=${paymentId}`, { replace: true })
  }, [payment.data, eventId, paymentId, navigate])

  const holdMatches =
    reservation.data?.eventId === eventId && reservation.data?.quantity === quantity
  const remaining =
    holdMatches && reservation.data?.status === 'pending'
      ? Math.max(0, Math.ceil((Date.parse(reservation.data.expiresAt) - now) / 1000))
      : 0
  const busy =
    createReservation.isPending || createOrder.isPending || verifyPayment.isPending || checkoutOpen
  const unresolvedPayment =
    paymentId &&
    (payment.isPending ||
      payment.isError ||
      ['pending', 'successful', 'refunded'].includes(payment.data?.status ?? ''))

  async function reserveAndPay() {
    if (!eventId || !event.data || busy || unresolvedPayment) return
    setNotice('')
    try {
      let holdId = reservationId
      if (!holdId || !holdMatches || remaining === 0) {
        const hold = await createReservation.mutateAsync({ eventId, quantity })
        holdId = hold._id
        setParams({ quantity: String(quantity), reservationId: holdId }, { replace: true })
      }
      const existing =
        holdId === reservationId &&
        payment.data?.reservationId === holdId &&
        payment.data.status === 'created'
          ? payment.data
          : null
      const order = existing
        ? {
            paymentId: existing.id,
            providerOrderId: existing.providerOrderId,
            amount: existing.amount,
            currency: existing.currency,
            keyId: existing.keyId,
          }
        : await createOrder.mutateAsync(holdId)
      if (!order.providerOrderId || !order.keyId)
        throw new Error('Payment order is unavailable. Check its status before retrying.')
      setParams(
        { quantity: String(quantity), reservationId: holdId, paymentId: order.paymentId },
        { replace: true },
      )
      setCheckoutOpen(true)
      await openCheckout(order, {
        eventName: event.data.title,
        email: user?.primaryEmailAddress?.emailAddress,
        onSuccess: (response) => {
          setCheckoutOpen(false)
          void verifyPayment
            .mutateAsync({
              paymentId: order.paymentId,
              providerPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
            .then(() =>
              navigate(`/booking/confirmation/${eventId}?paymentId=${order.paymentId}`, {
                replace: true,
              }),
            )
            .catch(() =>
              setNotice(
                'Payment could not be confirmed yet. Check its status before trying again.',
              ),
            )
        },
        onDismiss: () => {
          setCheckoutOpen(false)
          setNotice('Payment window closed. Your hold remains active until it expires.')
        },
        onFailure: () => {
          setCheckoutOpen(false)
          setNotice('Payment failed. You can retry while the reservation remains active.')
        },
      })
    } catch (error) {
      setCheckoutOpen(false)
      setNotice(
        error instanceof Error ? error.message : 'Checkout could not start. Please try again.',
      )
    }
  }

  if (event.isPending)
    return (
      <SiteShell>
        <main role="status" className="mx-auto max-w-4xl px-4 py-24">
          Loading checkout...
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
          to={`/booking/review/${eventId}?quantity=${quantity}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to review
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Step 2 of 2</p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">Checkout</h1>
            <p className="mt-3 text-stone-600">
              Reserve your tickets for five minutes, then complete payment securely with Razorpay.
            </p>
            <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Reservation and payment</h2>
              {reservationId && reservation.isPending && (
                <p role="status" className="mt-4 text-sm">
                  Checking your reservation...
                </p>
              )}
              {reservation.isError && (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {reservation.error.message}
                </p>
              )}
              {reservation.data && (
                <p className="mt-4 flex items-center gap-2 text-sm text-stone-700">
                  <LuClock3 aria-hidden="true" className="text-brand" />
                  {holdMatches
                    ? remaining > 0
                      ? `Hold expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                      : `Reservation ${reservation.data.status === 'pending' ? 'expired' : reservation.data.status}`
                    : 'This hold does not match your selection.'}
                </p>
              )}
              {paymentId && (
                <p className="mt-3 text-sm text-stone-600">
                  Payment status:{' '}
                  {payment.data?.refundStatus
                    ? `refund ${payment.data.refundStatus}`
                    : (payment.data?.status ?? 'checking...')}
                </p>
              )}
              {notice && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-stone-800"
                >
                  {notice}
                </p>
              )}
              <Button
                type="button"
                disabled={
                  busy || unresolvedPayment || (Boolean(reservationId) && reservation.isPending)
                }
                onClick={() => void reserveAndPay()}
                className="mt-6 w-full"
                size="lg"
              >
                {busy
                  ? 'Processing...'
                  : payment.data?.status === 'created' && remaining > 0
                    ? 'Reopen payment'
                    : remaining > 0
                      ? 'Continue to payment'
                      : 'Reserve and pay'}
              </Button>
              {paymentId && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => void payment.refetch()}
                >
                  Check payment status
                </Button>
              )}
            </div>
            <p className="mt-5 text-sm text-stone-500">
              Tickets are issued only after the backend verifies a captured payment. Closing
              checkout does not confirm a booking.
            </p>
          </div>
          <BookingSummary event={event.data} quantity={quantity} />
        </div>
      </main>
    </SiteShell>
  )
}
