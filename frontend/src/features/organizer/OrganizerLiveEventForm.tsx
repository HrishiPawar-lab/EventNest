import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuArrowLeft } from 'react-icons/lu'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  useEventManagement,
  useOwnedEvent,
  useOwnedVenues,
  type EventInput,
  type OrganizerEvent,
} from './api'
import { OrganizerHeading, OrganizerShell } from './OrganizerShell'

const eventSchema = z
  .object({
    venueId: z.string().regex(/^[a-f\d]{24}$/i, 'Choose a venue'),
    name: z.string().trim().min(3, 'Enter at least three characters').max(100),
    description: z.string().trim().max(5000),
    category: z.string().trim().max(100),
    startDate: z.string().min(1, 'Choose a start time'),
    endDate: z.string().min(1, 'Choose an end time'),
    ticketPrice: z
      .string()
      .regex(/^\d+(?:\.\d{1,2})?$/, 'Enter a price in rupees, up to two decimal places'),
    maxAttendees: z.string().regex(/^[1-9]\d*$/, 'Enter a positive whole number'),
  })
  .refine((value) => new Date(value.endDate).getTime() > new Date(value.startDate).getTime(), {
    path: ['endDate'],
    message: 'End time must be after start time',
  })

type EventValues = z.infer<typeof eventSchema>

function localDateTime(iso: string) {
  const date = new Date(iso)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function eventValues(event: OrganizerEvent): EventValues {
  return {
    venueId: event.venueId,
    name: event.name,
    description: event.description ?? '',
    category: event.category ?? '',
    startDate: localDateTime(event.startDate),
    endDate: localDateTime(event.endDate),
    ticketPrice: String(event.ticketPrice),
    maxAttendees: String(event.maxAttendees),
  }
}

const defaults: EventValues = {
  venueId: '',
  name: '',
  description: '',
  category: '',
  startDate: '',
  endDate: '',
  ticketPrice: '',
  maxAttendees: '',
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  )
}

export function OrganizerLiveEventForm() {
  const { eventId } = useParams()
  const editing = Boolean(eventId)
  const event = useOwnedEvent(eventId)
  const venues = useOwnedVenues()
  const management = useEventManagement()
  const navigate = useNavigate()
  const [cover, setCover] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (event.data) reset(eventValues(event.data))
  }, [event.data, reset])

  async function submit(values: EventValues) {
    setError('')
    const selectedVenue = venues.data?.data.find((venue) => venue._id === values.venueId)
    if (!selectedVenue) {
      setError('Select one of your venues.')
      return
    }
    if (Number(values.maxAttendees) > selectedVenue.capacity) {
      setError('Event capacity cannot exceed venue capacity.')
      return
    }
    const input: EventInput = {
      venueId: values.venueId,
      name: values.name,
      description: values.description,
      category: values.category,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      maxAttendees: Number(values.maxAttendees),
      ticketPrice: Number(values.ticketPrice),
    }
    let saved: OrganizerEvent
    const targetId = eventId ?? savedId
    try {
      saved = targetId
        ? await management.update.mutateAsync({ id: targetId, input })
        : await management.create.mutateAsync(input)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save the event.')
      return
    }
    if (cover) {
      try {
        await management.uploadCover.mutateAsync({ id: saved._id, file: cover })
      } catch (failure) {
        setSavedId(saved._id)
        setError(
          `Event details were saved, but the cover upload failed: ${failure instanceof Error ? failure.message : 'Please try again.'}`,
        )
        return
      }
    }
    navigate(`/organizer/events/${saved._id}`)
  }

  const locked = Boolean(editing && event.data && event.data.status !== 'draft')
  return (
    <OrganizerShell preview={false}>
      <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-8">
        <Link
          to={eventId ? `/organizer/events/${eventId}` : '/organizer/events'}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to events
        </Link>
        <OrganizerHeading
          eyebrow="Event studio"
          title={editing ? 'Edit event' : 'Create an event'}
          description="Create a draft at one of your venues. Review it before publishing."
        />
        {editing && event.isPending && <p role="status">Loading event...</p>}
        {editing && event.isError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-white p-6">
            {event.error.message}
          </p>
        )}
        {locked && (
          <p role="alert" className="rounded-xl border border-orange-200 bg-orange-50 p-6">
            Only draft events can be edited under the current event policy.
          </p>
        )}
        {venues.isPending && <p role="status">Loading your venues...</p>}
        {venues.isError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-white p-6">
            Could not load your venues.{' '}
            <Button type="button" variant="outline" onClick={() => void venues.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {venues.isSuccess && venues.data.data.length === 0 && (
          <p role="status" className="rounded-xl border border-stone-200 bg-white p-6">
            You need an organizer-owned venue before creating an event. Venue creation is not yet
            connected in this app.
          </p>
        )}
        {venues.isSuccess &&
          venues.data.data.length > 0 &&
          !locked &&
          (!editing || event.isSuccess) && (
            <form
              onSubmit={handleSubmit(submit)}
              className="space-y-6 rounded-xl border border-stone-200 bg-white p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Event name" error={errors.name?.message}>
                    <Input {...register('name')} placeholder="Name your event" />
                  </Field>
                </div>
                <Field label="Venue" error={errors.venueId?.message}>
                  <select
                    {...register('venueId')}
                    className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                  >
                    <option value="">Select a venue</option>
                    {venues.data.data.map((venue) => (
                      <option key={venue._id} value={venue._id}>
                        {venue.name} · {venue.address.city} · {venue.capacity} capacity
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category" error={errors.category?.message}>
                  <Input {...register('category')} placeholder="e.g. Music" />
                </Field>
                <Field label="Starts (your local time)" error={errors.startDate?.message}>
                  <Input type="datetime-local" {...register('startDate')} />
                </Field>
                <Field label="Ends (your local time)" error={errors.endDate?.message}>
                  <Input type="datetime-local" {...register('endDate')} />
                </Field>
                <Field label="Ticket price (₹)" error={errors.ticketPrice?.message}>
                  <Input type="number" min="0" step="0.01" {...register('ticketPrice')} />
                </Field>
                <Field label="Capacity" error={errors.maxAttendees?.message}>
                  <Input type="number" min="1" step="1" {...register('maxAttendees')} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description" error={errors.description?.message}>
                    <textarea
                      {...register('description')}
                      rows={5}
                      className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Cover image (optional)">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(change) => {
                        const file = change.target.files?.[0] ?? null
                        if (
                          file &&
                          (file.size > 5 * 1024 * 1024 ||
                            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
                        ) {
                          setCover(null)
                          setError('Choose a JPEG, PNG, or WebP image under 5 MB.')
                          change.target.value = ''
                          return
                        }
                        setError('')
                        setCover(file)
                      }}
                    />
                  </Field>
                </div>
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                  {savedId && (
                    <>
                      {' '}
                      <Link className="underline" to={`/organizer/events/${savedId}`}>
                        View saved event
                      </Link>
                    </>
                  )}
                </p>
              )}
              <div className="flex items-center gap-3 border-t border-stone-100 pt-5">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editing || savedId ? 'Save draft' : 'Create draft'}
                </Button>
                <span className="text-xs text-stone-500">Only you can see a draft.</span>
              </div>
            </form>
          )}
      </main>
    </OrganizerShell>
  )
}
