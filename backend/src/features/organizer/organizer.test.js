import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import { createOrganizerService } from './service.js';

const organizerId = new mongoose.Types.ObjectId();
const eventId = new mongoose.Types.ObjectId().toString();

async function harness(
  t,
  { authenticated = true, roles = ['organizer'] } = {},
) {
  const calls = [];
  const organizerService = {
    async dashboard(id) {
      calls.push(['dashboard', id]);
      return { eventCount: 1 };
    },
    async eventAnalytics(id, resourceId) {
      calls.push(['analytics', id, resourceId]);
      return { eventId: resourceId };
    },
    async attendees(id, resourceId, query) {
      calls.push(['attendees', id, resourceId, query]);
      return { items: [], ...query, total: 0 };
    },
  };
  const app = createApp({
    organizerService,
    readAuth: () => ({
      isAuthenticated: authenticated,
      userId: authenticated ? 'clerk_1' : null,
    }),
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

test('organizer reporting routes require active organizer and derive identity', async (t) => {
  const owner = await harness(t);
  assert.equal((await owner.request('/api/organizer/dashboard')).status, 200);
  assert.equal(
    (await owner.request(`/api/organizer/events/${eventId}/analytics`)).status,
    200,
  );
  assert.equal(
    (
      await owner.request(
        `/api/organizer/events/${eventId}/attendees?page=2&limit=5`,
      )
    ).status,
    200,
  );
  assert.deepEqual(
    owner.calls.map((call) => call[0]),
    ['dashboard', 'analytics', 'attendees'],
  );
  assert.equal(String(owner.calls[0][1]), String(organizerId));
  assert.deepEqual(owner.calls[2][3], { page: 2, limit: 5 });
  assert.equal(
    (
      await owner.request(
        `/api/organizer/events/${eventId}/attendees?limit=1000`,
      )
    ).status,
    400,
  );
  const attendee = await harness(t, { roles: ['attendee'] });
  assert.equal(
    (await attendee.request('/api/organizer/dashboard')).status,
    403,
  );
  const guest = await harness(t, { authenticated: false });
  assert.equal((await guest.request('/api/organizer/dashboard')).status, 401);
});

test('event analytics and attendee reads require organizer ownership', async () => {
  const otherId = new mongoose.Types.ObjectId();
  const service = createOrganizerService({
    eventModel: {
      async findOne() {
        return null;
      },
    },
  });
  await assert.rejects(() => service.eventAnalytics(otherId, eventId), {
    status: 404,
  });
  await assert.rejects(
    () => service.attendees(otherId, eventId, { page: 1, limit: 20 }),
    { status: 404 },
  );
  await assert.rejects(() => service.eventAnalytics(otherId, 'bad-id'), {
    status: 400,
  });
});

test('analytics distinguishes active holds and ticket statuses', async () => {
  const event = {
    _id: new mongoose.Types.ObjectId(eventId),
    maxAttendees: 10,
    ticketsSold: 3,
    ticketsReserved: 2,
  };
  let holdFilter;
  const service = createOrganizerService({
    eventModel: {
      async findOne() {
        return event;
      },
    },
    ticketModel: {
      async aggregate() {
        return [
          { _id: 'valid', count: 2 },
          { _id: 'used', count: 1 },
        ];
      },
    },
    reservationModel: {
      async countDocuments(filter) {
        holdFilter = filter;
        return 1;
      },
    },
    paymentModel: {
      async aggregate() {
        return [{ paidAmount: 1500, successfulPayments: 1 }];
      },
    },
    now: () => new Date('2026-11-24T08:00:00Z'),
  });
  const result = await service.eventAnalytics(organizerId, eventId);
  assert.equal(result.available, 5);
  assert.equal(result.ticketCounts.valid, 2);
  assert.equal(result.ticketCounts.used, 1);
  assert.equal(result.activeHolds, 1);
  assert.equal(result.paidAmount, 1500);
  assert.equal(holdFilter.status, 'pending');
  assert.ok(holdFilter.expiresAt.$gt instanceof Date);
});
