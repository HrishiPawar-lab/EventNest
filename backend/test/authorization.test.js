import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import { createRequireEventNestUser } from '../src/middleware/requireEventNestUser.js';
import {
  createRequireEventOwner,
  createRequireVenueOwner,
  requireRole,
} from '../src/middleware/authorization.js';

const userId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const venueId = new mongoose.Types.ObjectId().toString();
const eventId = new mongoose.Types.ObjectId().toString();
const missingId = new mongoose.Types.ObjectId().toString();

function localUser(roles = ['attendee']) {
  return {
    _id: userId,
    clerkId: 'clerk_user_1',
    roles,
    accountStatus: 'active',
    verification: { emailVerified: true, phoneVerified: true },
  };
}

async function harness(t, options = {}) {
  const {
    auth = { isAuthenticated: true, userId: 'clerk_user_1' },
    user = localUser(),
    venueOwner = userId,
    eventOwner = userId,
    lookupError,
  } = options;
  const lookups = { users: [], venues: [], events: [] };
  const app = express();
  app.use(express.json());
  const authenticate = createRequireEventNestUser({
    readAuth: () => auth,
    userModel: {
      async findOne(filter) {
        lookups.users.push(filter);
        return user;
      },
    },
  });
  const venueModel = {
    async findById(id, projection) {
      lookups.venues.push({ id, projection });
      if (lookupError) throw lookupError;
      return id === venueId ? { organizerId: venueOwner } : null;
    },
  };
  const eventModel = {
    async findById(id, projection) {
      lookups.events.push({ id, projection });
      if (lookupError) throw lookupError;
      return id === eventId ? { organizerId: eventOwner } : null;
    },
  };
  const requireVenueOwner = createRequireVenueOwner({ venueModel });
  const requireEventOwner = createRequireEventOwner({ eventModel });

  app.get('/public', (_request, response) => response.json({ status: 'ok' }));
  app.get(
    '/unprotected-role-guard',
    requireRole('attendee'),
    (_request, response) => response.sendStatus(204),
  );
  app.get(
    '/attendee',
    authenticate,
    requireRole('attendee'),
    (_request, response) => response.sendStatus(204),
  );
  app.get(
    '/organizer',
    authenticate,
    requireRole('organizer'),
    (_request, response) => response.sendStatus(204),
  );
  for (const [path, ownerGuard] of [
    ['/venues/:venueId', requireVenueOwner],
    ['/events/:eventId', requireEventOwner],
  ]) {
    app.get(path, authenticate, ownerGuard, (_request, response) =>
      response.sendStatus(204),
    );
    app.patch(path, authenticate, ownerGuard, (_request, response) =>
      response.sendStatus(204),
    );
  }
  app.use((_error, _request, response, _next) =>
    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    }),
  );

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    lookups,
    request: (path, init) => fetch(`${baseUrl}${path}`, init),
  };
}

test('attendee and organizer guards use local roles, including users with both roles', async (t) => {
  const attendee = await harness(t);
  assert.equal((await attendee.request('/attendee')).status, 204);
  assert.equal((await attendee.request('/organizer')).status, 403);
  assert.equal(attendee.lookups.users.length, 2);

  const organizer = await harness(t, { user: localUser(['organizer']) });
  assert.equal((await organizer.request('/organizer')).status, 204);
  assert.equal((await organizer.request('/attendee')).status, 403);

  const both = await harness(t, { user: localUser(['attendee', 'organizer']) });
  assert.equal((await both.request('/attendee')).status, 204);
  assert.equal((await both.request('/organizer')).status, 204);
  assert.throws(() => requireRole('admin'), {
    message: 'Unsupported EventNest role',
  });
});

test('missing authentication returns 401, and public routes stay accessible', async (t) => {
  const app = await harness(t, {
    auth: { isAuthenticated: false, userId: null },
  });
  assert.equal((await app.request('/public')).status, 200);
  assert.equal((await app.request('/attendee')).status, 401);
  assert.equal((await app.request(`/venues/${venueId}`)).status, 401);
  assert.equal((await app.request('/unprotected-role-guard')).status, 401);
  assert.deepEqual(app.lookups, { users: [], venues: [], events: [] });
});

test('organizers can read and modify only their own venues and events', async (t) => {
  const owner = await harness(t, { user: localUser(['organizer']) });
  for (const path of [`/venues/${venueId}`, `/events/${eventId}`]) {
    assert.equal((await owner.request(path)).status, 204);
    assert.equal((await owner.request(path, { method: 'PATCH' })).status, 204);
  }
  assert.deepEqual(owner.lookups.venues[0], {
    id: venueId,
    projection: { organizerId: 1 },
  });
  assert.deepEqual(owner.lookups.events[0], {
    id: eventId,
    projection: { organizerId: 1 },
  });

  const foreign = await harness(t, {
    user: localUser(['organizer']),
    venueOwner: otherUserId,
    eventOwner: otherUserId,
  });
  for (const path of [`/venues/${venueId}`, `/events/${eventId}`]) {
    assert.equal((await foreign.request(path)).status, 403);
    assert.equal(
      (await foreign.request(path, { method: 'PATCH' })).status,
      403,
    );
  }
});

test('owner guards reject attendees and ignore client-supplied ownership claims', async (t) => {
  const attendee = await harness(t);
  assert.equal((await attendee.request(`/venues/${venueId}`)).status, 403);
  assert.equal((await attendee.request(`/events/${eventId}`)).status, 403);
  assert.deepEqual(attendee.lookups.venues, []);
  assert.deepEqual(attendee.lookups.events, []);

  const foreign = await harness(t, {
    user: localUser(['organizer']),
    venueOwner: otherUserId,
  });
  const response = await foreign.request(
    `/venues/${venueId}?organizerId=${userId}`,
    {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-user-id': String(userId),
      },
      body: JSON.stringify({ organizerId: String(userId) }),
    },
  );
  assert.equal(response.status, 403);
  assert.deepEqual(foreign.lookups.venues, [
    { id: venueId, projection: { organizerId: 1 } },
  ]);
});

test('missing resources return 404 and malformed IDs return 400 without a query', async (t) => {
  const app = await harness(t, { user: localUser(['organizer']) });
  assert.equal((await app.request(`/venues/${missingId}`)).status, 404);
  assert.equal((await app.request(`/events/${missingId}`)).status, 404);
  assert.equal((await app.request('/venues/not-an-object-id')).status, 400);
  assert.equal((await app.request('/events/not-an-object-id')).status, 400);
  assert.equal(app.lookups.venues.length, 1);
  assert.equal(app.lookups.events.length, 1);
});

test('database failures reach error handling without exposing details', async (t) => {
  const app = await harness(t, {
    user: localUser(['organizer']),
    lookupError: new Error('database credentials and connection detail'),
  });
  const response = await app.request(`/venues/${venueId}`);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});
