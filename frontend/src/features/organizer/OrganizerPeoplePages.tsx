import { LuArrowRight, LuScanLine, LuSearch, LuShieldAlert, LuUsers } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
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

export function CheckInPage() {
  return (
    <OrganizerShell>
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
        <OrganizerHeading
          eyebrow="At the door"
          title="QR check-in"
          description="Welcome guests with a fast, secure entry flow."
        />
        <div className="grid gap-6 md:grid-cols-[1fr_0.8fr]">
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Scan a ticket</h2>
            <p className="mt-2 text-sm text-stone-600">
              The camera scanner will verify credentials against the backend and mark each valid
              ticket used exactly once.
            </p>
            <div className="mt-6 flex aspect-square max-h-88 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-paper">
              <div className="text-center">
                <LuScanLine aria-hidden="true" className="mx-auto size-14 text-stone-400" />
                <p className="mt-3 text-sm font-medium">Camera preview unavailable</p>
              </div>
            </div>
            <Button disabled className="mt-6 w-full">
              Start scanner
            </Button>
          </section>
          <section className="rounded-xl border border-orange-200 bg-orange-50 p-6">
            <LuShieldAlert aria-hidden="true" className="size-7 text-brand" />
            <h2 className="mt-4 text-xl font-semibold">Every check-in is verified</h2>
            <p className="mt-3 text-sm leading-6 text-stone-700">
              Scanning a code on a device is not enough to grant entry. A live check-in needs the
              backend to validate an opaque QR credential and atomically update ticket status.
            </p>
            <div className="mt-6 border-t border-orange-200 pt-5">
              <p className="text-sm font-medium">
                No valid ticket credentials exist in this preview.
              </p>
              <Link
                to="/organizer/preview/attendees"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand"
              >
                View attendee preview <LuArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </OrganizerShell>
  )
}
