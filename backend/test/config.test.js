import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from '../src/config.js';
import { loadClerkConfig } from '../src/config/clerk.js';
import {
  configureCloudinary,
  loadCloudinaryConfig,
} from '../src/config/cloudinary.js';

const clerkEnv = {
  CLERK_PUBLISHABLE_KEY: 'pk_test_placeholder',
  CLERK_SECRET_KEY: 'sk_test_placeholder',
  CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_test_placeholder',
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
      frontendOrigin: undefined,
      clerk: {
        publishableKey: 'pk_test_placeholder',
        secretKey: 'sk_test_placeholder',
        webhookSigningSecret: 'whsec_test_placeholder',
      },
      cloudinary: null,
      razorpay: null,
    },
  );
});

test('accepts only one configured frontend origin', () => {
  assert.equal(
    loadConfig({
      MONGODB_URI: 'mongodb://localhost/eventnest',
      FRONTEND_ORIGIN: 'http://localhost:5173',
      ...clerkEnv,
    }).frontendOrigin,
    'http://localhost:5173',
  );
  for (const origin of [
    'https://example.com/path',
    'https://example.com,https://other.com',
    'file:///tmp',
  ]) {
    assert.throws(
      () =>
        loadConfig({
          MONGODB_URI: 'mongodb://localhost/test',
          FRONTEND_ORIGIN: origin,
          ...clerkEnv,
        }),
      /FRONTEND_ORIGIN must be a single HTTP\(S\) origin/,
    );
  }
});

test('Cloudinary config is optional until credentials are supplied', () => {
  assert.equal(loadCloudinaryConfig({}), null);
  assert.equal(
    loadCloudinaryConfig({
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
    }),
    null,
  );
});

test('Cloudinary config trims credentials and configures secure delivery', () => {
  const config = loadCloudinaryConfig({
    CLOUDINARY_CLOUD_NAME: ' eventnest-test ',
    CLOUDINARY_API_KEY: ' key-test ',
    CLOUDINARY_API_SECRET: ' secret-test ',
  });
  assert.deepEqual(config, {
    cloudName: 'eventnest-test',
    apiKey: 'key-test',
    apiSecret: 'secret-test',
  });
  let options;
  const fakeClient = {
    config(value) {
      options = value;
    },
  };
  assert.equal(configureCloudinary(config, fakeClient), fakeClient);
  assert.deepEqual(options, {
    cloud_name: 'eventnest-test',
    api_key: 'key-test',
    api_secret: 'secret-test',
    secure: true,
  });
});

test('partial Cloudinary credentials fail without revealing supplied values', () => {
  const secret = 'sensitive-cloudinary-secret';
  for (const missing of [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ]) {
    const env = {
      CLOUDINARY_CLOUD_NAME: 'eventnest-test',
      CLOUDINARY_API_KEY: 'key-test',
      CLOUDINARY_API_SECRET: secret,
      [missing]: '  ',
    };
    assert.throws(
      () => loadCloudinaryConfig(env),
      (error) =>
        error.message.includes(missing) && !error.message.includes(secret),
    );
  }
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
      CLERK_WEBHOOK_SIGNING_SECRET: ' whsec_test_placeholder ',
    }),
    {
      publishableKey: 'pk_test_placeholder',
      secretKey: 'sk_test_placeholder',
      webhookSigningSecret: 'whsec_test_placeholder',
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
          CLERK_WEBHOOK_SIGNING_SECRET: clerkEnv.CLERK_WEBHOOK_SIGNING_SECRET,
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
          CLERK_WEBHOOK_SIGNING_SECRET: clerkEnv.CLERK_WEBHOOK_SIGNING_SECRET,
        }),
      { message: 'CLERK_SECRET_KEY is required' },
    );
  }
  for (const signingSecret of [undefined, '', '  ']) {
    assert.throws(
      () =>
        loadConfig({
          ...mongoEnv,
          CLERK_PUBLISHABLE_KEY: clerkEnv.CLERK_PUBLISHABLE_KEY,
          CLERK_SECRET_KEY: clerkEnv.CLERK_SECRET_KEY,
          CLERK_WEBHOOK_SIGNING_SECRET: signingSecret,
        }),
      { message: 'CLERK_WEBHOOK_SIGNING_SECRET is required' },
    );
  }
});
