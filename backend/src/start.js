import mongoose from 'mongoose';
import { clerkMiddleware, createClerkClient } from '@clerk/express';
import { createApp } from './app.js';
import { configureCloudinary } from './config/cloudinary.js';

export async function startServer(
  config,
  {
    connect = (uri) =>
      mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }),
    disconnect = () => mongoose.disconnect(),
    makeClerkMiddleware = clerkMiddleware,
    configureMedia = configureCloudinary,
  } = {},
) {
  if (config.cloudinary) configureMedia(config.cloudinary);
  await connect(config.mongodbUri);

  try {
    return await new Promise((resolve, reject) => {
      const clerkClient = config.clerk?.secretKey
        ? createClerkClient({ secretKey: config.clerk.secretKey })
        : undefined;
      const server = createApp({
        webhookSigningSecret: config.clerk?.webhookSigningSecret,
        clerkClient,
        clerkSessionMiddleware: config.clerk?.publishableKey
          ? makeClerkMiddleware({
              publishableKey: config.clerk.publishableKey,
              clerkClient,
            })
          : undefined,
      }).listen(config.port);
      const onError = (error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolve(server);
      };
      server.once('listening', onListening);
      server.once('error', onError);
    });
  } catch (startError) {
    try {
      await disconnect();
    } catch (disconnectError) {
      throw new AggregateError(
        [startError, disconnectError],
        'Server startup and MongoDB cleanup failed',
        { cause: disconnectError },
      );
    }
    throw startError;
  }
}
