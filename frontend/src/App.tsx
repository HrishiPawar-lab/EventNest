import { motion, useReducedMotion } from 'framer-motion'
import { LuCalendarDays } from 'react-icons/lu'

function App() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200/80">
        <div className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3 text-emerald-950">
            <LuCalendarDays aria-hidden="true" className="size-8" />
            <span className="text-xl font-semibold tracking-tight">EventNest</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-16 sm:px-8 sm:py-24">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
            Discover what is happening
          </p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-6xl">
            Make room for memorable moments.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-stone-600">
            EventNest is taking shape. Event discovery, general admission tickets, and organizer tools are on the way.
          </p>
          <div className="mt-10 border-l-2 border-emerald-800 pl-5">
            <p className="text-sm font-medium text-stone-700">
              There are no events to show yet. Please check back soon.
            </p>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-stone-200/80">
        <div className="mx-auto w-full max-w-6xl px-5 py-5 text-sm text-stone-500 sm:px-8">
          EventNest
        </div>
      </footer>
    </div>
  )
}

export default App
