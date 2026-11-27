import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuArrowLeft, LuMapPin, LuPlus } from 'react-icons/lu'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { ApiRequestError } from '../../lib/api'
import {
  useOwnedVenue,
  useOwnedVenues,
  useVenueManagement,
  type OrganizerVenue,
  type VenueInput,
} from './api'
import { OrganizerHeading, OrganizerShell } from './OrganizerShell'

const venueSchema = z.object({
  name: z.string().trim().min(3, 'Enter at least three characters').max(100),
  type: z.enum(['bar', 'club', 'restaurant', 'auditorium', 'outdoor', 'other']),
  description: z.string().trim().max(5000),
  capacity: z.string().regex(/^[1-9]\d*$/, 'Enter a positive whole number'),
  street: z.string().trim(),
  city: z.string().trim().min(1, 'Enter a city'),
  state: z.string().trim(),
  country: z.string().trim().min(1, 'Enter a country'),
  postalCode: z.string().trim(),
  longitude: z
    .string()
    .trim()
    .min(1, 'Enter a longitude')
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) >= -180 && Number(value) <= 180,
      'Longitude must be between -180 and 180',
    ),
  latitude: z
    .string()
    .trim()
    .min(1, 'Enter a latitude')
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) >= -90 && Number(value) <= 90,
      'Latitude must be between -90 and 90',
    ),
})
type VenueValues = z.infer<typeof venueSchema>

const defaults: VenueValues = {
  name: '',
  type: 'other',
  description: '',
  capacity: '',
  street: '',
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  longitude: '',
  latitude: '',
}

function valuesFromVenue(venue: OrganizerVenue): VenueValues {
  return {
    name: venue.name,
    type: venue.type,
    description: venue.description ?? '',
    capacity: String(venue.capacity),
    street: venue.address.street ?? '',
    city: venue.address.city,
    state: venue.address.state ?? '',
    country: venue.address.country,
    postalCode: venue.address.postalCode ?? '',
    longitude: String(venue.location.coordinates[0]),
    latitude: String(venue.location.coordinates[1]),
  }
}

function FormField({
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
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  )
}

export function OrganizerLiveVenuesPage() {
  const venues = useOwnedVenues()
  const management = useVenueManagement()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function remove(id: string) {
    setError('')
    try {
      await management.remove.mutateAsync(id)
      setDeletingId(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not remove the venue.')
    }
  }

  return (
    <OrganizerShell preview={false}>
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <OrganizerHeading
          eyebrow="Your places"
          title="Venues"
          description="Create and manage the places you use for events."
          action={
            <Button asChild>
              <Link to="/organizer/venues/new">
                <LuPlus aria-hidden="true" /> Create venue
              </Link>
            </Button>
          }
        />
        {venues.isPending && <p role="status">Loading your venues...</p>}
        {venues.isError && (
          <div role="alert" className="rounded-xl border border-stone-200 bg-white p-6">
            <p>{venues.error.message}</p>
            {venues.error instanceof ApiRequestError && venues.error.status === 403 ? (
              <Button asChild className="mt-4">
                <Link to="/become-organizer">Become an organizer</Link>
              </Button>
            ) : (
              <Button variant="outline" className="mt-4" onClick={() => void venues.refetch()}>
                Try again
              </Button>
            )}
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {venues.isSuccess && venues.data.data.length === 0 && (
          <div role="status" className="rounded-xl border border-stone-200 bg-white p-8">
            <h2 className="text-lg font-semibold">No venues yet</h2>
            <p className="mt-2 text-sm text-stone-600">Create a venue before you plan an event.</p>
            <Button asChild className="mt-4">
              <Link to="/organizer/venues/new">Create your first venue</Link>
            </Button>
          </div>
        )}
        {venues.isSuccess && venues.data.data.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {venues.data.data.map((venue) => (
              <article key={venue._id} className="rounded-xl border border-stone-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-brand">
                  {venue.type}
                </p>
                <h2 className="mt-2 text-lg font-semibold">{venue.name}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-stone-600">
                  <LuMapPin aria-hidden="true" className="size-4" /> {venue.address.city},{' '}
                  {venue.address.country}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Capacity {venue.capacity.toLocaleString()}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/organizer/venues/${venue._id}/edit`}>Edit venue</Link>
                  </Button>
                  {deletingId === venue._id ? (
                    <>
                      <Button
                        size="sm"
                        disabled={management.remove.isPending}
                        onClick={() => void remove(venue._id)}
                      >
                        Confirm delete
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeletingId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setDeletingId(venue._id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </OrganizerShell>
  )
}

export function OrganizerLiveVenueForm() {
  const { venueId } = useParams()
  const venue = useOwnedVenue(venueId)
  const management = useVenueManagement()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VenueValues>({ resolver: zodResolver(venueSchema), defaultValues: defaults })

  useEffect(() => {
    if (venue.data) reset(valuesFromVenue(venue.data))
  }, [venue.data, reset])

  async function submit(values: VenueValues) {
    setError('')
    const input: VenueInput = {
      name: values.name,
      type: values.type,
      description: values.description,
      capacity: Number(values.capacity),
      address: {
        street: values.street,
        city: values.city,
        state: values.state,
        country: values.country,
        postalCode: values.postalCode,
      },
      location: { type: 'Point', coordinates: [Number(values.longitude), Number(values.latitude)] },
    }
    try {
      await (venueId
        ? management.update.mutateAsync({ id: venueId, input })
        : management.create.mutateAsync(input))
      navigate('/organizer/venues')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save the venue.')
    }
  }

  return (
    <OrganizerShell preview={false}>
      <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-8">
        <Link
          to="/organizer/venues"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to venues
        </Link>
        <OrganizerHeading
          eyebrow="Venue studio"
          title={venueId ? 'Edit venue' : 'Create a venue'}
          description="Add the location and capacity guests will see on your events."
        />
        {venueId && venue.isPending && <p role="status">Loading venue...</p>}
        {venueId && venue.isError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-white p-6">
            {venue.error.message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {(!venueId || venue.isSuccess) && (
          <form
            onSubmit={handleSubmit(submit)}
            className="space-y-5 rounded-xl border border-stone-200 bg-white p-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Venue name" error={errors.name?.message}>
                <Input {...register('name')} />
              </FormField>
              <FormField label="Venue type" error={errors.type?.message}>
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
              </FormField>
              <FormField label="Capacity" error={errors.capacity?.message}>
                <Input type="number" min="1" {...register('capacity')} />
              </FormField>
              <FormField label="Street address" error={errors.street?.message}>
                <Input {...register('street')} />
              </FormField>
              <FormField label="City" error={errors.city?.message}>
                <Input {...register('city')} />
              </FormField>
              <FormField label="State" error={errors.state?.message}>
                <Input {...register('state')} />
              </FormField>
              <FormField label="Country" error={errors.country?.message}>
                <Input {...register('country')} />
              </FormField>
              <FormField label="Postal code" error={errors.postalCode?.message}>
                <Input {...register('postalCode')} />
              </FormField>
              <FormField label="Longitude" error={errors.longitude?.message}>
                <Input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  placeholder="72.8777"
                  {...register('longitude')}
                />
              </FormField>
              <FormField label="Latitude" error={errors.latitude?.message}>
                <Input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  placeholder="19.0760"
                  {...register('latitude')}
                />
              </FormField>
            </div>
            <p className="text-xs text-stone-500">
              Use the venue’s map coordinates in longitude, latitude order. These coordinates place
              the venue on event maps.
            </p>
            <FormField label="Description" error={errors.description?.message}>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </FormField>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : venueId ? 'Save changes' : 'Create venue'}
            </Button>
          </form>
        )}
      </main>
    </OrganizerShell>
  )
}
