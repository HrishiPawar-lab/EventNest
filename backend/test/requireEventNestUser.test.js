import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createApp } from '../src/app.js';
import { createRequireEventNestUser } from '../src/middleware/requireEventNestUser.js';

const verifiedUser = {
  _id: 'local-user-id',
  clerkId: 'user_123',
  accountStatus: 'active',
  verification: { emailVerified: true, phoneVerified: true },
};

async function startTestServer(t, app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  return `http://127.0.0.1:${server.address().port}`;
}

async function authHarness(t, { auth, user = verifiedUser, dbError } = {}) {
  const lookups = [];
  const app = express();
  const readAuth = () => auth;
  const userModel = {
    async findOne(filter) {
      lookups.push(filter);
      if (dbError) throw dbError;
      return user;
    },
  };

  app.get(
    '/__test/auth',
    createRequireEventNestUser({ userModel, readAuth }),
    (request, response) => {
      response.status(200).json({ userId: request.eventNestUser._id });
    },
  );
  app.use((_error, _request, response, _next) => {
    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  const baseUrl = await startTestServer(t, app);
  return {
    lookups,
    request: () =>
      fetch(`${baseUrl}/__test/auth?userId=attacker`, {
        headers: { 'x-user-id': 'attacker' },
      }),
  };
}

test('verified Clerk session loads only its matching active EventNest user', async (t) => {
  const harness = await authHarness(t, {
    auth: { isAuthenticated: true, userId: 'user_123' },
  });
  const response = await harness.request();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { userId: 'local-user-id' });
  assert.deepEqual(harness.lookups, [{ clerkId: 'user_123' }]);
});

test('missing and invalid sessions return 401 before querying MongoDB', async (t) => {
  for (const auth of [
    undefined,
    { isAuthenticated: false, userId: 'user_123' },
    { isAuthenticated: true, userId: '' },
  ]) {
    const harness = await authHarness(t, { auth });
    const response = await harness.request();
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    assert.deepEqual(harness.lookups, []);
  }
});

test('authenticated Clerk user without a local profile returns 401', async (t) => {
  const harness = await authHarness(t, {
    auth: { isAuthenticated: true, userId: 'user_123' },
    user: null,
  });
  const response = await harness.request();
  assert.equal(response.status, 401);
  assert.deepEqual(harness.lookups, [{ clerkId: 'user_123' }]);
});

test('suspended and deactivated users return 403', async (t) => {
  for (const accountStatus of ['suspended', 'deactivated']) {
    const harness = await authHarness(t, {
      auth: { isAuthenticated: true, userId: 'user_123' },
      user: { ...verifiedUser, accountStatus },
    });
    const response = await harness.request();
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: { code: 'FORBIDDEN', message: 'Account access denied' },
    });
  }
});

test('verified email grants access with no phone or an unverified phone', async (t) => {
  for (const verification of [
    { emailVerified: true, phoneVerified: false },
    { emailVerified: true },
  ]) {
    const harness = await authHarness(t, {
      auth: { isAuthenticated: true, userId: 'user_123' },
      user: { ...verifiedUser, verification },
    });
    const response = await harness.request();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { userId: 'local-user-id' });
  }
});

test('unverified email still denies access', async (t) => {
  for (const verification of [
    { emailVerified: false, phoneVerified: true },
    { emailVerified: false, phoneVerified: false },
    undefined,
  ]) {
    const harness = await authHarness(t, {
      auth: { isAuthenticated: true, userId: 'user_123' },
      user: { ...verifiedUser, verification },
    });
    const response = await harness.request();
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'VERIFICATION_REQUIRED',
        message: 'Account verification required',
      },
    });
  }
});

test('database failures reach error handling without leaking details', async (t) => {
  const harness = await authHarness(t, {
    auth: { isAuthenticated: true, userId: 'user_123' },
    dbError: new Error('database credentials and connection detail'),
  });
  const response = await harness.request();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

test('health and Clerk webhook bypass rejecting session middleware', async (t) => {
  let rejected = 0;
  const app = createApp({
    clerkSessionMiddleware: (_request, response) => {
      rejected += 1;
      response.status(401).json({ error: { code: 'UNAUTHORIZED' } });
    },
  });
  const baseUrl = await startTestServer(t, app);
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  const webhook = await fetch(`${baseUrl}/api/webhooks/clerk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(webhook.status, 503);
  assert.equal(rejected, 0);

  const protectedPath = await fetch(`${baseUrl}/unknown`);
  assert.equal(protectedPath.status, 401);
  assert.equal(rejected, 1);
});
