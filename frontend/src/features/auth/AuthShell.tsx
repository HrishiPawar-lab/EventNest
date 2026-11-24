import type { ReactNode } from 'react'
import { LuArrowLeft } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { Brand } from '../../components/layout/SiteShell'

export function AuthShell({
  children,
  eyebrow = 'Welcome to EventNest',
}: {
  children: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Brand />
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to discover
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-14 pt-6 lg:grid-cols-[1fr_470px] lg:items-stretch lg:gap-12 lg:px-8 lg:pt-12">
        <div className="relative flex min-h-72 flex-col justify-end overflow-hidden rounded-xl bg-ink p-8 text-white sm:p-10 lg:min-h-[660px]">
          <img
            src="/images/concert.jpg"
            alt="Audience enjoying a live concert"
            className="absolute inset-0 size-full object-cover opacity-55"
          />
          <div className="relative">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
              {eyebrow}
            </p>
            <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Your next great story starts here.
            </h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-white/85">
              Discover the moments worth showing up for. All your experiences, one place.
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center rounded-xl border border-stone-200 bg-white p-4 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
