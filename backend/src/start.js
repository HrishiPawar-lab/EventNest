import mongoose from 'mongoose';
import { createApp } from './app.js';

export async function startServer(
  config,
  {
    connect = (uri) =>
      mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }),
    disconnect = () => mongoose.disconnect(),
  } = {},
) {
  await connect(config.mongodbUri);

  try {
    return await new Promise((resolve, reject) => {
      const server = createApp().listen(config.port);
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
      );
    }
    throw startError;
  }
}
