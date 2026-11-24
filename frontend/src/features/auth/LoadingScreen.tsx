export function LoadingScreen({
  message = 'Loading your EventNest account...',
}: {
  message?: string
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-sky-50 px-5 text-slate-700"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-white bg-white px-8 py-6 text-center shadow-sm">
        <span
          className="mx-auto mb-3 block size-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"
          aria-hidden="true"
        />
        <p>{message}</p>
      </div>
    </div>
  )
}
