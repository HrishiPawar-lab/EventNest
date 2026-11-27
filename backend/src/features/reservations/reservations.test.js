import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import { createReservationService } from './service.js';

const userId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const eventId = new mongoose.Types.ObjectId().toString();
const reservationId = new mongoose.Types.ObjectId().toString();
const at = new Date('2026-11-24T08:00:00.000Z');

async function harness(t, authenticated = true) {
  const calls = [];
  const service = {
    async create(id, input) {
      calls.push(['create', id, input]);
      return { _id: reservationId, ...input };
    },
    async get(id, resourceId) {
      calls.push(['get', id, resourceId]);
      return { _id: resourceId };
    },
    async cancel(id, resourceId) {
      calls.push(['cancel', id, resourceId]);
    },
  };
  const app = createApp({
    reservationService: service,
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
  return { calls, request };
}

test('reservation routes use local identity and validate bodies', async (t) => {
  const app = await harness(t);
  assert.equal(
    (await app.request('/api/reservations', 'POST', { eventId, quantity: 2 }))
      .status,
    201,
  );
  assert.equal(
    (await app.request(`/api/reservations/${reservationId}`)).status,
    200,
  );
  assert.equal(
    (await app.request(`/api/reservations/${reservationId}`, 'DELETE')).status,
    204,
  );
  assert.equal(String(app.calls[0][1]), String(userId));
  for (const body of [
    { eventId, quantity: 0 },
    { eventId, quantity: 1.5 },
    { eventId, quantity: 1, userId: 'forged' },
    {},
  ]) {
    assert.equal(
      (await app.request('/api/reservations', 'POST', body)).status,
      400,
    );
  }
  assert.equal(app.calls.length, 3);
  const guest = await harness(t, false);
  assert.equal(
    (await guest.request('/api/reservations', 'POST', { eventId, quantity: 1 }))
      .status,
    401,
  );
});

function makeService({
  capacity = 3,
  sold = 0,
  reserved = 0,
  expired = [],
  ticketPrice = 500,
} = {}) {
  const state = { capacity, sold, reserved, expired, reservations: [] };
  const eventModel = {
    async findOneAndUpdate(filter, change) {
      assert.equal(filter.status, 'published');
      const quantity = change.$inc.ticketsReserved;
      assert.deepEqual(filter.ticketPrice, { $gte: 1 / quantity });
      assert.deepEqual(filter.$expr, {
        $lte: [
          { $add: ['$ticketsSold', '$ticketsReserved', quantity] },
          '$maxAttendees',
        ],
      });
      if (
        ticketPrice < filter.ticketPrice.$gte ||
        state.capacity - state.sold - state.reserved < quantity
      )
        return null;
      state.reserved += quantity;
      return { _id: eventId };
    },
    exists(filter) {
      return {
        session: async () =>
          filter.ticketPrice ? ticketPrice >= filter.ticketPrice.$gte : true,
      };
    },
    async updateOne(_filter, change) {
      state.reserved += change.$inc.ticketsReserved;
      return { modifiedCount: 1 };
    },
  };
  class Reservation {
    constructor(value) {
      Object.assign(this, value);
      this._id = new mongoose.Types.ObjectId();
    }
    async save() {
      state.reservations.push(this);
    }
    static find() {
      return {
        select() {
          return this;
        },
        session: async () =>
          state.expired.filter((item) => item.status === 'pending'),
      };
    }
    static exists(filter) {
      return {
        session: async () =>
          state.reservations.some(
            (reservation) =>
              String(reservation.userId) === String(filter.userId) &&
              String(reservation.eventId) === String(filter.eventId) &&
              reservation.status === 'pending' &&
              reservation.expiresAt > filter.expiresAt.$gt,
          ),
      };
    }
    static async updateMany() {
      const active = state.expired.filter((item) => item.status === 'pending');
      for (const item of active) item.status = 'expired';
      return { modifiedCount: active.length };
    }
  }
  const service = createReservationService({
    reservationModel: Reservation,
    eventModel,
    runTransaction: async (operation) => operation({}),
    now: () => at,
  });
  return { service, state };
}

test('atomic capacity predicate prevents concurrent oversell and holds last five minutes', async () => {
  const { service, state } = makeService({ capacity: 3 });
  const outcomes = await Promise.allSettled([
    service.create(userId, { eventId, quantity: 2 }),
    service.create(otherUserId, { eventId, quantity: 2 }),
  ]);
  assert.equal(
    outcomes.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.equal(
    outcomes.filter(
      (result) =>
        result.status === 'rejected' && result.reason.code === 'SOLD_OUT',
    ).length,
    1,
  );
  assert.equal(state.reserved, 2);
  assert.equal(state.reservations.length, 1);
  assert.equal(
    state.reservations[0].expiresAt.getTime() - at.getTime(),
    300000,
  );
});

test('expired holds release counters before new reservation', async () => {
  const expired = [
    {
      _id: new mongoose.Types.ObjectId(),
      eventId,
      quantity: 2,
      status: 'pending',
    },
  ];
  const { service, state } = makeService({ capacity: 3, reserved: 2, expired });
  await service.create(userId, { eventId, quantity: 3 });
  assert.equal(expired[0].status, 'expired');
  assert.equal(state.reserved, 3);
});

test('invalid event ID and quantity are rejected before inventory writes', async () => {
  const { service, state } = makeService();
  await assert.rejects(
    () => service.create(userId, { eventId: 'bad', quantity: 1 }),
    { status: 400 },
  );
  await assert.rejects(
    () => service.create(userId, { eventId, quantity: -1 }),
    { status: 400 },
  );
  await assert.rejects(
    () => service.create(userId, { eventId, quantity: 11 }),
    { status: 400 },
  );
  assert.equal(state.reserved, 0);
});

test('orders below INR 1 cannot reserve inventory, but a sufficient quantity can', async () => {
  const { service, state } = makeService({ capacity: 10, ticketPrice: 0.25 });
  await assert.rejects(() => service.create(userId, { eventId, quantity: 3 }), {
    status: 409,
    code: 'ORDER_AMOUNT_TOO_LOW',
  });
  assert.equal(state.reserved, 0);
  assert.equal(state.reservations.length, 0);
  await service.create(userId, { eventId, quantity: 4 });
  assert.equal(state.reserved, 4);
});

test('one user cannot hold the same event twice while a reservation is active', async () => {
  const { service, state } = makeService({ capacity: 20 });
  await service.create(userId, { eventId, quantity: 1 });
  await assert.rejects(() => service.create(userId, { eventId, quantity: 1 }), {
    status: 409,
    code: 'ACTIVE_HOLD',
  });
  assert.equal(state.reserved, 1);
  assert.equal(state.reservations.length, 1);
});

test('cancellation of an expired hold commits release before reporting conflict', async () => {
  const pending = {
    _id: new mongoose.Types.ObjectId(reservationId),
    eventId,
    userId,
    quantity: 2,
    status: 'pending',
    expiresAt: new Date(at.getTime() - 1),
  };
  let reserved = 2;
  const service = createReservationService({
    reservationModel: {
      findOne() {
        return { session: async () => pending };
      },
      find() {
        return {
          select() {
            return this;
          },
          session: async () => (pending.status === 'pending' ? [pending] : []),
        };
      },
      async updateMany() {
        pending.status = 'expired';
        return { modifiedCount: 1 };
      },
    },
    eventModel: {
      async updateOne(_filter, update) {
        reserved += update.$inc.ticketsReserved;
        return { modifiedCount: 1 };
      },
    },
    runTransaction: async (operation) => operation({}),
    now: () => at,
  });
  await assert.rejects(() => service.cancel(userId, reservationId), {
    status: 409,
    code: 'RESERVATION_EXPIRED',
  });
  assert.equal(pending.status, 'expired');
  assert.equal(reserved, 0);
});
