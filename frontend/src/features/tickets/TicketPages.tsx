import { useState } from 'react'
import { LuArrowLeft, LuArrowRight, LuTicket } from 'react-icons/lu'
import { Link, useParams } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { eventDate, formatPrice } from '../events/catalog'
import { useTicket, useTickets } from './api'
import { TicketQr } from './TicketQr'

export function MyTicketsPage() {
  const [page, setPage] = useState(1)
  const tickets = useTickets(page)
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">
          Your experiences
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">My tickets</h1>
        <p className="mt-3 text-stone-600">
          Each purchased entry has its own ticket and QR credential.
        </p>
        {tickets.isPending && (
          <p role="status" className="mt-8">
            Loading your tickets...
          </p>
        )}
        {tickets.isError && (
          <div role="alert" className="mt-8 rounded-xl border border-red-200 bg-white p-6">
            <p>{tickets.error.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void tickets.refetch()}
            >
              Try again
            </Button>
          </div>
        )}
        {tickets.isSuccess && tickets.data.data.length === 0 && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"
          >
            <LuTicket aria-hidden="true" className="mx-auto size-10 text-stone-400" />
            <h2 className="mt-4 text-xl font-semibold">No confirmed tickets yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
              Explore upcoming events and find a moment worth being there for.
            </p>
            <Button asChild className="mt-6">
              <Link to="/explore">
                Explore events <LuArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        )}
        {tickets.isSuccess && tickets.data.data.length > 0 && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {tickets.data.data.map((ticket) => (
              <article
                key={ticket._id}
                className="flex overflow-hidden rounded-xl border border-stone-200 bg-white"
              >
                {ticket.eventId?.imageUrl && (
                  <img
                    src={ticket.eventId.imageUrl}
                    alt=""
                    className="w-28 shrink-0 object-cover sm:w-40"
                  />
                )}
                <div className="min-w-0 flex-1 p-5">
                  <p className="text-xs font-medium uppercase tracking-widest text-brand">
                    {ticket.status}
                  </p>
                  <h2 className="mt-2 truncate text-lg font-semibold">
                    {ticket.eventId?.name ?? 'Event unavailable'}
                  </h2>
                  <p className="mt-2 text-sm text-stone-600">
                    {ticket.eventId?.startDate
                      ? eventDate(ticket.eventId.startDate)
                      : 'Date unavailable'}{' '}
                    · {ticket.eventId?.location?.city ?? 'Location unavailable'}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">Ticket {ticket.ticketNumber}</p>
                  <Link
                    to={`/tickets/${ticket._id}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand"
                  >
                    View ticket <LuArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        {tickets.isSuccess && tickets.data.pagination.total > tickets.data.pagination.limit && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of{' '}
              {Math.ceil(tickets.data.pagination.total / tickets.data.pagination.limit)}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={page * tickets.data.pagination.limit >= tickets.data.pagination.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </SiteShell>
  )
}

export function TicketDetailsPage() {
  const { ticketId } = useParams()
  const ticket = useTicket(ticketId)
  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to my tickets
        </Link>
        {ticket.isPending && (
          <p role="status" className="mt-8">
            Loading ticket...
          </p>
        )}
        {ticket.isError && (
          <div role="alert" className="mt-8 rounded-xl border border-red-200 bg-white p-6">
            <h1 className="text-xl font-semibold">Ticket unavailable</h1>
            <p className="mt-2 text-sm">{ticket.error.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void ticket.refetch()}
            >
              Try again
            </Button>
          </div>
        )}
        {ticket.data && (
          <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
            {ticket.data.eventId?.imageUrl && (
              <img
                src={ticket.data.eventId.imageUrl}
                alt=""
                className="aspect-[2.5] w-full object-cover"
              />
            )}
            <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_260px]">
              <div>
                <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-brand-dark">
                  {ticket.data.status.toUpperCase()} · GENERAL ADMISSION
                </span>
                <h1 className="mt-4 text-3xl font-semibold">
                  {ticket.data.eventId?.name ?? 'Event unavailable'}
                </h1>
                <p className="mt-3 text-stone-600">
                  {ticket.data.eventId?.startDate
                    ? eventDate(ticket.data.eventId.startDate)
                    : 'Date unavailable'}
                </p>
                <p className="mt-1 text-stone-600">
                  {ticket.data.eventId?.location?.city ?? 'Location unavailable'}
                </p>
                <div className="mt-7 border-t border-stone-200 pt-5">
                  <h2 className="font-semibold">Ticket {ticket.data.ticketNumber}</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Paid {formatPrice(ticket.data.pricePaid)} · Issued{' '}
                    {eventDate(ticket.data.issuedAt)}
                  </p>
                  {ticket.data.usedAt && (
                    <p className="mt-1 text-sm text-stone-600">
                      Checked in {eventDate(ticket.data.usedAt)}
                    </p>
                  )}
                </div>
              </div>
              <TicketQr ticket={ticket.data} />
            </div>
          </div>
        )}
      </main>
    </SiteShell>
  )
}
