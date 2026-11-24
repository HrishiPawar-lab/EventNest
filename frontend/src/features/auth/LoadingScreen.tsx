export function LoadingScreen({
  message = 'Loading your EventNest account...',
}: {
  message?: string
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-paper px-5 text-ink"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl border border-stone-200 bg-white px-8 py-6 text-center">
        <span
          className="mx-auto mb-3 block size-7 animate-spin rounded-full border-2 border-brand border-t-transparent"
          aria-hidden="true"
        />
        <p>{message}</p>
      </div>
    </div>
  )
}
