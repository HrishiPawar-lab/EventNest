export function clerkErrorMessage(error) {
  return (
    error?.errors?.[0]?.longMessage ||
    error?.errors?.[0]?.message ||
    'Something went wrong. Please try again.'
  )
}
