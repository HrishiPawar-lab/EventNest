import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuSearch, LuSlidersHorizontal, LuX } from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { categories } from './catalog'
import { useEvents } from './api'
import { EventCard } from './EventCard'

const searchSchema = z.object({ query: z.string().trim().max(100) })
type SearchValues = z.infer<typeof searchSchema>

export function ExplorePage({ searchResults = false }: { searchResults?: boolean }) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const query = params.get('q')?.trim() || ''
  const category = params.get('category') || ''
  const city = params.get('city') || ''
  const maxPrice = params.get('maxPrice') || ''
  const sort = params.get('sort') === 'price' ? 'price' : 'date'
  const requestedPage = Number(params.get('page') || '1')
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const events = useEvents({
    page,
    q: query || undefined,
    category: category || undefined,
    city: city || undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sort,
  })
  const visible = events.data?.data ?? []
  const { register, handleSubmit, reset } = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { query },
  })
  useEffect(() => reset({ query }), [query, reset])

  function update(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.delete('page')
    setParams(next)
  }

  return (
    <SiteShell>
      <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand">
            Find your next moment
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {searchResults ? 'Search results' : 'Explore events'}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-stone-600">
            Discover live music, food, sport, ideas and more across the city.
          </p>
        </div>
        <form
          role="search"
          onSubmit={handleSubmit(({ query: value }) => update('q', value))}
          className="mb-5 flex max-w-2xl items-center gap-2 rounded-lg border border-stone-300 bg-white p-1 focus-within:ring-2 focus-within:ring-brand"
        >
          <LuSearch aria-hidden="true" className="ml-3 size-5 text-stone-500" />
          <input
            {...register('query')}
            aria-label="Search events"
            placeholder="Search event name or description"
            maxLength={100}
            className="min-w-0 flex-1 px-2 py-2 text-[15px] outline-none"
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
        <div aria-label="Browse categories" className="mb-6 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => update('category', '')}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${!category ? 'border-brand bg-orange-50 text-brand-dark' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}
          >
            All events
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => update('category', item)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${category === item ? 'border-brand bg-orange-50 text-brand-dark' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="event-filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="mb-4 flex w-full items-center justify-between rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium lg:hidden"
        >
          <span className="flex items-center gap-2">
            <LuSlidersHorizontal aria-hidden="true" /> Filters
          </span>
          <span className="text-brand">{filtersOpen ? 'Hide' : 'Show'}</span>
        </button>
        <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside
            id="event-filters"
            className={`h-fit rounded-xl border border-stone-200 bg-white p-4 lg:sticky lg:top-20 ${filtersOpen ? '' : 'hidden lg:block'}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <LuSlidersHorizontal aria-hidden="true" /> Filters
              </h2>
              <button
                type="button"
                onClick={() => setParams(query ? { q: query } : {})}
                className="text-sm font-medium text-brand hover:underline"
              >
                Clear all
              </button>
            </div>
            <fieldset className="mt-6 border-t border-stone-100 pt-5">
              <legend className="text-[15px] font-medium">Event type</legend>
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  <input
                    type="radio"
                    name="category"
                    checked={!category}
                    onChange={() => update('category', '')}
                    className="accent-brand"
                  />{' '}
                  All events
                </label>
                {categories.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm text-stone-600">
                    <input
                      type="radio"
                      name="category"
                      checked={category === item}
                      onChange={() => update('category', item)}
                      className="accent-brand"
                    />{' '}
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-6 border-t border-stone-100 pt-5">
              <label htmlFor="city-filter" className="text-[15px] font-medium">
                Location
              </label>
              <input
                id="city-filter"
                key={city}
                defaultValue={city}
                placeholder="Any city"
                maxLength={100}
                onBlur={(event) => {
                  if (event.target.value.trim() !== city) update('city', event.target.value.trim())
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
                className="mt-3 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
              />
            </div>
            <div className="mt-6 border-t border-stone-100 pt-5">
              <label htmlFor="price-filter" className="text-[15px] font-medium">
                Maximum price
              </label>
              <select
                id="price-filter"
                value={maxPrice}
                onChange={(event) => update('maxPrice', event.target.value)}
                className="mt-3 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
              >
                <option value="">Any price</option>
                <option value="500">Up to ₹500</option>
                <option value="1000">Up to ₹1,000</option>
                <option value="2000">Up to ₹2,000</option>
                <option value="5000">Up to ₹5,000</option>
                <option value="10000">Up to ₹10,000</option>
              </select>
            </div>
          </aside>
          <div>
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm text-stone-600">
                <span className="font-semibold text-ink">{events.data?.pagination.total ?? 0}</span>{' '}
                {events.data?.pagination.total === 1 ? 'event' : 'events'} found{' '}
                {query && (
                  <>
                    for <span className="font-semibold">“{query}”</span>
                  </>
                )}
              </p>
              <label className="flex shrink-0 items-center gap-2 text-sm text-stone-600">
                Sort by
                <select
                  value={sort}
                  onChange={(event) => update('sort', event.target.value)}
                  className="h-9 rounded-lg border border-stone-300 bg-white px-2.5 text-sm font-medium text-ink"
                >
                  <option value="date">Soonest</option>
                  <option value="price">Lowest price</option>
                </select>
              </label>
            </div>
            {events.isPending && (
              <p role="status" className="py-12 text-stone-600">
                Loading events...
              </p>
            )}
            {events.isError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-white p-6">
                <p>Events could not be loaded. {events.error.message}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => events.refetch()}
                >
                  Try again
                </Button>
              </div>
            )}
            {events.isSuccess && visible.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : events.isSuccess ? (
              <div
                role="status"
                className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"
              >
                <LuSearch aria-hidden="true" className="mx-auto size-8 text-stone-400" />
                <h2 className="mt-4 text-xl font-semibold">No events match those filters</h2>
                <p className="mt-2 text-sm text-stone-600">
                  Try another city, category, or price range.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  onClick={() => setParams({})}
                >
                  Clear filters <LuX aria-hidden="true" />
                </Button>
              </div>
            ) : null}
            {events.isSuccess && events.data.pagination.total > events.data.pagination.limit && (
              <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => update('page', String(page - 1))}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of{' '}
                  {Math.ceil(events.data.pagination.total / events.data.pagination.limit)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page * events.data.pagination.limit >= events.data.pagination.total}
                  onClick={() => update('page', String(page + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
