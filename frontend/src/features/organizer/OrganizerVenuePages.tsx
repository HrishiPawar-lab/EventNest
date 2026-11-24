import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuArrowRight, LuMapPin, LuPlus } from 'react-icons/lu'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { OrganizerHeading, OrganizerShell } from './OrganizerShell'

const venues = [
  {
    id: 'harbour-arena',
    name: 'Harbour Arena',
    type: 'Auditorium',
    city: 'Mumbai',
    capacity: 2800,
    image: '/images/concert.jpg',
  },
  {
    id: 'the-forum',
    name: 'The Forum',
    type: 'Auditorium',
    city: 'Bengaluru',
    capacity: 900,
    image: '/images/conference.jpg',
  },
  {
    id: 'old-mill-grounds',
    name: 'Old Mill Grounds',
    type: 'Outdoor',
    city: 'Delhi',
    capacity: 1600,
    image: '/images/food.jpg',
  },
]

export function VenueManagementPage() {
  return (
    <OrganizerShell>
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <OrganizerHeading
          eyebrow="Places to gather"
          title="Venue management"
          description="Create a place once, then use it for many events."
          action={
            <Button asChild>
              <Link to="/organizer/preview/venues/new">
                <LuPlus aria-hidden="true" /> Add venue
              </Link>
            </Button>
          }
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {venues.map((venue) => (
            <article
              key={venue.id}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white"
            >
              <img src={venue.image} alt="" className="aspect-[1.7] w-full object-cover" />
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-widest text-brand">
                  {venue.type}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{venue.name}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-stone-600">
                  <LuMapPin aria-hidden="true" /> {venue.city} ·{' '}
                  {venue.capacity.toLocaleString('en-IN')} capacity
                </p>
                <Button asChild variant="outline" size="sm" className="mt-5">
                  <Link to={`/organizer/preview/venues/${venue.id}/edit`}>
                    View venue <LuArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-6 text-xs text-stone-500">
          Venues shown here are examples. Live venue management is not connected.
        </p>
      </main>
    </OrganizerShell>
  )
}

const venueSchema = z.object({
  name: z.string().trim().min(3, 'Enter a venue name').max(100),
  type: z.enum(['bar', 'club', 'restaurant', 'auditorium', 'outdoor', 'other']),
  description: z.string().trim().min(20, 'Add at least 20 characters').max(1000),
  street: z.string().trim().min(3, 'Enter a street address'),
  city: z.string().trim().min(2, 'Enter a city'),
  state: z.string().trim().min(2, 'Enter a state'),
  postalCode: z.string().trim().min(4, 'Enter a postal code'),
  capacity: z.coerce.number<number>().int().min(1, 'Capacity must be at least one'),
})
type VenueValues = z.infer<typeof venueSchema>

export function VenueFormPage() {
  const { venueId } = useParams()
  const existing = venues.find((venue) => venue.id === venueId)
  const editing = Boolean(venueId)
  const [preview, setPreview] = useState<VenueValues | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VenueValues>({
    resolver: zodResolver(venueSchema),
    defaultValues: {
      name: existing?.name || '',
      type: (existing?.type.toLowerCase() as VenueValues['type']) || 'auditorium',
      description: '',
      street: '',
      city: existing?.city || '',
      state: '',
      postalCode: '',
      capacity: existing?.capacity || 100,
    },
  })
  return (
    <OrganizerShell>
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
        <OrganizerHeading
          eyebrow="Venue studio"
          title={editing ? 'Edit venue' : 'Create a venue'}
          description="Set the foundations for every event you host here."
        />
        {editing && !existing ? (
          <div role="alert" className="rounded-xl border border-stone-200 bg-white p-8">
            <h2 className="text-xl font-semibold">Venue not found</h2>
            <Button asChild className="mt-5">
              <Link to="/organizer/preview/venues">Back to venues</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(setPreview)}
            className="space-y-5 rounded-xl border border-stone-200 bg-white p-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium">Venue name</span>
                <Input {...register('name')} placeholder="e.g. Harbour Arena" />
                {errors.name && (
                  <span role="alert" className="text-xs text-red-700">
                    {errors.name.message}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Venue type</span>
                <select
                  {...register('type')}
                  className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                >
                  {venueSchema.shape.type.options.map((type) => (
                    <option key={type} value={type}>
                      {type[0].toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Capacity</span>
                <Input type="number" min="1" {...register('capacity')} />
                {errors.capacity && (
                  <span role="alert" className="text-xs text-red-700">
                    {errors.capacity.message}
                  </span>
                )}
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Description</span>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="What makes this venue special?"
                className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
              {errors.description && (
                <span role="alert" className="text-xs text-red-700">
                  {errors.description.message}
                </span>
              )}
            </label>
            <div className="grid gap-5 border-t border-stone-100 pt-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium">Street address</span>
                <Input {...register('street')} />
                {errors.street && (
                  <span role="alert" className="text-xs text-red-700">
                    {errors.street.message}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">City</span>
                <Input {...register('city')} />
                {errors.city && (
                  <span role="alert" className="text-xs text-red-700">
                    {errors.city.message}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">State</span>
                <Input {...register('state')} />
                {errors.state && (
                  <span role="alert" className="text-xs text-red-700">
                    {errors.state.message}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Postal code</span>
                <Input {...register('postalCode')} />
                {errors.postalCode && (
                  <span role="alert" className="text-xs text-red-700">
                    {errors.postalCode.message}
                  </span>
                )}
              </label>
            </div>
            <p className="text-xs text-stone-500">
              Country is India for this preview. A live venue form will also capture map coordinates
              and validate ownership on the backend.
            </p>
            <div className="border-t border-stone-100 pt-5">
              <Button type="submit">Preview venue details</Button>
              <span className="ml-3 text-xs text-stone-500">This form does not save a venue.</span>
            </div>
          </form>
        )}
        {preview && (
          <div role="status" className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-6">
            <p className="text-xs font-medium uppercase tracking-widest text-brand">
              Form preview · not saved
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{preview.name}</h2>
            <p className="mt-2 text-sm text-stone-600">
              {preview.city}, {preview.state} · {preview.capacity} places
            </p>
            <p className="mt-3 text-sm">{preview.description}</p>
          </div>
        )}
      </main>
    </OrganizerShell>
  )
}
