import { URL } from 'node:url';
import { loadClerkConfig } from './config/clerk.js';
import { loadCloudinaryConfig } from './config/cloudinary.js';
import { loadRazorpayConfig } from './config/razorpay.js';

export function loadConfig(env = process.env) {
  const port = Number(env.PORT ?? 4000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  if (typeof env.MONGODB_URI !== 'string' || !env.MONGODB_URI.trim()) {
    throw new Error('MONGODB_URI is required');
  }

  let frontendOrigin;
  if (env.FRONTEND_ORIGIN?.trim()) {
    try {
      const url = new URL(env.FRONTEND_ORIGIN.trim());
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.href !== `${url.origin}/`
      )
        throw new Error('Invalid origin');
      frontendOrigin = url.origin;
    } catch {
      throw new Error('FRONTEND_ORIGIN must be a single HTTP(S) origin');
    }
  }

  return {
    port,
    mongodbUri: env.MONGODB_URI.trim(),
    frontendOrigin,
    clerk: loadClerkConfig(env),
    cloudinary: loadCloudinaryConfig(env),
    razorpay: loadRazorpayConfig(env),
  };
}
