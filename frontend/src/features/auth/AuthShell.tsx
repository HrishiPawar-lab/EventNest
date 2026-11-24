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
      <header className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Brand />
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to discover
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 pb-12 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-stretch lg:gap-8 lg:px-8 lg:pt-8">
        <div className="relative flex min-h-60 flex-col justify-end overflow-hidden rounded-xl bg-ink p-7 text-white sm:p-9 lg:min-h-[560px]">
          <img
            src="/images/concert.jpg"
            alt="Audience enjoying a live concert"
            className="absolute inset-0 size-full object-cover opacity-55"
          />
          <div className="relative">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-orange-200">
              {eyebrow}
            </p>
            <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Your next great story starts here.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">
              Discover the moments worth showing up for. All your experiences, one place.
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-center">{children}</div>
      </main>
    </div>
  )
}
