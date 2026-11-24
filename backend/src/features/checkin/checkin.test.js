import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { createCheckinRouter } from './routes.js';
import { createCheckinService } from './service.js';

const organizerId = new mongoose.Types.ObjectId();
const foreignId = new mongoose.Types.ObjectId();
const eventId = new mongoose.Types.ObjectId().toString();
const ticketId = new mongoose.Types.ObjectId();
const token = 'A'.repeat(43);

test('QR check-in hashes token and atomically rejects duplicate scans', async () => {
  let ticketStatus = 'valid';
  let observedHash;
  const service = createCheckinService({
    runTransaction: (operation) => operation({}),
    eventModel: {
      async findOneAndUpdate(filter) {
        assert.equal(
          filter.startDate.$lte.toISOString(),
          '2026-11-24T10:00:00.000Z',
        );
        assert.equal(
          filter.endDate.$gte.toISOString(),
          '2026-11-24T08:00:00.000Z',
        );
        return { status: 'published' };
      },
    },
    credentialModel: {
      async findOneAndUpdate(filter, update) {
        observedHash = filter.tokenHash;
        assert.equal(filter.status, 'active');
        assert.deepEqual(update, { $inc: { __v: 1 } });
        return { ticketId, status: 'active' };
      },
    },
    ticketModel: {
      async findOneAndUpdate(filter, update) {
        assert.equal(filter.eventId, eventId);
        assert.equal(filter.status, 'valid');
        if (ticketStatus !== 'valid') return null;
        ticketStatus = update.$set.status;
        return {
          _id: ticketId,
          status: ticketStatus,
          usedAt: update.$set.usedAt,
        };
      },
      async findById() {
        return { eventId, status: ticketStatus };
      },
    },
    now: () => new Date('2026-11-24T08:00:00Z'),
  });
  const result = await service.checkIn(eventId, organizerId, token);
  assert.equal(result.status, 'used');
  assert.equal(observedHash, createHash('sha256').update(token).digest('hex'));
  assert.notEqual(observedHash, token);
  await assert.rejects(() => service.checkIn(eventId, organizerId, token), {
    status: 409,
    code: 'ALREADY_USED',
  });
});

test('revoked, malformed, missing and wrong-event tokens fail safely', async () => {
  let credential = null;
  let ticket = null;
  const service = createCheckinService({
    runTransaction: (operation) => operation({}),
    eventModel: {
      async findOneAndUpdate() {
        return { status: 'published' };
      },
    },
    credentialModel: {
      async findOneAndUpdate() {
        return credential?.status === 'active' ? credential : null;
      },
    },
    ticketModel: {
      async findOneAndUpdate() {
        return null;
      },
      async findById() {
        return ticket;
      },
    },
  });
  await assert.rejects(() => service.checkIn(eventId, organizerId, 'bad'), {
    status: 400,
  });
  await assert.rejects(() => service.checkIn(eventId, organizerId, token), {
    status: 422,
  });
  credential = { ticketId, status: 'revoked' };
  await assert.rejects(() => service.checkIn(eventId, organizerId, token), {
    status: 422,
  });
  credential.status = 'active';
  ticket = { eventId: new mongoose.Types.ObjectId(), status: 'valid' };
  await assert.rejects(() => service.checkIn(eventId, organizerId, token), {
    status: 422,
    code: 'INVALID_QR',
  });
});

test('cancelled and completed events cannot accept a check-in', async () => {
  let status = 'cancelled';
  const service = createCheckinService({
    runTransaction: (operation) => operation({}),
    eventModel: {
      async findOneAndUpdate() {
        return null;
      },
      async findById() {
        return { status };
      },
    },
    credentialModel: {
      async findOneAndUpdate() {
        return { ticketId, status: 'active' };
      },
    },
  });
  await assert.rejects(() => service.checkIn(eventId, organizerId, token), {
    status: 409,
    code: 'EVENT_NOT_OPEN',
  });
  status = 'completed';
  await assert.rejects(() => service.checkIn(eventId, organizerId, token), {
    status: 409,
    code: 'EVENT_NOT_OPEN',
  });
});

async function harness(
  t,
  { authenticated = true, owner = organizerId, roles = ['organizer'] } = {},
) {
  let called = false;
  const app = express();
  app.use(express.json());
  app.use(
    '/api/organizer/events',
    createCheckinRouter({
      userModel: {
        async findOne() {
          return {
            _id: organizerId,
            roles,
            accountStatus: 'active',
            verification: { emailVerified: true },
          };
        },
      },
      readAuth: () => ({
        isAuthenticated: authenticated,
        userId: authenticated ? 'clerk_1' : null,
      }),
      eventModel: {
        async findById() {
          return { organizerId: owner };
        },
      },
      checkinService: {
        async checkIn() {
          called = true;
          return { ticketId, status: 'used' };
        },
      },
    }),
  );
  app.use((error, _request, response, _next) => {
    if (error instanceof ApiError)
      response.status(error.status).json({ error: { code: error.code } });
    else response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
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
    request: (body) =>
      fetch(
        `http://127.0.0.1:${server.address().port}/api/organizer/events/${eventId}/check-ins`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),
    called: () => called,
  };
}

test('check-in route enforces organizer ownership before invoking service', async (t) => {
  const owner = await harness(t);
  assert.equal((await owner.request({ token })).status, 200);
  assert.equal(owner.called(), true);
  const foreign = await harness(t, { owner: foreignId });
  assert.equal((await foreign.request({ token })).status, 403);
  assert.equal(foreign.called(), false);
  const attendee = await harness(t, { roles: ['attendee'] });
  assert.equal((await attendee.request({ token })).status, 403);
  assert.equal(attendee.called(), false);
  const guest = await harness(t, { authenticated: false });
  assert.equal((await guest.request({ token })).status, 401);
  assert.equal(guest.called(), false);
});
