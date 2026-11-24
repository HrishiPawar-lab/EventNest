type ClerkError = { code?: string; longMessage?: string; message?: string }

function firstClerkError(error: unknown): ClerkError | undefined {
  const errors: unknown[] =
    error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)
      ? error.errors
      : []
  const first = errors[0]
  return first && typeof first === 'object' ? (first as ClerkError) : undefined
}

export function clerkErrorMessage(error: unknown) {
  const first = firstClerkError(error)
  return first?.longMessage || first?.message || 'Something went wrong. Please try again.'
}

export function phoneVerificationErrorMessage(error: unknown) {
  if (firstClerkError(error)?.code === 'unsupported_country_code') {
    return 'SMS verification is unavailable for this number. You can continue without adding a phone number.'
  }
  return clerkErrorMessage(error)
}
