import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import { createWishlistService } from './service.js';

const userId = new mongoose.Types.ObjectId();
const eventId = new mongoose.Types.ObjectId().toString();

async function harness(t, authenticated = true) {
  const calls = [];
  const service = {
    async add(id, resourceId) {
      calls.push(['add', id, resourceId]);
      return { eventId: resourceId, saved: true };
    },
    async remove(id, resourceId) {
      calls.push(['remove', id, resourceId]);
    },
    async list(id, query) {
      calls.push(['list', id, query]);
      return { items: [], ...query, total: 0 };
    },
  };
  const app = createApp({
    wishlistService: service,
    readAuth: () => ({
      isAuthenticated: authenticated,
      userId: authenticated ? 'clerk_1' : null,
    }),
    userModel: {
      async findOne() {
        return {
          _id: userId,
          roles: ['attendee'],
          accountStatus: 'active',
          verification: { emailVerified: true },
        };
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
  const request = (path, method = 'GET') =>
    fetch(`http://127.0.0.1:${server.address().port}${path}`, { method });
  return { calls, request };
}

test('wishlist routes use authenticated local identity and support pagination', async (t) => {
  const app = await harness(t);
  const saved = await app.request(`/api/wishlist/${eventId}`, 'PUT');
  assert.equal(saved.status, 200);
  assert.deepEqual((await saved.json()).data, { eventId, saved: true });
  const list = await app.request('/api/wishlist?page=2&limit=5');
  assert.equal(list.status, 200);
  assert.deepEqual((await list.json()).pagination, {
    page: 2,
    limit: 5,
    total: 0,
  });
  assert.equal(
    (await app.request(`/api/wishlist/${eventId}`, 'DELETE')).status,
    204,
  );
  assert.deepEqual(
    app.calls.map((call) => call[0]),
    ['add', 'list', 'remove'],
  );
  assert.equal(String(app.calls[0][1]), String(userId));
  assert.deepEqual(app.calls[1][2], { page: 2, limit: 5 });
});

test('wishlist routes reject guests and invalid query parameters', async (t) => {
  const guest = await harness(t, false);
  assert.equal((await guest.request('/api/wishlist')).status, 401);
  assert.equal(
    (await guest.request(`/api/wishlist/${eventId}`, 'PUT')).status,
    401,
  );
  assert.equal(guest.calls.length, 0);
  const user = await harness(t);
  assert.equal((await user.request('/api/wishlist?limit=500')).status, 400);
  assert.equal(user.calls.length, 0);
});

test('wishlist service validates event and makes writes idempotent', async () => {
  const writes = [];
  const service = createWishlistService({
    eventModel: {
      async exists(filter) {
        return filter._id === eventId;
      },
    },
    wishlistModel: {
      async updateOne(filter, update, options) {
        writes.push(['upsert', filter, update, options]);
      },
      async deleteOne(filter) {
        writes.push(['delete', filter]);
      },
    },
  });
  assert.deepEqual(await service.add(userId, eventId), {
    eventId,
    saved: true,
  });
  await service.remove(userId, eventId);
  await service.remove(userId, eventId);
  assert.equal(writes.length, 3);
  assert.deepEqual(writes[0][3], { upsert: true });
  assert.deepEqual(writes[1][1], { userId, eventId });
  await assert.rejects(() => service.add(userId, 'bad-id'), { status: 400 });
  await assert.rejects(
    () => service.add(userId, new mongoose.Types.ObjectId().toString()),
    { status: 404 },
  );
});

test('duplicate upsert race is treated as already saved, other failures propagate', async () => {
  let failure = { code: 11000 };
  const service = createWishlistService({
    eventModel: {
      async exists() {
        return true;
      },
    },
    wishlistModel: {
      async updateOne() {
        throw failure;
      },
    },
  });
  assert.deepEqual(await service.add(userId, eventId), {
    eventId,
    saved: true,
  });
  failure = new Error('database unavailable');
  await assert.rejects(
    () => service.add(userId, eventId),
    /database unavailable/,
  );
});
