import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getStartupFailureMessage } from '../src/startupError.js';

test('identifies missing configuration without logging values', () => {
  assert.match(
    getStartupFailureMessage(
      new Error('CLERK_WEBHOOK_SIGNING_SECRET is required'),
    ),
    /configuration error: CLERK_WEBHOOK_SIGNING_SECRET is required/,
  );
  assert.match(
    getStartupFailureMessage(
      new Error(
        'CLOUDINARY_API_SECRET is required when Cloudinary is configured',
      ),
    ),
    /configuration error: CLOUDINARY_API_SECRET is required/,
  );
});

test('classifies MongoDB failures without exposing their messages', () => {
  const secret = 'mongodb+srv://user:secret@private.example/test';
  const cases = [
    [{ name: 'MongoParseError', message: secret }, /MONGODB_URI is invalid/],
    [
      { name: 'MongoServerError', code: 18, message: secret },
      /MongoDB authentication failed/,
    ],
    [
      { name: 'MongooseServerSelectionError', message: secret },
      /MongoDB could not be reached/,
    ],
    [
      { name: 'MongoServerSelectionError', message: secret },
      /MongoDB could not be reached/,
    ],
  ];

  for (const [error, pattern] of cases) {
    const message = getStartupFailureMessage(error);
    assert.match(message, pattern);
    assert.doesNotMatch(message, /secret|private\.example/);
  }
});

test('classifies port conflicts and keeps unknown errors private', () => {
  assert.match(
    getStartupFailureMessage({ code: 'EADDRINUSE' }),
    /port is already in use/,
  );
  assert.doesNotMatch(
    getStartupFailureMessage(new Error('sk_test_private')),
    /sk_test_private/,
  );
});
