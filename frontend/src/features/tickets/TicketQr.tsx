import { useEffect, useRef } from 'react'
import QRCode from 'qrcodejs'
import { LuQrCode } from 'react-icons/lu'
import { Button } from '../../components/ui/button'
import { useTicketQr, type Ticket } from './api'

export function TicketQr({ ticket }: { ticket: Ticket }) {
  const qr = useTicketQr(ticket._id, ticket.status === 'valid')
  const target = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = target.current
    if (!element || !qr.data?.token) return
    element.replaceChildren()
    new QRCode(element, {
      text: qr.data.token,
      width: 200,
      height: 200,
      colorDark: '#202020',
      colorLight: '#ffffff',
    })
    return () => element.replaceChildren()
  }, [qr.data?.token])
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-stone-200 bg-paper p-5 text-center">
      {ticket.status !== 'valid' ? (
        <>
          <LuQrCode aria-hidden="true" className="size-10 text-stone-400" />
          <p className="mt-3 text-sm">
            This ticket is {ticket.status}. Its entry credential is unavailable.
          </p>
        </>
      ) : qr.isPending ? (
        <p role="status" className="text-sm">
          Loading secure QR...
        </p>
      ) : qr.isError ? (
        <>
          <p role="alert" className="text-sm text-red-700">
            {qr.error.message}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void qr.refetch()}
          >
            Try again
          </Button>
        </>
      ) : (
        <>
          <div
            ref={target}
            role="img"
            aria-label={`Entry QR code for ticket ${ticket.ticketNumber}`}
            className="rounded-md bg-white p-3"
          />
          <p className="mt-3 text-xs text-stone-600">
            Show this code at the event entrance. Keep it private.
          </p>
        </>
      )}
    </div>
  )
}
