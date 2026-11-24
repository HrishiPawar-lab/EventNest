import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:net';
import { loadConfig } from '../src/config.js';
import { startServer } from '../src/start.js';

test('starts health endpoint with validated config and an injected DB connection', async () => {
  const probe = createServer().listen(0);
  await new Promise((resolve) => probe.once('listening', resolve));
  const port = probe.address().port;
  await new Promise((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );

  const config = loadConfig({
    PORT: String(port),
    MONGODB_URI: 'mongodb://unused',
    CLERK_PUBLISHABLE_KEY: 'pk_test_placeholder',
    CLERK_SECRET_KEY: 'sk_test_placeholder',
    CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_test_placeholder',
    CLOUDINARY_CLOUD_NAME: 'eventnest-test',
    CLOUDINARY_API_KEY: 'key-test',
    CLOUDINARY_API_SECRET: 'secret-test',
  });
  let connectedUri;
  let clerkMiddlewareOptions;
  let cloudinaryConfig;
  const server = await startServer(config, {
    configureMedia: (value) => {
      cloudinaryConfig = value;
    },
    connect: async (uri) => {
      connectedUri = uri;
    },
    makeClerkMiddleware: (options) => {
      clerkMiddlewareOptions = options;
      return (_request, _response, next) => next();
    },
  });

  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal(connectedUri, 'mongodb://unused');
    assert.deepEqual(cloudinaryConfig, {
      cloudName: 'eventnest-test',
      apiKey: 'key-test',
      apiSecret: 'secret-test',
    });
    assert.equal(clerkMiddlewareOptions.publishableKey, 'pk_test_placeholder');
    assert.equal(clerkMiddlewareOptions.secretKey, undefined);
    assert.equal(
      typeof clerkMiddlewareOptions.clerkClient.users.getUser,
      'function',
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('closes MongoDB connection when HTTP port is already in use', async () => {
  const occupied = createServer().listen(0);
  await new Promise((resolve) => occupied.once('listening', resolve));

  const calls = [];
  try {
    await assert.rejects(
      startServer(
        { port: occupied.address().port, mongodbUri: 'mongodb://unused' },
        {
          connect: async () => {
            calls.push('connect');
          },
          disconnect: async () => {
            calls.push('disconnect');
          },
        },
      ),
      { code: 'EADDRINUSE' },
    );
    assert.deepEqual(calls, ['connect', 'disconnect']);
  } finally {
    await new Promise((resolve, reject) =>
      occupied.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
