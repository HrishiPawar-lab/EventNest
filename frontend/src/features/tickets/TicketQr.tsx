import { useEffect, useRef, useState } from 'react'
import type QRCode from 'qrcodejs'
import qrCodeScriptUrl from 'qrcodejs/qrcode.js?url'
import { LuQrCode } from 'react-icons/lu'
import { Button } from '../../components/ui/button'
import { useTicketQr, type Ticket } from './api'

declare global {
  interface Window {
    QRCode?: typeof QRCode
  }
}

let qrCodePromise: Promise<typeof QRCode> | null = null

function loadQrCode() {
  if (window.QRCode) return Promise.resolve(window.QRCode)
  if (qrCodePromise) return qrCodePromise
  qrCodePromise = new Promise<typeof QRCode>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = qrCodeScriptUrl
    script.async = true
    script.onload = () => {
      if (window.QRCode) resolve(window.QRCode)
      else reject(new Error('QR code renderer is unavailable'))
    }
    script.onerror = () => {
      script.remove()
      reject(new Error('QR code renderer could not be loaded'))
    }
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    qrCodePromise = null
    throw error
  })
  return qrCodePromise
}

export function TicketQr({ ticket }: { ticket: Ticket }) {
  const valid = ticket.status === 'valid'
  const qr = useTicketQr(ticket._id, valid)
  const target = useRef<HTMLDivElement>(null)
  const [renderError, setRenderError] = useState(false)
  const [renderAttempt, setRenderAttempt] = useState(0)
  useEffect(() => {
    const element = target.current
    if (!valid || !element || !qr.data?.token) return
    let active = true
    loadQrCode()
      .then((QRCode) => {
        if (!active) return
        element.replaceChildren()
        new QRCode(element, {
          text: qr.data.token,
          width: 200,
          height: 200,
          colorDark: '#202020',
          colorLight: '#ffffff',
          useSVG: true,
        })
        element.removeAttribute('title')
        setRenderError(false)
      })
      .catch(() => {
        if (active) setRenderError(true)
      })
    return () => {
      active = false
      element.replaceChildren()
    }
  }, [valid, qr.data?.token, renderAttempt])
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
          {renderError && (
            <div role="alert" className="mt-3 text-sm text-red-700">
              QR code could not be displayed.
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  setRenderError(false)
                  setRenderAttempt((attempt) => attempt + 1)
                }}
              >
                Try again
              </Button>
            </div>
          )}
          <p className="mt-3 text-xs text-stone-600">
            Show this code at the event entrance. Keep it private.
          </p>
        </>
      )}
    </div>
  )
}
