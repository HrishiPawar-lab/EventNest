import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from '../src/config.js';
import { loadClerkConfig } from '../src/config/clerk.js';

const clerkEnv = {
  CLERK_PUBLISHABLE_KEY: 'pk_test_placeholder',
  CLERK_SECRET_KEY: 'sk_test_placeholder',
};

test('loads a valid MongoDB URI and default port', () => {
  assert.deepEqual(
    loadConfig({
      MONGODB_URI: ' mongodb://localhost:27017/eventnest ',
      ...clerkEnv,
    }),
    {
      port: 4000,
      mongodbUri: 'mongodb://localhost:27017/eventnest',
      clerk: {
        publishableKey: 'pk_test_placeholder',
        secretKey: 'sk_test_placeholder',
      },
    },
  );
});

test('rejects missing MongoDB URI', () => {
  assert.throws(() => loadConfig(clerkEnv), /MONGODB_URI is required/);
});

test('rejects invalid ports', () => {
  for (const port of ['0', '65536', 'abc', '1.5']) {
    assert.throws(
      () =>
        loadConfig({
          PORT: port,
          MONGODB_URI: 'mongodb://localhost/test',
          ...clerkEnv,
        }),
      /PORT must/,
    );
  }
});

test('Clerk config trims both keys', () => {
  assert.deepEqual(
    loadClerkConfig({
      CLERK_PUBLISHABLE_KEY: ' pk_test_placeholder ',
      CLERK_SECRET_KEY: ' sk_test_placeholder ',
    }),
    {
      publishableKey: 'pk_test_placeholder',
      secretKey: 'sk_test_placeholder',
    },
  );
});

test('startup config rejects missing or blank Clerk keys', () => {
  const mongoEnv = { MONGODB_URI: 'mongodb://localhost/test' };
  for (const publishableKey of [undefined, '', '  ']) {
    assert.throws(
      () =>
        loadConfig({
          ...mongoEnv,
          CLERK_PUBLISHABLE_KEY: publishableKey,
          CLERK_SECRET_KEY: clerkEnv.CLERK_SECRET_KEY,
        }),
      { message: 'CLERK_PUBLISHABLE_KEY is required' },
    );
  }
  for (const secretKey of [undefined, '', '  ']) {
    assert.throws(
      () =>
        loadConfig({
          ...mongoEnv,
          CLERK_PUBLISHABLE_KEY: clerkEnv.CLERK_PUBLISHABLE_KEY,
          CLERK_SECRET_KEY: secretKey,
        }),
      { message: 'CLERK_SECRET_KEY is required' },
    );
  }
});
