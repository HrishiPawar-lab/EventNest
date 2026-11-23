export function loadClerkConfig(env = process.env) {
  if (
    typeof env.CLERK_PUBLISHABLE_KEY !== 'string' ||
    !env.CLERK_PUBLISHABLE_KEY.trim()
  ) {
    throw new Error('CLERK_PUBLISHABLE_KEY is required');
  }

  if (
    typeof env.CLERK_SECRET_KEY !== 'string' ||
    !env.CLERK_SECRET_KEY.trim()
  ) {
    throw new Error('CLERK_SECRET_KEY is required');
  }

  if (
    typeof env.CLERK_WEBHOOK_SIGNING_SECRET !== 'string' ||
    !env.CLERK_WEBHOOK_SIGNING_SECRET.trim()
  ) {
    throw new Error('CLERK_WEBHOOK_SIGNING_SECRET is required');
  }

  return {
    publishableKey: env.CLERK_PUBLISHABLE_KEY.trim(),
    secretKey: env.CLERK_SECRET_KEY.trim(),
    webhookSigningSecret: env.CLERK_WEBHOOK_SIGNING_SECRET.trim(),
  };
}
