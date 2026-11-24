import { LuArrowUpRight, LuCalendarDays, LuTicket, LuTrendingUp, LuUsers } from 'react-icons/lu'
import { OrganizerHeading, OrganizerShell } from './OrganizerShell'

const metrics = [
  { label: 'Gross sales', value: '₹4,25,000', icon: LuTrendingUp },
  { label: 'Tickets sold', value: '1,240', icon: LuTicket },
  { label: 'Guests reached', value: '8,400', icon: LuUsers },
  { label: 'Events hosted', value: '12', icon: LuCalendarDays },
]
const months = [
  { name: 'Jan', value: 38 },
  { name: 'Feb', value: 49 },
  { name: 'Mar', value: 43 },
  { name: 'Apr', value: 62 },
  { name: 'May', value: 58 },
  { name: 'Jun', value: 70 },
]

export function OrganizerAnalyticsPage() {
  return (
    <OrganizerShell>
      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8">
        <OrganizerHeading
          eyebrow="The bigger picture"
          title="Sales & analytics"
          description="See which events connect and how your audience is growing."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-stone-200 bg-white p-5">
              <div className="flex justify-between">
                <Icon aria-hidden="true" className="size-6 text-brand" />
                <LuArrowUpRight aria-hidden="true" className="text-stone-400" />
              </div>
              <p className="mt-5 text-2xl font-black">{value}</p>
              <p className="mt-1 text-sm text-stone-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold">Sales over time</h2>
            <p className="mt-1 text-sm text-stone-500">Illustrative six-month trend</p>
            <div
              role="img"
              aria-label="Example chart of monthly sales generally increasing from January to June"
              className="mt-8 flex h-60 items-end gap-3 border-b border-stone-200 sm:gap-6"
            >
              {months.map((month) => (
                <div
                  key={month.name}
                  className="flex flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-semibold">{month.value}k</span>
                  <div
                    className="w-full rounded-t-md bg-brand"
                    style={{ height: `${month.value * 2.4}px` }}
                  />
                  <span className="-mb-6 text-xs text-stone-500">{month.name}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold">Useful signals</h2>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm font-semibold">Most popular category</p>
                <p className="mt-1 text-2xl font-black">Live music</p>
              </div>
              <div className="border-t border-stone-100 pt-5">
                <p className="text-sm font-semibold">Returning attendees</p>
                <p className="mt-1 text-2xl font-black">28%</p>
              </div>
              <div className="border-t border-stone-100 pt-5">
                <p className="text-sm font-semibold">Average order size</p>
                <p className="mt-1 text-2xl font-black">2 tickets</p>
              </div>
            </div>
          </section>
        </div>
        <p className="mt-9 text-xs text-stone-500">
          All metrics on this page are illustrative. Live reports require verified booking and
          payment data from the backend.
        </p>
      </main>
    </OrganizerShell>
  )
}
