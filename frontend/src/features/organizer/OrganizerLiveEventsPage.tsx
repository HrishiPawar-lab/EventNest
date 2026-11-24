import { useState } from 'react'
import { LuArrowLeft, LuCalendarDays, LuMapPin, LuPlus, LuTicket } from 'react-icons/lu'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { ApiRequestError } from '../../lib/api'
import { eventDate, formatPrice } from '../events/catalog'
import { useEventManagement, useOwnedEvent, useOwnedEvents, type OrganizerEvent } from './api'
import { OrganizerHeading, OrganizerShell } from './OrganizerShell'

function LoadError({
  error,
  retry,
  detail = false,
}: {
  error: Error
  retry: () => void
  detail?: boolean
}) {
  const forbidden = error instanceof ApiRequestError && error.status === 403
  const missing = error instanceof ApiRequestError && error.status === 404
  return (
    <section role="alert" className="rounded-xl border border-stone-200 bg-white p-7">
      <h2 className="text-lg font-semibold">
        {forbidden
          ? detail
            ? 'You cannot manage this event'
            : 'Organizer access required'
          : missing
            ? 'Event not found'
            : 'Could not load events'}
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        {forbidden
          ? detail
            ? 'Only the owner can access this event.'
            : 'This account does not have organizer permissions.'
          : missing
            ? 'The event may have been removed.'
            : 'Check your connection and try again.'}
      </p>
      {forbidden || missing ? (
        <Button asChild variant="outline" className="mt-4">
          <Link to={detail ? '/organizer/events' : '/become-organizer'}>
            {detail ? 'Back to events' : 'Organizer information'}
          </Link>
        </Button>
      ) : (
        <Button type="button" variant="outline" className="mt-4" onClick={retry}>
          Try again
        </Button>
      )}
    </section>
  )
}

function EventRow({ event }: { event: OrganizerEvent }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center">
      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt=""
          className="aspect-[1.8] w-full rounded-lg object-cover sm:h-24 sm:w-36"
        />
      ) : (
        <div className="flex aspect-[1.8] w-full items-center justify-center rounded-lg bg-stone-100 text-stone-500 sm:h-24 sm:w-36">
          <LuCalendarDays aria-hidden="true" className="size-7" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{event.name}</h2>
          <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-dark">
            {event.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {eventDate(event.startDate)} · {event.location.city} · {formatPrice(event.ticketPrice)}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to={`/organizer/events/${event._id}`}>Manage</Link>
      </Button>
    </article>
  )
}

export function OrganizerLiveEventsPage() {
  const [page, setPage] = useState(1)
  const events = useOwnedEvents(page)
  const pages = events.data
    ? Math.max(1, Math.ceil(events.data.pagination.total / events.data.pagination.limit))
    : 1
  return (
    <OrganizerShell preview={false}>
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <OrganizerHeading
          eyebrow="Your line-up"
          title="My events"
          description="Manage your real events, including drafts that guests cannot see."
          action={
            <Button asChild>
              <Link to="/organizer/events/new">
                <LuPlus aria-hidden="true" /> Create event
              </Link>
            </Button>
          }
        />
        {events.isPending && <p role="status">Loading your events...</p>}
        {events.isError && <LoadError error={events.error} retry={() => void events.refetch()} />}
        {events.isSuccess && events.data.data.length === 0 && (
          <div role="status" className="rounded-xl border border-stone-200 bg-white p-8">
            <h2 className="text-lg font-semibold">No events yet</h2>
            <p className="mt-2 text-sm text-stone-600">
              Create your first event using one of your venues.
            </p>
          </div>
        )}
        {events.isSuccess && events.data.data.length > 0 && (
          <>
            <div className="space-y-3">
              {events.data.data.map((event) => (
                <EventRow key={event._id} event={event} />
              ))}
            </div>
            {pages > 1 && (
              <nav aria-label="Event pages" className="mt-6 flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-stone-600">
                  Page {page} of {pages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page === pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        )}
      </main>
    </OrganizerShell>
  )
}

export function OrganizerLiveEventDetailPage() {
  const { eventId } = useParams()
  const event = useOwnedEvent(eventId)
  const management = useEventManagement()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const current = event.data
  return (
    <OrganizerShell preview={false}>
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
        <Link
          to="/organizer/events"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> My events
        </Link>
        {event.isPending && <p role="status">Loading event...</p>}
        {event.isError && (
          <LoadError error={event.error} retry={() => void event.refetch()} detail />
        )}
        {current && (
          <>
            <OrganizerHeading
              eyebrow={current.status}
              title={current.name}
              description={current.category || 'General admission event'}
              action={
                current.status === 'draft' ? (
                  <Button asChild variant="outline">
                    <Link to={`/organizer/events/${current._id}/edit`}>Edit draft</Link>
                  </Button>
                ) : undefined
              }
            />
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              {current.imageUrl && (
                <img
                  src={current.imageUrl}
                  alt=""
                  className="aspect-[1.8] w-full rounded-xl object-cover"
                />
              )}
              <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 text-sm">
                <p className="flex items-center gap-3">
                  <LuCalendarDays aria-hidden="true" className="text-brand" />{' '}
                  {eventDate(current.startDate)}
                </p>
                <p className="flex items-center gap-3">
                  <LuMapPin aria-hidden="true" className="text-brand" /> {current.location.city},{' '}
                  {current.location.country}
                </p>
                <p className="flex items-center gap-3">
                  <LuTicket aria-hidden="true" className="text-brand" />{' '}
                  {formatPrice(current.ticketPrice)} · General admission
                </p>
                <p className="border-t border-stone-100 pt-4 text-stone-600">
                  {current.ticketsSold} sold · {current.ticketsReserved} reserved ·{' '}
                  {current.maxAttendees} capacity
                </p>
              </section>
            </div>
            {current.description && (
              <p className="mt-6 rounded-xl border border-stone-200 bg-white p-6 text-sm leading-6 text-stone-700">
                {current.description}
              </p>
            )}
            {current.status === 'draft' && (
              <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
                <p className="text-sm text-stone-700">
                  Drafts are visible only to you. Publishing makes this event available to guests.
                </p>
                <Button
                  type="button"
                  className="mt-3"
                  disabled={management.publish.isPending}
                  onClick={() => management.publish.mutate(current._id)}
                >
                  {management.publish.isPending ? 'Publishing...' : 'Publish event'}
                </Button>
                {management.publish.isError && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {management.publish.error.message}
                  </p>
                )}
              </div>
            )}
            {management.publish.isSuccess && (
              <p role="status" className="mt-4 text-sm text-green-800">
                Event published.
              </p>
            )}
            {management.cancel.isSuccess && (
              <p role="status" className="mt-4 text-sm text-stone-700">
                Event cancelled.
              </p>
            )}
            {(current.status === 'draft' || current.status === 'published') && (
              <div className="mt-6 border-t border-stone-200 pt-5">
                {!confirmCancel ? (
                  <Button type="button" variant="outline" onClick={() => setConfirmCancel(true)}>
                    Cancel event
                  </Button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-white p-5">
                    <p className="text-sm text-stone-700">
                      Cancel this event? The backend will reject cancellation if it has booking or
                      payment activity.
                    </p>
                    <div className="mt-3 flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        disabled={management.cancel.isPending}
                        onClick={() =>
                          management.cancel.mutate(current._id, {
                            onSuccess: () => setConfirmCancel(false),
                          })
                        }
                      >
                        {management.cancel.isPending ? 'Cancelling...' : 'Confirm cancellation'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep event
                      </Button>
                    </div>
                  </div>
                )}
                {management.cancel.isError && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {management.cancel.error.message}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </OrganizerShell>
  )
}
