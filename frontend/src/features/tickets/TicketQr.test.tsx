import { runInNewContext } from 'node:vm'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type QRCode from 'qrcodejs'
import qrCodeSource from 'qrcodejs/qrcode.js?raw'
import { afterEach, expect, it, vi } from 'vitest'
import { TicketQr } from './TicketQr'
import type { Ticket } from './api'

vi.mock('./api', () => ({
  useTicketQr: () => ({ data: { token: 'opaque_test_credential' } }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'QRCode')
})

it('loads the installed QR browser script and renders the ticket credential as SVG', async () => {
  const appendChild = document.head.appendChild.bind(document.head)
  vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    const appended = appendChild(node)
    if (node instanceof HTMLScriptElement) {
      window.QRCode = runInNewContext(`${qrCodeSource}\nQRCode`, {
        document,
        navigator,
        window,
      }) as typeof QRCode
      queueMicrotask(() => node.dispatchEvent(new Event('load')))
    }
    return appended
  })

  const ticket: Ticket = {
    _id: 'ticket_1',
    ticketNumber: 'EN-TEST',
    reservationId: 'reservation_1',
    pricePaid: 499,
    status: 'valid',
    issuedAt: '2026-11-27T00:00:00.000Z',
    eventId: null,
  }
  const { rerender } = render(<TicketQr ticket={ticket} />)

  const qr = screen.getByRole('img', { name: 'Entry QR code for ticket EN-TEST' })
  await waitFor(() => expect(qr.querySelector('svg use')).not.toBeNull())
  expect(qr.getAttribute('title')).toBeNull()
  expect(screen.queryByRole('alert')).toBeNull()

  rerender(<TicketQr ticket={{ ...ticket, status: 'used' }} />)
  expect(screen.queryByRole('img')).toBeNull()
  rerender(<TicketQr ticket={ticket} />)
  const restoredQr = screen.getByRole('img', { name: 'Entry QR code for ticket EN-TEST' })
  await waitFor(() => expect(restoredQr.querySelector('svg use')).not.toBeNull())
})
