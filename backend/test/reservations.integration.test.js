import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { URL } from 'node:url';
import mongoose from 'mongoose';
import { Event } from '../src/models/Event.js';
import { TicketReservation } from '../src/models/TicketReservation.js';
import { createReservationService } from '../src/features/reservations/service.js';

const uri = process.env.EVENTNEST_TEST_MONGODB_URI;
const testDatabase = (() => {
  if (!uri) return false;
  try {
    return new URL(uri).pathname.endsWith('_test');
  } catch {
    return false;
  }
})();

test(
  'replica-set reservation transactions prevent oversell and release expired inventory',
  {
    skip:
      !testDatabase &&
      'Set EVENTNEST_TEST_MONGODB_URI to a dedicated *_test replica-set database',
  },
  async () => {
    const testUri = new URL(uri);
    testUri.pathname += `_${randomUUID().replaceAll('-', '')}`;
    const connection = await mongoose
      .createConnection(testUri.toString(), { serverSelectionTimeoutMS: 10000 })
      .asPromise();
    try {
      const EventModel = connection.model('Event', Event.schema);
      const ReservationModel = connection.model(
        'TicketReservation',
        TicketReservation.schema,
      );
      await EventModel.init();
      await ReservationModel.init();
      const organizerId = new mongoose.Types.ObjectId();
      const venueId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();
      let at = new Date();
      const event = await EventModel.create({
        organizerId,
        venueId,
        name: 'Integration Test Event',
        startDate: new Date(at.getTime() + 86400000),
        endDate: new Date(at.getTime() + 86400000 + 10800000),
        maxAttendees: 3,
        ticketPrice: 100,
        status: 'published',
        location: { city: 'Mumbai', country: 'India' },
      });
      const service = createReservationService({
        eventModel: EventModel,
        reservationModel: ReservationModel,
        runTransaction: (operation) => connection.transaction(operation),
        now: () => at,
      });
      const outcomes = await Promise.allSettled([
        service.create(userId, { eventId: String(event._id), quantity: 2 }),
        service.create(otherUserId, {
          eventId: String(event._id),
          quantity: 2,
        }),
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
      assert.equal((await EventModel.findById(event._id)).ticketsReserved, 2);
      assert.equal(
        await ReservationModel.countDocuments({
          eventId: event._id,
          status: 'pending',
        }),
        1,
      );
      const winningReservation = outcomes.find(
        (result) => result.status === 'fulfilled',
      ).value;
      await assert.rejects(
        () =>
          service.create(winningReservation.userId, {
            eventId: String(event._id),
            quantity: 1,
          }),
        { code: 'ACTIVE_HOLD' },
      );

      at = new Date(at.getTime() + 300001);
      const replacement = await service.create(userId, {
        eventId: String(event._id),
        quantity: 3,
      });
      assert.equal(replacement.quantity, 3);
      assert.equal((await EventModel.findById(event._id)).ticketsReserved, 3);
      assert.equal(
        await ReservationModel.countDocuments({
          eventId: event._id,
          status: 'expired',
        }),
        1,
      );

      await service.cancel(userId, String(replacement._id));
      assert.equal((await EventModel.findById(event._id)).ticketsReserved, 0);
      assert.equal(
        (await ReservationModel.findById(replacement._id)).status,
        'cancelled',
      );

      class FailingReservation {
        constructor() {
          this._id = new mongoose.Types.ObjectId();
        }
        async save() {
          throw new Error('forced reservation write failure');
        }
        static find(...args) {
          return ReservationModel.find(...args);
        }
        static exists(...args) {
          return ReservationModel.exists(...args);
        }
      }
      const failingService = createReservationService({
        eventModel: EventModel,
        reservationModel: FailingReservation,
        runTransaction: (operation) => connection.transaction(operation),
        now: () => at,
      });
      await assert.rejects(
        () =>
          failingService.create(userId, {
            eventId: String(event._id),
            quantity: 1,
          }),
        /forced reservation write failure/,
      );
      assert.equal((await EventModel.findById(event._id)).ticketsReserved, 0);
    } finally {
      await connection.dropDatabase();
      await connection.close();
    }
  },
);
