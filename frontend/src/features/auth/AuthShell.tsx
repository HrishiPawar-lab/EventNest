import type { ReactNode } from 'react'
import { LuArrowLeft, LuCalendarDays, LuShieldCheck } from 'react-icons/lu'
import { Link } from 'react-router-dom'

export function AuthShell({
  children,
  eyebrow = 'Welcome to EventNest',
}: {
  children: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_8%,#d5eaf0_0%,#f4f9fb_42%,#f7fafb_100%)] text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-7 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-3 rounded-xl font-bold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-400 text-slate-900">
            <LuCalendarDays aria-hidden="true" className="size-5" />
          </span>
          EventNest
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <LuArrowLeft aria-hidden="true" /> Back to discover
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-14 pt-6 lg:grid-cols-[1fr_470px] lg:items-center lg:gap-20 lg:px-8 lg:pt-16">
        <div className="max-w-lg">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
            <LuShieldCheck aria-hidden="true" className="text-amber-600" /> {eyebrow}
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            Good moments begin <span className="text-amber-500">together.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
            Find your next experience, keep your tickets close, and make every event easier to
            remember.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-2 gap-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-white bg-white/70 p-4">
              Discover events that feel like you.
            </div>
            <div className="rounded-2xl border border-white bg-white/70 p-4">
              Keep every booking in one place.
            </div>
          </div>
        </div>
        <div className="min-w-0 rounded-[2rem] border border-white bg-white/90 p-4 shadow-2xl shadow-slate-300/30 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
