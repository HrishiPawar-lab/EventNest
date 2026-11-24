const configurationErrors = new Set([
  'PORT must be an integer between 1 and 65535',
  'MONGODB_URI is required',
  'CLERK_PUBLISHABLE_KEY is required',
  'CLERK_SECRET_KEY is required',
  'CLERK_WEBHOOK_SIGNING_SECRET is required',
  'CLOUDINARY_CLOUD_NAME is required when Cloudinary is configured',
  'CLOUDINARY_API_KEY is required when Cloudinary is configured',
  'CLOUDINARY_API_SECRET is required when Cloudinary is configured',
]);

export function getStartupFailureMessage(error) {
  if (configurationErrors.has(error?.message)) {
    return `EventNest API configuration error: ${error.message}`;
  }

  if (error?.code === 'EADDRINUSE') {
    return 'EventNest API failed to start: the configured port is already in use.';
  }

  if (error?.name === 'MongoParseError') {
    return 'EventNest API failed to start: MONGODB_URI is invalid.';
  }

  if (error?.name === 'MongoServerError' && error?.code === 18) {
    return 'EventNest API failed to start: MongoDB authentication failed. Check the database user and MONGODB_URI.';
  }

  if (
    error?.name === 'MongooseServerSelectionError' ||
    error?.name === 'MongoServerSelectionError'
  ) {
    return 'EventNest API failed to start: MongoDB could not be reached. Check the Atlas IP access list, MONGODB_URI, DNS, and cluster availability.';
  }

  return 'EventNest API failed to start: unexpected startup error. Check the service configuration.';
}
