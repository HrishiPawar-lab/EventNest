import 'dotenv/config';
import mongoose from 'mongoose';
import { loadConfig } from './config.js';
import { startServer } from './start.js';
import { getStartupFailureMessage } from './startupError.js';
import './models/index.js';

async function start() {
  const config = loadConfig();
  const server = await startServer(config);
  console.info(`EventNest API listening on port ${config.port}`);

  async function shutdown() {
    try {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    } finally {
      await mongoose.disconnect();
    }
  }

  function handleSignal() {
    shutdown().catch(() => {
      console.error('EventNest API failed to shut down cleanly.');
      process.exitCode = 1;
    });
  }

  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
}

start().catch((error) => {
  console.error(getStartupFailureMessage(error));
  process.exitCode = 1;
});
