import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { Event } from '../../models/Event.js';
import {
  createOrganizerEventRouter,
  createPublicEventRouter,
} from './routes.js';
import { createEventService } from './service.js';
import { parseEventBody } from './validation.js';

const organizerId = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const venueId = new mongoose.Types.ObjectId().toString();
const anotherVenueId = new mongoose.Types.ObjectId().toString();
const eventId = new mongoose.Types.ObjectId().toString();
const validBody = {
  venueId,
  name: 'Live Concert',
  startDate: '2027-02-01T18:00:00.000Z',
  endDate: '2027-02-01T21:00:00.000Z',
  maxAttendees: 100,
  ticketPrice: 500,
};

async function routeHarness(
  t,
  { role = 'organizer', authenticated = true } = {},
) {
  const calls = [];
  const service = {
    async listPublic(query) {
      calls.push(['listPublic', query]);
      return { items: [], total: 0, page: query.page, limit: query.limit };
    },
    async getPublic(id) {
      calls.push(['getPublic', id]);
      return { _id: id, status: 'published' };
    },
    async create(id, input) {
      calls.push(['create', id, input]);
      return { _id: eventId, status: 'draft', ...input };
    },
    async listOrganizer(id, query) {
      calls.push(['listOrganizer', id, query]);
      return { items: [], total: 0, page: query.page, limit: query.limit };
    },
    async getOrganizer(id, resourceId) {
      calls.push(['getOrganizer', id, resourceId]);
      return { _id: resourceId };
    },
    async update(id, resourceId, input) {
      calls.push(['update', id, resourceId, input]);
      return { _id: resourceId, ...input };
    },
    async publish(id, resourceId) {
      calls.push(['publish', id, resourceId]);
      return { _id: resourceId, status: 'published' };
    },
    async cancel(id, resourceId) {
      calls.push(['cancel', id, resourceId]);
      return { _id: resourceId, status: 'cancelled' };
    },
  };
  const app = express();
  app.use(express.json());
  app.use('/api/events', createPublicEventRouter({ eventService: service }));
  app.use(
    '/api/organizer/events',
    createOrganizerEventRouter({
      eventService: service,
      readAuth: () => ({
        isAuthenticated: authenticated,
        userId: authenticated ? 'clerk_1' : null,
      }),
      userModel: {
        async findOne() {
          return {
            _id: organizerId,
            roles: [role],
            accountStatus: 'active',
            verification: { emailVerified: true },
          };
        },
      },
    }),
  );
  app.use((error, _request, response, _next) => {
    if (error instanceof ApiError) {
      response
        .status(error.status)
        .json({ error: { code: error.code, message: error.message } });
      return;
    }
    response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
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

test('public discovery and details require no local account', async (t) => {
  const { request, calls } = await routeHarness(t, { authenticated: false });
  const list = await request(
    '/api/events?q=Rock.%2A&city=Mumbai&minPrice=0&page=2&limit=5',
  );
  assert.equal(list.status, 200);
  assert.deepEqual((await list.json()).pagination, {
    page: 2,
    limit: 5,
    total: 0,
  });
  assert.equal(calls[0][0], 'listPublic');
  assert.equal(calls[0][1].q, 'Rock.*');
  assert.equal(calls[0][1].minPrice, 0);
  assert.equal((await request(`/api/events/${eventId}`)).status, 200);
  assert.deepEqual(calls[1], ['getPublic', eventId]);
});

test('organizer routes derive ownership from Clerk account and reject client state fields', async (t) => {
  const { request, calls } = await routeHarness(t);
  const created = await request('/api/organizer/events', 'POST', validBody);
  assert.equal(created.status, 201);
  assert.equal(calls[0][0], 'create');
  assert.equal(String(calls[0][1]), String(organizerId));
  assert.ok(calls[0][2].startDate instanceof Date);
  assert.equal(
    (await request('/api/organizer/events?status=draft')).status,
    200,
  );
  assert.equal((await request(`/api/organizer/events/${eventId}`)).status, 200);
  assert.equal(
    (
      await request(`/api/organizer/events/${eventId}`, 'PATCH', {
        name: 'Updated',
      })
    ).status,
    200,
  );
  for (const body of [
    { ...validBody, organizerId: String(otherId) },
    { ...validBody, status: 'published' },
    { ...validBody, ticketsSold: 1 },
    { ...validBody, imageUrl: 'https://example.com/a.jpg' },
    { ...validBody, endDate: validBody.startDate },
    { ...validBody, maxAttendees: -1 },
    { ...validBody, ticketPrice: 1.001 },
    { ...validBody, ticketPrice: 1.000000001 },
  ]) {
    const response = await request('/api/organizer/events', 'POST', body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal(
    (await request(`/api/organizer/events/${eventId}`, 'PATCH', {})).status,
    400,
  );
  assert.equal(
    (
      await request(`/api/organizer/events/${eventId}`, 'PATCH', {
        ticketPrice: 1.001,
      })
    ).status,
    400,
  );
  assert.equal(calls.length, 4);
});

test('organizer publish and cancel routes reject transition payloads and pass local owner ID', async (t) => {
  const { request, calls } = await routeHarness(t);
  assert.equal(
    (await request(`/api/organizer/events/${eventId}/publish`, 'POST', {}))
      .status,
    200,
  );
  assert.equal(
    (await request(`/api/organizer/events/${eventId}/cancel`, 'POST', {}))
      .status,
    200,
  );
  assert.deepEqual(
    calls.map(([name, id, resourceId]) => [name, String(id), resourceId]),
    [
      ['publish', String(organizerId), eventId],
      ['cancel', String(organizerId), eventId],
    ],
  );
  for (const path of [
    `/api/organizer/events/${eventId}/publish`,
    `/api/organizer/events/${eventId}/cancel`,
  ]) {
    assert.equal(
      (await request(path, 'POST', { status: 'published' })).status,
      400,
    );
    assert.equal((await request(`${path}?force=true`, 'POST', {})).status, 400);
  }
  assert.equal(calls.length, 2);
});

test('organizer routes reject guests and attendees while public discovery remains available', async (t) => {
  const guest = await routeHarness(t, { authenticated: false });
  assert.equal((await guest.request('/api/organizer/events')).status, 401);
  assert.equal((await guest.request('/api/events')).status, 200);
  const attendee = await routeHarness(t, { role: 'attendee' });
  assert.equal((await attendee.request('/api/organizer/events')).status, 403);
  assert.equal(
    (await attendee.request('/api/organizer/events', 'POST', validBody)).status,
    403,
  );
});

test('query validation rejects unsupported filters and malformed pagination', async (t) => {
  const { request } = await routeHarness(t);
  for (const path of [
    '/api/events?status=draft',
    '/api/events?page=0',
    '/api/events?limit=101',
    '/api/events?from=tomorrow',
    '/api/events?from=2027-02-31T12:00:00Z',
    '/api/events?minPrice=-1',
    '/api/events?minPrice=10&maxPrice=5',
    '/api/organizer/events?foo=bar',
    '/api/organizer/events?status=unknown',
  ]) {
    assert.equal((await request(path)).status, 400);
  }
});

function serviceHarness({
  venue,
  event,
  activeHold = false,
  ticket = false,
  payment = false,
} = {}) {
  const calls = [];
  const session = { id: 'test-session' };
  const foundVenue = venue ?? {
    _id: venueId,
    organizerId,
    capacity: 200,
    address: { city: 'Mumbai', state: 'MH', country: 'India' },
  };
  const venueModel = {
    async findOneAndUpdate(filter, update, options) {
      calls.push(['lockVenue', filter, update, options]);
      return String(filter._id) === String(foundVenue._id) &&
        String(filter.organizerId) === String(foundVenue.organizerId) &&
        foundVenue.capacity >= filter.capacity.$gte
        ? foundVenue
        : null;
    },
    async findById(id, _projection, options) {
      calls.push(['readVenue', id, options]);
      return String(id) === String(foundVenue._id) ? foundVenue : null;
    },
  };
  const existingEvent = event ?? {
    _id: eventId,
    organizerId,
    venueId,
    status: 'draft',
    startDate: new Date(validBody.startDate),
    endDate: new Date(validBody.endDate),
    maxAttendees: 100,
    ticketPrice: 500,
    ticketsSold: 0,
    ticketsReserved: 0,
    set(value) {
      Object.assign(this, value);
    },
    async save(options) {
      calls.push(['saveEvent', options]);
    },
  };
  class EventModel {
    constructor(value) {
      Object.assign(this, value);
    }
    async save(options) {
      calls.push(['saveEvent', options]);
    }
    static async findById(id, _projection, options) {
      calls.push(['readEvent', id, options]);
      return id === eventId ? existingEvent : null;
    }
  }
  const relatedModel = (label, found) => ({
    exists(filter) {
      calls.push([label, filter]);
      return {
        async session(value) {
          calls.push([`${label}Session`, value]);
          return found;
        },
      };
    },
  });
  const service = createEventService({
    eventModel: EventModel,
    venueModel,
    reservationModel: relatedModel('activeHold', activeHold),
    ticketModel: relatedModel('ticket', ticket),
    paymentModel: relatedModel('payment', payment),
    connection: { transaction: async (callback) => callback(session) },
    now: () => new Date('2027-01-01T00:00:00Z'),
  });
  return { service, calls, session, foundVenue, existingEvent };
}

test('draft creation write-locks an owned venue, checks capacity, and copies location in one transaction', async () => {
  const { service, calls, session } = serviceHarness();
  const event = await service.create(organizerId, parseEventBody(validBody));
  assert.equal(event.status, 'draft');
  assert.equal(String(event.organizerId), String(organizerId));
  assert.deepEqual(event.location, {
    city: 'Mumbai',
    state: 'MH',
    country: 'India',
  });
  assert.deepEqual(calls[0][1], {
    _id: venueId,
    organizerId,
    capacity: { $gte: 100 },
  });
  assert.deepEqual(calls[0][2], { $inc: { __v: 1 } });
  assert.equal(calls[0][3].session, session);
  assert.equal(calls[1][1].session, session);
});

test('event creation rejects missing, foreign, and undersized venues', async () => {
  for (const [venue, status] of [
    [{ _id: anotherVenueId, organizerId, capacity: 200 }, 404],
    [{ _id: venueId, organizerId: otherId, capacity: 200 }, 403],
    [{ _id: venueId, organizerId, capacity: 10 }, 409],
  ]) {
    const { service, calls } = serviceHarness({ venue });
    await assert.rejects(
      () => service.create(organizerId, parseEventBody(validBody)),
      { status },
    );
    assert.equal(
      calls.some(([name]) => name === 'saveEvent'),
      false,
    );
  }
});

test('draft update validates current inventory, venue ownership, and copied location', async () => {
  const { service, calls, session, existingEvent } = serviceHarness({
    venue: {
      _id: anotherVenueId,
      organizerId,
      capacity: 150,
      address: { city: 'Delhi', country: 'India' },
    },
  });
  const updated = await service.update(
    organizerId,
    eventId,
    parseEventBody(
      { venueId: anotherVenueId, maxAttendees: 120 },
      { partial: true },
    ),
  );
  assert.equal(updated, existingEvent);
  assert.equal(updated.venueId, anotherVenueId);
  assert.equal(updated.location.city, 'Delhi');
  assert.equal(calls[1][1]._id, anotherVenueId);
  assert.equal(calls.at(-1)[1].session, session);
  existingEvent.ticketsSold = 90;
  existingEvent.ticketsReserved = 20;
  await assert.rejects(
    () => service.update(organizerId, eventId, { maxAttendees: 100 }),
    { status: 409, code: 'CAPACITY_CONFLICT' },
  );
});

test('event updates reject non-drafts, foreign ownership, and invalid date order', async () => {
  const { service, existingEvent } = serviceHarness();
  existingEvent.status = 'published';
  await assert.rejects(
    () => service.update(organizerId, eventId, { name: 'Changed' }),
    { status: 409, code: 'EVENT_NOT_DRAFT' },
  );
  existingEvent.status = 'draft';
  await assert.rejects(
    () => service.update(otherId, eventId, { name: 'Changed' }),
    { status: 403 },
  );
  await assert.rejects(
    () =>
      service.update(organizerId, eventId, {
        startDate: new Date('2027-03-01T00:00:00Z'),
      }),
    { status: 400 },
  );
});

test('publishing checks future date, category, price, venue capacity, and draft state', async () => {
  const validEvent = {
    _id: eventId,
    organizerId,
    venueId,
    status: 'draft',
    startDate: new Date('2027-02-01T18:00:00Z'),
    category: 'music',
    ticketPrice: 500,
    maxAttendees: 100,
    ticketsSold: 0,
    ticketsReserved: 0,
    async save() {},
  };
  const success = serviceHarness({ event: validEvent });
  assert.equal(
    (await success.service.publish(organizerId, eventId)).status,
    'published',
  );
  assert.deepEqual(success.calls[1][2], { $inc: { __v: 1 } });
  assert.equal(success.calls[1][3].session, success.session);
  await assert.rejects(() => success.service.publish(organizerId, eventId), {
    status: 409,
    code: 'INVALID_EVENT_STATE',
  });

  for (const change of [
    { startDate: new Date('2026-12-31T23:00:00Z') },
    { category: ' ' },
    { ticketPrice: 0 },
    { ticketPrice: 1.001 },
    { ticketPrice: 1.000000001 },
    { maxAttendees: 201 },
    { ticketsReserved: 101 },
  ]) {
    const { service } = serviceHarness({
      event: { ...validEvent, status: 'draft', ...change },
    });
    await assert.rejects(() => service.publish(organizerId, eventId), {
      status: 409,
    });
  }
  const foreign = serviceHarness({
    event: { ...validEvent, status: 'draft', organizerId: otherId },
  });
  await assert.rejects(() => foreign.service.publish(organizerId, eventId), {
    status: 403,
  });
});

test('cancellation succeeds only without holds, tickets, payments, or inventory', async () => {
  const safe = serviceHarness();
  assert.equal(
    (await safe.service.cancel(organizerId, eventId)).status,
    'cancelled',
  );
  assert.equal(
    safe.calls.some(([name]) => name === 'activeHold'),
    true,
  );
  assert.deepEqual(
    safe.calls.find(([name]) => name === 'activeHold')[1].status,
    { $in: ['pending', 'confirmed'] },
  );
  assert.equal(
    safe.calls.some(([name]) => name === 'ticket'),
    true,
  );
  assert.equal(
    safe.calls.some(([name]) => name === 'payment'),
    true,
  );
  for (const options of [
    { activeHold: true },
    { ticket: true },
    { payment: true },
    { event: { ...safe.existingEvent, status: 'draft', ticketsSold: 1 } },
    { event: { ...safe.existingEvent, status: 'draft', ticketsReserved: 1 } },
  ]) {
    const { service } = serviceHarness(options);
    await assert.rejects(() => service.cancel(organizerId, eventId), {
      status: 409,
      code: 'EVENT_HAS_ACTIVITY',
    });
  }
  const completed = serviceHarness({
    event: { ...safe.existingEvent, status: 'completed' },
  });
  await assert.rejects(() => completed.service.cancel(organizerId, eventId), {
    status: 409,
    code: 'INVALID_EVENT_STATE',
  });
  const foreign = serviceHarness({
    event: { ...safe.existingEvent, organizerId: otherId },
  });
  await assert.rejects(() => foreign.service.cancel(organizerId, eventId), {
    status: 403,
  });
});

test('public service reads only published upcoming events with escaped search and bounded projection', async () => {
  const calls = [];
  const model = {
    find(filter, projection) {
      calls.push(['find', filter, projection]);
      return {
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return this;
        },
        async lean() {
          return [];
        },
      };
    },
    async countDocuments(filter) {
      calls.push(['count', filter]);
      return 0;
    },
    findOne(filter, projection) {
      calls.push(['findOne', filter, projection]);
      return {
        async lean() {
          return { _id: eventId, status: 'published' };
        },
      };
    },
  };
  const now = new Date('2027-01-01T00:00:00Z');
  const service = createEventService({ eventModel: model, now: () => now });
  await service.listPublic({
    page: 1,
    limit: 20,
    q: 'Rock.*',
    city: 'Mumbai',
    minPrice: 0,
  });
  assert.equal(calls[0][1].status, 'published');
  assert.deepEqual(calls[0][1].startDate, { $gte: now });
  assert.equal(calls[0][1].$or[0].name.test('Rock and Roll'), false);
  assert.equal(calls[0][1].$or[0].name.test('Rock.*'), true);
  assert.equal(calls[0][1].ticketPrice.$gte, 0);
  assert.equal(calls[0][2].includes('imagePublicId'), false);
  assert.equal((await service.getPublic(eventId)).status, 'published');
  assert.deepEqual(calls.at(-1)[1], { _id: eventId, status: 'published' });
  await assert.rejects(() => service.getPublic('bad-id'), { status: 400 });
});

test('organizer listing always scopes queries to the authenticated local owner', async () => {
  const calls = [];
  const model = {
    find(filter) {
      calls.push(filter);
      return {
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return this;
        },
        async lean() {
          return [];
        },
      };
    },
    async countDocuments(filter) {
      calls.push(filter);
      return 0;
    },
  };
  const service = createEventService({ eventModel: model });
  const result = await service.listOrganizer(organizerId, {
    page: 2,
    limit: 5,
    status: 'draft',
  });
  assert.deepEqual(calls, [
    { organizerId, status: 'draft' },
    { organizerId, status: 'draft' },
  ]);
  assert.deepEqual(result, { items: [], total: 0, page: 2, limit: 5 });
});

test('valid event create payload remains schema compatible', async () => {
  const event = new Event({
    ...parseEventBody(validBody),
    organizerId,
    location: { city: 'Mumbai', country: 'India' },
  });
  await event.validate();
});

test('whole-paise prices allow ordinary two-decimal INR values in drafts', () => {
  assert.equal(
    parseEventBody({ ...validBody, ticketPrice: 1.29 }).ticketPrice,
    1.29,
  );
  assert.equal(
    parseEventBody({ ticketPrice: 0 }, { partial: true }).ticketPrice,
    0,
  );
  assert.throws(
    () => parseEventBody({ ticketPrice: 1.001 }, { partial: true }),
    {
      status: 400,
      code: 'VALIDATION_ERROR',
    },
  );
});
