import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import { createTicketService } from './service.js';

const userId = new mongoose.Types.ObjectId();
const ticketId = new mongoose.Types.ObjectId().toString();

async function harness(t, authenticated = true) {
  const calls = [];
  const ticketService = {
    async list(id, query) {
      calls.push(['list', id, query]);
      return { items: [], ...query, total: 0 };
    },
    async get(id, resourceId) {
      calls.push(['get', id, resourceId]);
      return { _id: resourceId, status: 'valid' };
    },
    async history(id, query) {
      calls.push(['history', id, query]);
      return { items: [], ...query, total: 0 };
    },
  };
  const app = createApp({
    ticketService,
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
  return {
    calls,
    request: (path) =>
      fetch(`http://127.0.0.1:${server.address().port}${path}`),
  };
}

test('ticket and booking history routes are private and paginated', async (t) => {
  const user = await harness(t);
  assert.equal((await user.request('/api/tickets?page=2&limit=5')).status, 200);
  assert.equal((await user.request(`/api/tickets/${ticketId}`)).status, 200);
  assert.equal((await user.request('/api/bookings')).status, 200);
  assert.deepEqual(
    user.calls.map((call) => call[0]),
    ['list', 'get', 'history'],
  );
  assert.equal(String(user.calls[0][1]), String(userId));
  assert.equal((await user.request('/api/tickets?limit=1000')).status, 400);
  const guest = await harness(t, false);
  assert.equal((await guest.request('/api/tickets')).status, 401);
  assert.equal((await guest.request('/api/bookings')).status, 401);
  assert.equal(guest.calls.length, 0);
});

test('ticket service rejects invalid and foreign ticket IDs', async () => {
  let filter;
  const service = createTicketService({
    ticketModel: {
      findOne(value) {
        filter = value;
        return {
          select() {
            return this;
          },
          async populate() {
            return null;
          },
        };
      },
    },
  });
  await assert.rejects(() => service.get(userId, 'bad-id'), { status: 400 });
  await assert.rejects(() => service.get(userId, ticketId), { status: 404 });
  assert.deepEqual(filter, { _id: ticketId, userId });
});

test('booking history batches payment and ticket reads for a page', async () => {
  const reservationId = new mongoose.Types.ObjectId();
  const reservation = { _id: reservationId, status: 'confirmed' };
  const payment = {
    reservationId,
    status: 'successful',
    refundStatus: 'pending',
  };
  const ticket = { reservationId, status: 'valid' };
  const calls = [];
  const listQuery = (items) => ({
    select() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    async populate() {
      return items;
    },
  });
  const service = createTicketService({
    reservationModel: {
      find(filter) {
        calls.push(['reservations', filter]);
        return listQuery([reservation]);
      },
      async countDocuments() {
        return 1;
      },
    },
    paymentModel: {
      find(filter) {
        calls.push(['payments', filter]);
        return {
          select(fields) {
            calls.push(['payment fields', fields]);
            return this;
          },
          async sort() {
            return [payment];
          },
        };
      },
    },
    ticketModel: {
      find(filter) {
        calls.push(['tickets', filter]);
        return {
          async select() {
            return [ticket];
          },
        };
      },
    },
  });
  const result = await service.history(userId, { page: 1, limit: 20 });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].ticketCounts.valid, 1);
  assert.equal(result.items[0].payments[0].status, 'successful');
  assert.equal(result.items[0].payments[0].refundStatus, 'pending');
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[1][1], {
    userId,
    reservationId: { $in: [reservationId] },
  });
  assert.match(calls[2][1], /refundStatus/);
});
