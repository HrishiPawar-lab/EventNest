import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import { createVenueService } from './service.js';
import { parseVenueBody } from './validation.js';

const organizerId = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const venueId = new mongoose.Types.ObjectId().toString();
const validVenue = {
  name: 'The Orange Room',
  type: 'club',
  address: { city: 'Mumbai', country: 'India' },
  location: { type: 'Point', coordinates: [72.8777, 19.076] },
  capacity: 200,
};

async function harness(
  t,
  { roles = ['organizer'], authenticated = true } = {},
) {
  const calls = [];
  const user = {
    _id: organizerId,
    roles,
    accountStatus: 'active',
    verification: { emailVerified: true },
  };
  const service = {
    async create(id, input) {
      calls.push(['create', id, input]);
      return { _id: venueId, ...input };
    },
    async list(id, query) {
      calls.push(['list', id, query]);
      return { items: [], ...query, total: 0 };
    },
    async get(id, resourceId) {
      calls.push(['get', id, resourceId]);
      return { _id: resourceId };
    },
    async update(id, resourceId, input) {
      calls.push(['update', id, resourceId, input]);
      return { _id: resourceId, ...input };
    },
    async remove(id, resourceId) {
      calls.push(['remove', id, resourceId]);
    },
  };
  const app = createApp({
    venueService: service,
    readAuth: () => ({
      isAuthenticated: authenticated,
      userId: authenticated ? 'clerk_1' : null,
    }),
    userModel: {
      async findOne() {
        return user;
      },
    },
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const request = (path, method = 'GET', body) =>
    fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });
  return { request, calls };
}

test('organizer can create, list, read, update, and delete a venue', async (t) => {
  const { request, calls } = await harness(t);
  assert.equal((await request('/api/venues', 'POST', validVenue)).status, 201);
  const list = await request('/api/venues?page=2&limit=5');
  assert.equal(list.status, 200);
  assert.deepEqual((await list.json()).pagination, {
    page: 2,
    limit: 5,
    total: 0,
  });
  assert.equal((await request(`/api/venues/${venueId}`)).status, 200);
  assert.equal(
    (await request(`/api/venues/${venueId}`, 'PATCH', { name: 'Updated' }))
      .status,
    200,
  );
  assert.equal((await request(`/api/venues/${venueId}`, 'DELETE')).status, 204);
  assert.equal(calls.length, 5);
  assert.equal(String(calls[0][1]), String(organizerId));
});

test('venue routes require authentication and organizer role', async (t) => {
  const guest = await harness(t, { authenticated: false });
  assert.equal((await guest.request('/api/venues')).status, 401);
  assert.equal(
    (await guest.request('/api/venues', 'POST', validVenue)).status,
    401,
  );
  assert.equal(guest.calls.length, 0);
  const attendee = await harness(t, { roles: ['attendee'] });
  assert.equal((await attendee.request('/api/venues')).status, 403);
  assert.equal((await attendee.request(`/api/venues/${venueId}`)).status, 403);
  assert.equal(attendee.calls.length, 0);
});

test('invalid input and client ownership claims are rejected at the boundary', async (t) => {
  const { request, calls } = await harness(t);
  for (const body of [
    { ...validVenue, organizerId: String(otherId) },
    { ...validVenue, capacity: -1 },
    { ...validVenue, type: 'stadium' },
    { ...validVenue, location: { type: 'Point', coordinates: [200, 0] } },
    { ...validVenue, address: { city: 'Mumbai' } },
  ]) {
    const response = await request('/api/venues', 'POST', body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal((await request('/api/venues?limit=1000')).status, 400);
  assert.equal(
    (await request(`/api/venues/${venueId}`, 'PATCH', {})).status,
    400,
  );
  assert.equal(calls.length, 0);
});

test('service enforces ownership and protects linked events', async () => {
  const checks = [];
  const venue = {
    _id: venueId,
    organizerId,
    capacity: 200,
    address: {
      city: 'Mumbai',
      state: 'MH',
      country: 'India',
      toObject() {
        return { city: 'Mumbai', state: 'MH', country: 'India' };
      },
    },
    set(value) {
      Object.assign(this, value);
    },
    async save() {
      checks.push('save');
    },
    async deleteOne() {
      checks.push('delete');
    },
  };
  const service = createVenueService({
    runTransaction: async (operation) => operation(),
    venueModel: {
      async findById(id) {
        return id === venueId ? venue : null;
      },
    },
    eventModel: {
      async exists(filter) {
        checks.push(filter);
        return true;
      },
    },
  });
  await assert.rejects(() => service.get(otherId, venueId), { status: 403 });
  await assert.rejects(() => service.get(organizerId, 'bad-id'), {
    status: 400,
  });
  await assert.rejects(
    () => service.update(organizerId, venueId, { capacity: 100 }),
    { status: 409, code: 'CAPACITY_CONFLICT' },
  );
  await assert.rejects(
    () => service.update(organizerId, venueId, { address: { city: 'Delhi' } }),
    { status: 409, code: 'VENUE_IN_USE' },
  );
  await assert.rejects(() => service.remove(organizerId, venueId), {
    status: 409,
    code: 'VENUE_IN_USE',
  });
  assert.equal(checks.includes('save'), false);
  assert.equal(checks.includes('delete'), false);
});

test('valid venue input remains schema compatible', async () => {
  const input = parseVenueBody(validVenue);
  const { Venue } = await import('../../models/Venue.js');
  const venue = new Venue({ ...input, organizerId });
  await venue.validate();
});
