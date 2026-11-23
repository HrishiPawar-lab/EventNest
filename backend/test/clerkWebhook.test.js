import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../src/app.js';

const secretBytes = Buffer.from('eventnest-webhook-test-secret-12345');
const signingSecret = `whsec_${secretBytes.toString('base64')}`;

function clerkUser(overrides = {}) {
  return {
    id: 'user_123',
    firstName: 'Ada',
    lastName: 'Lovelace',
    username: null,
    imageUrl: 'https://example.test/ada.png',
    primaryEmailAddressId: 'email_1',
    emailAddresses: [
      {
        id: 'email_secondary',
        emailAddress: 'SECONDARY@EXAMPLE.COM',
        verification: { status: 'verified' },
      },
      {
        id: 'email_1',
        emailAddress: 'ADA@EXAMPLE.COM',
        verification: { status: 'verified' },
      },
    ],
    primaryPhoneNumberId: 'phone_1',
    phoneNumbers: [
      {
        id: 'phone_1',
        phoneNumber: '+14155552671',
        verification: { status: 'verified' },
      },
    ],
    ...overrides,
  };
}

function event(type, data = { id: 'user_123' }) {
  return { type, data, object: 'event', timestamp: Date.now() };
}

function setPath(document, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  let target = document;
  for (const part of parts) target = target[part] ??= {};
  target[last] = value;
}

function unsetPath(document, path) {
  const parts = path.split('.');
  const last = parts.pop();
  let target = document;
  for (const part of parts) target = target[part] ?? {};
  delete target[last];
}

function memoryUserModel() {
  const users = new Map();
  const calls = [];
  let nextFailure;

  return {
    users,
    calls,
    failOnce(error) {
      nextFailure = error;
    },
    async updateOne(filter, update, options) {
      calls.push({ filter, update, options });
      if (nextFailure) {
        const error = nextFailure;
        nextFailure = undefined;
        throw error;
      }
      let user = users.get(filter.clerkId);
      if (!user && !options.upsert) return { matchedCount: 0 };
      if (!user) {
        user = { clerkId: filter.clerkId };
        for (const [path, value] of Object.entries(update.$setOnInsert ?? {})) {
          setPath(user, path, value);
        }
        users.set(filter.clerkId, user);
      }
      for (const [path, value] of Object.entries(update.$set ?? {})) {
        setPath(user, path, value);
      }
      for (const path of Object.keys(update.$unset ?? {}))
        unsetPath(user, path);
      return { matchedCount: 1 };
    },
  };
}

function signedHeaders(body, messageId = 'msg_123') {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secretBytes)
    .update(`${messageId}.${timestamp}.${body}`)
    .digest('base64');
  return {
    'content-type': 'application/json',
    'svix-id': messageId,
    'svix-timestamp': timestamp,
    'svix-signature': `v1,${signature}`,
  };
}

async function webhookHarness(t) {
  const users = memoryUserModel();
  const clerkUsers = new Map([['user_123', clerkUser()]]);
  let clerkFailure;
  let clerkCalls = 0;
  const clerkClient = {
    users: {
      async getUser(id) {
        clerkCalls += 1;
        if (clerkFailure) throw clerkFailure;
        if (!clerkUsers.has(id)) {
          throw Object.assign(new Error('Not found'), { status: 404 });
        }
        return clerkUsers.get(id);
      },
    },
  };
  const server = createApp({
    webhookSigningSecret: signingSecret,
    clerkClient,
    userModel: users,
  }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const url = `http://127.0.0.1:${server.address().port}/api/webhooks/clerk`;

  return {
    users,
    clerkUsers,
    get clerkCalls() {
      return clerkCalls;
    },
    failClerk(error) {
      clerkFailure = error;
    },
    async post(payload, { body, headers } = {}) {
      const rawBody = body ?? JSON.stringify(payload);
      return fetch(url, {
        method: 'POST',
        headers: headers ?? signedHeaders(rawBody),
        body: rawBody,
      });
    },
  };
}

test('verified create syncs the current Clerk user and duplicate delivery does not duplicate it', async (t) => {
  const harness = await webhookHarness(t);
  const payload = event('user.created');
  const body = JSON.stringify(payload);
  const headers = signedHeaders(body);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await harness.post(payload, { body, headers });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'synced' });
  }

  assert.equal(harness.users.users.size, 1);
  assert.deepEqual(harness.users.users.get('user_123'), {
    clerkId: 'user_123',
    roles: ['attendee'],
    accountStatus: 'active',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phoneNumber: '+14155552671',
    profilePicture: 'https://example.test/ada.png',
    verification: { emailVerified: true, phoneVerified: true },
  });
  assert.equal(harness.users.calls[0].options.upsert, true);
  assert.equal(harness.users.calls[0].options.runValidators, true);
});

test('verified update changes profile data without replacing roles or account status', async (t) => {
  const harness = await webhookHarness(t);
  await harness.post(event('user.created'));
  const user = harness.users.users.get('user_123');
  user.roles.push('organizer');
  user.accountStatus = 'suspended';
  harness.clerkUsers.set(
    'user_123',
    clerkUser({
      firstName: 'Augusta',
      lastName: 'King',
      emailAddresses: [
        {
          id: 'email_1',
          emailAddress: 'NEW@EXAMPLE.COM',
          verification: { status: 'unverified' },
        },
      ],
    }),
  );

  const response = await harness.post(event('user.updated'));
  assert.equal(response.status, 200);
  assert.equal(user.name, 'Augusta King');
  assert.equal(user.email, 'new@example.com');
  assert.equal(user.verification.emailVerified, false);
  assert.deepEqual(user.roles, ['attendee', 'organizer']);
  assert.equal(user.accountStatus, 'suspended');
  assert.equal(harness.users.users.size, 1);

  await harness.post(event('user.created'));
  assert.equal(user.email, 'new@example.com');
  assert.equal(user.name, 'Augusta King');
});

test('verified deletion soft-deactivates and late updates do not resurrect a deleted Clerk user', async (t) => {
  const harness = await webhookHarness(t);
  await harness.post(event('user.created'));
  harness.clerkUsers.delete('user_123');
  const deletion = event('user.deleted');
  const body = JSON.stringify(deletion);
  const headers = signedHeaders(body);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await harness.post(deletion, { body, headers });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'deactivated' });
  }
  const lateUpdate = await harness.post(event('user.updated'));
  assert.equal(lateUpdate.status, 200);
  assert.equal(harness.users.users.size, 1);
  assert.equal(
    harness.users.users.get('user_123').accountStatus,
    'deactivated',
  );
  assert.equal(harness.users.calls.at(-1).options.upsert, false);
});

test('deletion of an unsynced Clerk user does not create a placeholder document', async (t) => {
  const harness = await webhookHarness(t);
  harness.clerkUsers.delete('user_123');
  assert.equal((await harness.post(event('user.deleted'))).status, 200);
  assert.equal((await harness.post(event('user.created'))).status, 200);
  assert.equal(harness.users.users.size, 0);
  assert.equal(
    harness.users.calls.every((call) => !call.options.upsert),
    true,
  );
});

test('invalid signatures and missing headers never reach Clerk or MongoDB', async (t) => {
  const harness = await webhookHarness(t);
  const payload = event('user.created');
  const body = JSON.stringify(payload);
  const invalidRequests = [
    {
      body: JSON.stringify(event('user.deleted')),
      headers: signedHeaders(body),
    },
    {
      body,
      headers: { ...signedHeaders(body), 'svix-signature': 'v1,invalid' },
    },
    { body, headers: { 'content-type': 'application/json' } },
  ];
  for (const request of invalidRequests) {
    const response = await harness.post(payload, request);
    assert.equal(response.status, 400);
  }
  assert.equal(harness.clerkCalls, 0);
  assert.equal(harness.users.calls.length, 0);
});

test('incomplete contact data never creates an invalid user and clears existing verification', async (t) => {
  const harness = await webhookHarness(t);
  harness.clerkUsers.set('user_123', clerkUser({ phoneNumbers: [] }));
  const missingPhone = await harness.post(event('user.created'));
  assert.equal(missingPhone.status, 200);
  assert.deepEqual(await missingPhone.json(), { status: 'incomplete' });
  assert.equal(harness.users.users.size, 0);
  assert.equal(harness.users.calls.at(-1).options.upsert, false);

  harness.clerkUsers.set('user_123', clerkUser({ emailAddresses: [] }));
  const missingEmail = await harness.post(event('user.updated'));
  assert.equal(missingEmail.status, 200);
  assert.equal(harness.users.users.size, 0);

  harness.clerkUsers.set(
    'user_123',
    clerkUser({
      phoneNumbers: [
        {
          id: 'phone_1',
          phoneNumber: '4155552671',
          verification: { status: 'verified' },
        },
      ],
    }),
  );
  assert.equal((await harness.post(event('user.updated'))).status, 200);
  assert.equal(harness.users.users.size, 0);

  harness.clerkUsers.set('user_123', clerkUser());
  await harness.post(event('user.updated'));
  harness.clerkUsers.set('user_123', clerkUser({ phoneNumbers: [] }));
  await harness.post(event('user.updated'));
  const user = harness.users.users.get('user_123');
  assert.equal(user.phoneNumber, '+14155552671');
  assert.equal(user.verification.phoneVerified, false);

  harness.clerkUsers.set('user_123', clerkUser({ emailAddresses: [] }));
  await harness.post(event('user.updated'));
  assert.equal(user.email, 'ada@example.com');
  assert.equal(user.verification.emailVerified, false);
});

test('database failure returns 500 so the same signed event can be retried', async (t) => {
  const harness = await webhookHarness(t);
  const payload = event('user.created');
  const body = JSON.stringify(payload);
  const headers = signedHeaders(body);
  harness.users.failOnce(new Error('database unavailable'));

  const failed = await harness.post(payload, { body, headers });
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
  assert.equal(harness.users.users.size, 0);

  const retried = await harness.post(payload, { body, headers });
  assert.equal(retried.status, 200);
  assert.equal(harness.users.users.size, 1);
});

test('Clerk lookup failure returns 500, malformed IDs return 400, and unrelated events are ignored', async (t) => {
  const harness = await webhookHarness(t);
  harness.failClerk(new Error('Clerk unavailable'));
  assert.equal((await harness.post(event('user.created'))).status, 500);
  assert.equal((await harness.post(event('user.updated', {}))).status, 400);
  const ignored = await harness.post(event('organization.created', {}));
  assert.equal(ignored.status, 200);
  assert.deepEqual(await ignored.json(), { status: 'ignored' });
  assert.equal(harness.users.users.size, 0);
});
