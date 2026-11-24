import { LuSearch, LuUsers } from 'react-icons/lu'
import { OrganizerHeading, OrganizerShell } from './OrganizerShell'

const sampleGuests = [
  { name: 'Aarav Shah', event: 'Afterglow Live', tickets: 2, status: 'Confirmed' },
  { name: 'Nisha Rao', event: 'Makers Summit 2027', tickets: 1, status: 'Confirmed' },
  { name: 'Kabir Mehta', event: 'Afterglow Live', tickets: 3, status: 'Checked in' },
]

export function AttendeeManagementPage() {
  return (
    <OrganizerShell>
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <OrganizerHeading
          eyebrow="Your community"
          title="Attendee management"
          description="A clear view of guests, bookings and arrival status."
        />
        <div className="rounded-xl border border-stone-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5">
            <div>
              <h2 className="text-lg font-semibold">Guest list preview</h2>
              <p className="text-sm text-stone-500">
                Illustrative records — no attendee data is connected
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-500">
              <LuSearch aria-hidden="true" /> Search available with live bookings
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-145 text-left text-sm">
              <thead className="bg-paper text-xs uppercase tracking-widest text-stone-500">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Guest
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Event
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Tickets
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sampleGuests.map((guest) => (
                  <tr key={guest.name} className="border-t border-stone-100">
                    <td className="px-5 py-4 font-semibold">{guest.name}</td>
                    <td className="px-5 py-4 text-stone-600">{guest.event}</td>
                    <td className="px-5 py-4">{guest.tickets}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-medium ${guest.status === 'Checked in' ? 'bg-green-50 text-green-800' : 'bg-orange-100 text-brand-dark'}`}
                      >
                        {guest.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-6">
          <LuUsers aria-hidden="true" className="text-brand" />
          <h2 className="mt-3 text-lg font-semibold">Live bookings will appear here</h2>
          <p className="mt-2 max-w-xl text-sm text-stone-600">
            Attendee lists must come from verified tickets. No one can be added, removed or checked
            in from this preview.
          </p>
        </div>
      </main>
    </OrganizerShell>
  )
}
