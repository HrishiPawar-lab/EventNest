import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  LuArrowRight,
  LuCalendarDays,
  LuEye,
  LuMapPin,
  LuPencil,
  LuPlus,
  LuTicket,
} from 'react-icons/lu'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { eventById, eventDate, formatPrice, sampleEvents } from '../events/catalog'
import { OrganizerHeading, OrganizerShell } from './OrganizerShell'

export function OrganizerEventsPage() {
  return (
    <OrganizerShell>
      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8">
        <OrganizerHeading
          eyebrow="Your line-up"
          title="My events"
          description="Plan, publish and manage every gathering from one place."
          action={
            <Button asChild>
              <Link to="/organizer/preview/events/new">
                <LuPlus aria-hidden="true" /> Create event
              </Link>
            </Button>
          }
        />
        <div className="space-y-4">
          {sampleEvents.slice(0, 4).map((event, index) => (
            <article
              key={event.id}
              className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"
            >
              <img
                src={event.image}
                alt=""
                className="aspect-[1.8] w-full rounded-lg object-cover sm:size-24"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-lg font-bold">{event.title}</h2>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${index === 0 ? 'bg-orange-100 text-brand-dark' : 'bg-stone-100 text-stone-600'}`}
                  >
                    {index === 0 ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  {eventDate(event.date)} · {event.venue}, {event.city}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/organizer/preview/events/${event.id}`}>Manage</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link
                    to={`/organizer/preview/events/${event.id}/edit`}
                    aria-label={`Edit ${event.title}`}
                  >
                    <LuPencil aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-6 text-xs text-stone-500">
          Example events are shown for layout preview. No event records are loaded or changed.
        </p>
      </main>
    </OrganizerShell>
  )
}

const eventSchema = z.object({
  title: z.string().trim().min(3, 'Enter an event title').max(100),
  description: z.string().trim().min(20, 'Add at least 20 characters').max(2000),
  venue: z.string().min(1, 'Choose a venue'),
  date: z.string().min(1, 'Choose a date'),
  time: z.string().min(1, 'Choose a time'),
  price: z.coerce.number<number>().min(0, 'Price cannot be negative'),
  capacity: z.coerce.number<number>().int().min(1, 'Capacity must be at least one'),
})
type EventValues = z.infer<typeof eventSchema>

export function EventFormPage() {
  const { eventId } = useParams()
  const existing = eventById(eventId)
  const editing = Boolean(eventId)
  const [preview, setPreview] = useState<EventValues | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: existing?.title || '',
      description: existing?.description || '',
      venue: existing?.venue || '',
      date: existing?.date || '',
      time: '19:00',
      price: existing?.price || 0,
      capacity: 100,
    },
  })
  return (
    <OrganizerShell>
      <main className="mx-auto max-w-4xl px-5 py-9 sm:px-8">
        <OrganizerHeading
          eyebrow="Event studio"
          title={editing ? 'Edit event' : 'Create an event'}
          description="Shape the details people need before they decide to join you."
        />
        {editing && !existing ? (
          <div role="alert" className="rounded-xl border border-stone-200 bg-white p-8">
            <h2 className="text-xl font-bold">Event not found</h2>
            <Button asChild className="mt-5">
              <Link to="/organizer/preview/events">Back to events</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(setPreview)}
            className="space-y-6 rounded-xl border border-stone-200 bg-white p-6"
          >
            <section>
              <h2 className="text-lg font-bold">The essentials</h2>
              <div className="mt-5 space-y-5">
                <Field label="Event title" error={errors.title?.message}>
                  <Input {...register('title')} placeholder="Give your event a memorable name" />
                </Field>
                <Field label="Description" error={errors.description?.message}>
                  <textarea
                    {...register('description')}
                    rows={5}
                    placeholder="What will guests experience?"
                    className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </Field>
              </div>
            </section>
            <section className="border-t border-stone-100 pt-6">
              <h2 className="text-lg font-bold">When and where</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Venue" error={errors.venue?.message}>
                  <select
                    {...register('venue')}
                    className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                  >
                    <option value="">Select a venue</option>
                    <option>The Forum</option>
                    <option>Harbour Arena</option>
                    <option>Old Mill Grounds</option>
                  </select>
                </Field>
                <Field label="Date" error={errors.date?.message}>
                  <Input type="date" {...register('date')} />
                </Field>
                <Field label="Start time" error={errors.time?.message}>
                  <Input type="time" {...register('time')} />
                </Field>
              </div>
            </section>
            <section className="border-t border-stone-100 pt-6">
              <h2 className="text-lg font-bold">One ticket, one price</h2>
              <p className="mt-1 text-sm text-stone-500">
                EventNest v1 supports general admission with a single price.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Ticket price (₹)" error={errors.price?.message}>
                  <Input type="number" min="0" {...register('price')} />
                </Field>
                <Field label="Capacity" error={errors.capacity?.message}>
                  <Input type="number" min="1" {...register('capacity')} />
                </Field>
              </div>
            </section>
            <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-6">
              <Button type="submit">
                <LuEye aria-hidden="true" /> Preview event details
              </Button>
              <span className="text-xs text-stone-500">
                This form does not publish or save an event.
              </span>
            </div>
          </form>
        )}
        {preview && (
          <div role="status" className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              Form preview · not saved
            </p>
            <h2 className="mt-2 text-2xl font-black">{preview.title}</h2>
            <p className="mt-2 text-sm text-stone-600">
              {preview.date} · {preview.venue} · {formatPrice(preview.price)} · {preview.capacity}{' '}
              places
            </p>
            <p className="mt-3 text-sm text-stone-700">{preview.description}</p>
          </div>
        )}
      </main>
    </OrganizerShell>
  )
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
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  )
}

export function EventManagementPage() {
  const { eventId } = useParams()
  const event = eventById(eventId)
  if (!event)
    return (
      <OrganizerShell>
        <main className="mx-auto max-w-4xl px-5 py-16">
          <h1 className="text-3xl font-black">Event not found</h1>
          <Button asChild className="mt-6">
            <Link to="/organizer/preview/events">My events</Link>
          </Button>
        </main>
      </OrganizerShell>
    )
  return (
    <OrganizerShell>
      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8">
        <OrganizerHeading
          eyebrow="Manage event"
          title={event.title}
          description="Keep the event details and guest experience in view."
          action={
            <Button asChild variant="outline">
              <Link to={`/organizer/preview/events/${event.id}/edit`}>
                <LuPencil aria-hidden="true" /> Edit preview
              </Link>
            </Button>
          }
        />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <img src={event.image} alt="" className="aspect-[1.8] w-full rounded-xl object-cover" />
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-bold text-brand-dark">
              Example event
            </span>
            <div className="mt-5 space-y-4 text-sm">
              <p className="flex gap-3">
                <LuCalendarDays aria-hidden="true" className="text-brand" /> {eventDate(event.date)}{' '}
                · {event.time}
              </p>
              <p className="flex gap-3">
                <LuMapPin aria-hidden="true" className="text-brand" /> {event.venue}, {event.city}
              </p>
              <p className="flex gap-3">
                <LuTicket aria-hidden="true" className="text-brand" /> {formatPrice(event.price)} ·
                General admission
              </p>
            </div>
            <p className="mt-6 border-t border-stone-100 pt-5 text-sm text-stone-600">
              {event.description}
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Bookings', value: 'Not connected', to: '/organizer/preview/attendees' },
            { label: 'Check-in', value: 'Not connected', to: '/organizer/preview/check-in' },
            { label: 'Sales', value: 'Illustrative', to: '/organizer/preview/analytics' },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-xl border border-stone-200 bg-white p-5 hover:border-brand"
            >
              <p className="text-sm text-stone-500">{item.label}</p>
              <p className="mt-2 font-bold">{item.value}</p>
              <LuArrowRight aria-hidden="true" className="mt-4 text-brand" />
            </Link>
          ))}
        </div>
      </main>
    </OrganizerShell>
  )
}
