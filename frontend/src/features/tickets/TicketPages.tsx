import { LuArrowLeft, LuArrowRight, LuQrCode, LuTicket } from 'react-icons/lu'
import { Link, useParams } from 'react-router-dom'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { eventDate, sampleEvents } from '../events/catalog'

const example = sampleEvents[0]

export function MyTicketsPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">
          Your experiences
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">My tickets</h1>
        <p className="mt-3 text-stone-600">
          Your confirmed tickets will be here once live booking is available.
        </p>
        <div
          role="status"
          className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"
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
        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">
              How it will look
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Ticket preview</h2>
          </div>
          <div className="flex max-w-2xl flex-col overflow-hidden rounded-xl border border-stone-200 bg-white sm:flex-row">
            <img
              src={example.image}
              alt=""
              className="h-48 w-full object-cover sm:h-auto sm:w-48"
            />
            <div className="flex-1 p-5">
              <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-brand-dark">
                EXAMPLE · NOT VALID FOR ENTRY
              </span>
              <h3 className="mt-3 text-xl font-semibold">{example.title}</h3>
              <p className="mt-2 text-sm text-stone-600">
                {eventDate(example.date)} · {example.venue}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link to="/tickets/example">
                  See ticket preview <LuArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  )
}

export function TicketDetailsPage() {
  const { ticketId } = useParams()
  if (ticketId !== 'example')
    return (
      <SiteShell>
        <main className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-3xl font-semibold">Ticket not found</h1>
          <p className="mt-3 text-stone-600">
            There is no ticket with that reference in this preview.
          </p>
          <Button asChild className="mt-6">
            <Link to="/tickets">My tickets</Link>
          </Button>
        </main>
      </SiteShell>
    )
  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to my tickets
        </Link>
        <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <img src={example.image} alt="" className="aspect-[2.5] w-full object-cover" />
          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_260px]">
            <div>
              <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-brand-dark">
                EXAMPLE · NOT VALID FOR ENTRY
              </span>
              <h1 className="mt-4 text-3xl font-semibold">{example.title}</h1>
              <p className="mt-3 text-stone-600">
                {eventDate(example.date)} · {example.time}
              </p>
              <p className="mt-1 text-stone-600">
                {example.venue}, {example.city}
              </p>
              <div className="mt-7 border-t border-stone-200 pt-5">
                <h2 className="font-semibold">General admission</h2>
                <p className="mt-1 text-sm text-stone-600">
                  A real ticket will show its unique ticket number and entry details here.
                </p>
              </div>
            </div>
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-paper p-5 text-center">
              <LuQrCode aria-hidden="true" className="size-14 text-stone-400" />
              <h2 className="mt-4 text-sm font-medium">QR credential unavailable</h2>
              <p className="mt-2 text-xs leading-5 text-stone-600">
                A secure, unique QR appears only after verified payment and ticket issuance. This
                preview cannot be scanned.
              </p>
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
