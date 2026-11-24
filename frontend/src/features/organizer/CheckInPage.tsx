import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LuShieldCheck } from 'react-icons/lu'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { eventDate } from '../events/catalog'
import { useCheckIn, useOrganizerEvents } from './api'
import { OrganizerHeading, OrganizerShell } from './OrganizerShell'

const scanSchema = z.object({
  token: z.string().trim().min(20, 'Enter a complete QR credential').max(512),
})
type ScanValues = z.infer<typeof scanSchema>

export function CheckInPage() {
  const events = useOrganizerEvents()
  const checkIn = useCheckIn()
  const [selectedEvent, setSelectedEvent] = useState('')
  const eventId = selectedEvent || events.data?.data[0]?._id || ''
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScanValues>({ resolver: zodResolver(scanSchema), defaultValues: { token: '' } })

  const submit = handleSubmit(({ token }) => {
    if (!eventId) return
    checkIn.mutate({ eventId, token }, { onSuccess: () => reset() })
  })

  return (
    <OrganizerShell preview={false}>
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
        <OrganizerHeading
          eyebrow="At the door"
          title="QR check-in"
          description="Validate each entry against the live ticket record."
        />
        {events.isPending && <p role="status">Loading your published events...</p>}
        {events.isError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-white p-6">
            <p>{events.error.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => void events.refetch()}
            >
              Try again
            </Button>
          </div>
        )}
        {events.isSuccess && events.data.data.length === 0 && (
          <div role="status" className="rounded-xl border border-stone-200 bg-white p-8">
            Publish an event before checking in guests.
          </div>
        )}
        {events.isSuccess && events.data.data.length > 0 && (
          <div className="grid gap-6 md:grid-cols-[1fr_0.8fr]">
            <section className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="text-xl font-semibold">Scan a ticket</h2>
              <p className="mt-2 text-sm text-stone-600">
                Choose your event, then scan with a keyboard-style QR reader or paste the ticket
                credential. The server decides if entry is valid.
              </p>
              <label className="mt-6 block text-sm font-medium" htmlFor="checkin-event">
                Event
              </label>
              <select
                id="checkin-event"
                value={eventId}
                onChange={(event) => setSelectedEvent(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
              >
                {events.data.data.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.name} · {eventDate(event.startDate)}
                  </option>
                ))}
              </select>
              <form onSubmit={(event) => void submit(event)} className="mt-6">
                <label htmlFor="checkin-token" className="text-sm font-medium">
                  QR credential
                </label>
                <input
                  id="checkin-token"
                  {...register('token')}
                  autoComplete="off"
                  className="mt-2 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm"
                  placeholder="Paste or scan the credential"
                />
                {errors.token && (
                  <p role="alert" className="mt-1 text-xs text-red-700">
                    {errors.token.message}
                  </p>
                )}
                <Button type="submit" disabled={checkIn.isPending} className="mt-4 w-full">
                  {checkIn.isPending ? 'Checking...' : 'Validate and check in'}
                </Button>
              </form>
            </section>
            <section className="h-fit rounded-xl border border-orange-200 bg-orange-50 p-6">
              <LuShieldCheck aria-hidden="true" className="size-7 text-brand" />
              <h2 className="mt-4 text-xl font-semibold">Verified entry</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                The backend checks event ownership, the entry window, ticket status, and the QR
                credential. A duplicate scan cannot admit the same ticket twice.
              </p>
              {checkIn.isSuccess && (
                <p role="status" className="mt-5 rounded-lg bg-white p-4 text-sm text-green-800">
                  Check-in complete for ticket {checkIn.data.ticketId}.
                </p>
              )}
              {checkIn.isError && (
                <p role="alert" className="mt-5 rounded-lg bg-white p-4 text-sm text-red-700">
                  {checkIn.error.message}
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </OrganizerShell>
  )
}
