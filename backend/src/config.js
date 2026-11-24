import { loadClerkConfig } from './config/clerk.js';
import { loadCloudinaryConfig } from './config/cloudinary.js';

export function loadConfig(env = process.env) {
  const port = Number(env.PORT ?? 4000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  if (typeof env.MONGODB_URI !== 'string' || !env.MONGODB_URI.trim()) {
    throw new Error('MONGODB_URI is required');
  }

  return {
    port,
    mongodbUri: env.MONGODB_URI.trim(),
    clerk: loadClerkConfig(env),
    cloudinary: loadCloudinaryConfig(env),
  };
}
