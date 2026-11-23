import { useAuth } from '@clerk/react'
import { motion, useReducedMotion } from 'framer-motion'
import { LuArrowRight, LuCalendarDays, LuCompass, LuTicket } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { Button } from './components/ui/button'

function App() {
  const { isLoaded, isSignedIn } = useAuth()
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f9fb] text-slate-900">
      <header className="border-b border-white/80 bg-white/75">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-xl text-lg font-bold tracking-tight text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-400">
              <LuCalendarDays aria-hidden="true" className="size-5" />
            </span>
            EventNest
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 sm:inline-flex"
            >
              Discover
            </Link>
            {isLoaded && isSignedIn ? (
              <Button asChild size="sm">
                <Link to="/account">
                  My account <LuArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
                >
                  Log in
                </Link>
                <Button asChild size="sm">
                  <Link to="/sign-up">Join EventNest</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-16 sm:px-8 sm:py-24">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="grid w-full items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]"
        >
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
              <LuCompass aria-hidden="true" className="text-amber-600" /> Discover what is happening
            </p>
            <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">
              Make room for <span className="text-amber-500">memorable moments.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-600">
              EventNest brings people and experiences together. Your next favorite event is just
              around the corner.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={isSignedIn ? '/account' : '/sign-up'}>
                  Get started <LuArrowRight aria-hidden="true" />
                </Link>
              </Button>
              {!isSignedIn && (
                <Button asChild size="lg" variant="outline">
                  <Link to="/sign-in">I already have an account</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white bg-white/85 p-8 shadow-xl shadow-sky-200/40 sm:p-10">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <LuTicket aria-hidden="true" className="size-7" />
            </div>
            <h2 className="mt-8 text-2xl font-bold tracking-tight">Events are on their way</h2>
            <p className="mt-3 leading-7 text-slate-600">
              There are no events to show yet. Once organizers publish them, you can discover them
              here.
            </p>
          </div>
        </motion.div>
      </main>
      <footer className="border-t border-white/80 bg-white/70">
        <div className="mx-auto w-full max-w-6xl px-5 py-5 text-sm text-slate-500 sm:px-8">
          © EventNest
        </div>
      </footer>
    </div>
  )
}

export default App
