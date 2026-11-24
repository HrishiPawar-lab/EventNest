import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuSearch, LuSlidersHorizontal, LuX } from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { categories, sampleEvents } from './catalog'
import { EventCard } from './EventCard'

const searchSchema = z.object({ query: z.string().trim().max(100) })
type SearchValues = z.infer<typeof searchSchema>

export function ExplorePage({ searchResults = false }: { searchResults?: boolean }) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const query = params.get('q')?.trim() || ''
  const category = params.get('category') || ''
  const city = params.get('city') || ''
  const requestedPrice = Number(params.get('maxPrice') || '5000')
  const maxPrice = Number.isFinite(requestedPrice)
    ? Math.min(5000, Math.max(0, requestedPrice))
    : 5000
  const sort = params.get('sort') || 'date'
  const { register, handleSubmit } = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { query },
  })

  function update(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next)
  }

  const visible = sampleEvents
    .filter(
      (event) =>
        !query ||
        `${event.title} ${event.category} ${event.city} ${event.venue}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .filter((event) => !category || event.category === category)
    .filter((event) => !city || event.city === city)
    .filter((event) => event.price <= maxPrice)
    .sort((a, b) => (sort === 'price' ? a.price - b.price : a.date.localeCompare(b.date)))
  const cities = [...new Set(sampleEvents.map((event) => event.city))]

  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
            Find your next moment
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {searchResults ? 'Search results' : 'Explore events'}
          </h1>
          <p className="mt-3 max-w-xl text-stone-600">
            Discover live music, food, sport, ideas and more across the city.
          </p>
        </div>
        <form
          role="search"
          onSubmit={handleSubmit(({ query: value }) => update('q', value))}
          className="mb-8 flex max-w-2xl items-center gap-2 rounded-lg border border-stone-300 bg-white p-1.5 focus-within:ring-2 focus-within:ring-brand"
        >
          <LuSearch aria-hidden="true" className="ml-3 size-5 text-stone-500" />
          <input
            {...register('query')}
            aria-label="Search events"
            placeholder="Search by event, venue or city"
            maxLength={100}
            className="min-w-0 flex-1 px-2 py-2 text-[15px] outline-none"
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="event-filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="mb-5 flex w-full items-center justify-between rounded-lg border border-stone-300 bg-white px-4 py-3 text-[15px] font-medium lg:hidden"
        >
          <span className="flex items-center gap-2">
            <LuSlidersHorizontal aria-hidden="true" /> Filters
          </span>
          <span className="text-brand">{filtersOpen ? 'Hide' : 'Show'}</span>
        </button>
        <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
          <aside
            id="event-filters"
            className={`h-fit rounded-xl border border-stone-200 bg-white p-5 ${filtersOpen ? '' : 'hidden lg:block'}`}
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
              <select
                id="city-filter"
                value={city}
                onChange={(event) => update('city', event.target.value)}
                className="mt-3 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
              >
                <option value="">All cities</option>
                {cities.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="mt-6 border-t border-stone-100 pt-5">
              <label htmlFor="price-filter" className="text-[15px] font-medium">
                Maximum price
              </label>
              <input
                id="price-filter"
                type="range"
                min="0"
                max="5000"
                step="100"
                value={maxPrice}
                onChange={(event) => update('maxPrice', event.target.value)}
                className="mt-4 w-full accent-brand"
              />
              <p className="mt-1 flex justify-between text-xs text-stone-500">
                <span>₹0</span>
                <span>₹{maxPrice.toLocaleString('en-IN')}</span>
              </p>
            </div>
          </aside>
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-stone-600">
                <span className="font-semibold text-ink">{visible.length}</span>{' '}
                {visible.length === 1 ? 'sample event' : 'sample events'} found{' '}
                {query && (
                  <>
                    for <span className="font-semibold">“{query}”</span>
                  </>
                )}
              </p>
              <label className="flex items-center gap-2 text-[15px] text-stone-600">
                Sort by
                <select
                  value={sort}
                  onChange={(event) => update('sort', event.target.value)}
                  className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-[15px] font-medium text-ink"
                >
                  <option value="date">Soonest</option>
                  <option value="price">Lowest price</option>
                </select>
              </label>
            </div>
            {visible.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
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
            )}
            <p className="mt-8 text-xs text-stone-500">
              These listings demonstrate the EventNest experience. Live event inventory is not
              connected yet.
            </p>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
