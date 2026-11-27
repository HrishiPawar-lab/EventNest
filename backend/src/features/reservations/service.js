import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { Event } from '../../models/Event.js';
import { TicketReservation } from '../../models/TicketReservation.js';

const HOLD_DURATION_MS = 5 * 60 * 1000;

function assertId(value, label) {
  if (!mongoose.isObjectIdOrHexString(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Invalid ${label} ID`);
  }
}

async function expiredForEvent(reservationModel, eventId, now, session) {
  return reservationModel
    .find({ eventId, status: 'pending', expiresAt: { $lte: now } })
    .select('_id quantity')
    .session(session);
}

export function createReservationService({
  reservationModel = TicketReservation,
  eventModel = Event,
  runTransaction = (operation) => mongoose.connection.transaction(operation),
  now = () => new Date(),
} = {}) {
  async function expireForEvent(eventId, at, session) {
    const expired = await expiredForEvent(
      reservationModel,
      eventId,
      at,
      session,
    );
    if (expired.length === 0) return 0;
    const quantity = expired.reduce(
      (sum, reservation) => sum + reservation.quantity,
      0,
    );
    const ids = expired.map((reservation) => reservation._id);
    const result = await reservationModel.updateMany(
      { _id: { $in: ids }, status: 'pending', expiresAt: { $lte: at } },
      { $set: { status: 'expired' } },
      { session },
    );
    if (result.modifiedCount !== ids.length) {
      throw new Error('Reservation expiry conflict');
    }
    const released = await eventModel.updateOne(
      { _id: eventId, ticketsReserved: { $gte: quantity } },
      { $inc: { ticketsReserved: -quantity } },
      { session },
    );
    if (released.modifiedCount !== 1) {
      throw new Error('Reservation inventory invariant failed');
    }
    return ids.length;
  }

  return {
    async create(userId, { eventId, quantity }) {
      assertId(eventId, 'event');
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'Quantity must be an integer from 1 to 10',
        );
      }
      return runTransaction(async (session) => {
        const at = now();
        await expireForEvent(eventId, at, session);
        const activeHold = await reservationModel
          .exists({
            userId,
            eventId,
            status: 'pending',
            expiresAt: { $gt: at },
          })
          .session(session);
        if (activeHold) {
          throw new ApiError(
            409,
            'ACTIVE_HOLD',
            'An active reservation already exists for this event',
          );
        }
        const event = await eventModel.findOneAndUpdate(
          {
            _id: eventId,
            status: 'published',
            startDate: { $gt: at },
            ticketPrice: { $gte: 1 / quantity },
            $expr: {
              $lte: [
                { $add: ['$ticketsSold', '$ticketsReserved', quantity] },
                '$maxAttendees',
              ],
            },
          },
          { $inc: { ticketsReserved: quantity } },
          { new: true, session },
        );
        if (!event) {
          const visible = await eventModel
            .exists({
              _id: eventId,
              status: 'published',
              startDate: { $gt: at },
            })
            .session(session);
          if (!visible) throw new ApiError(404, 'NOT_FOUND', 'Event not found');
          const meetsOrderMinimum = await eventModel
            .exists({
              _id: eventId,
              status: 'published',
              startDate: { $gt: at },
              ticketPrice: { $gte: 1 / quantity },
            })
            .session(session);
          if (!meetsOrderMinimum)
            throw new ApiError(
              409,
              'ORDER_AMOUNT_TOO_LOW',
              'Order total must be at least INR 1',
            );
          throw new ApiError(
            409,
            'SOLD_OUT',
            'Requested tickets are unavailable',
          );
        }
        const reservation = new reservationModel({
          userId,
          eventId: event._id,
          quantity,
          status: 'pending',
          expiresAt: new Date(at.getTime() + HOLD_DURATION_MS),
        });
        await reservation.save({ session });
        return reservation;
      });
    },
    async get(userId, reservationId) {
      assertId(reservationId, 'reservation');
      const reservation = await reservationModel.findOne({
        _id: reservationId,
        userId,
      });
      if (!reservation)
        throw new ApiError(404, 'NOT_FOUND', 'Reservation not found');
      if (reservation.status === 'pending' && reservation.expiresAt <= now()) {
        await runTransaction((session) =>
          expireForEvent(reservation.eventId, now(), session),
        );
        return reservationModel.findOne({ _id: reservationId, userId });
      }
      return reservation;
    },
    async cancel(userId, reservationId) {
      assertId(reservationId, 'reservation');
      const result = await runTransaction(async (session) => {
        const reservation = await reservationModel
          .findOne({ _id: reservationId, userId })
          .session(session);
        if (!reservation)
          throw new ApiError(404, 'NOT_FOUND', 'Reservation not found');
        const at = now();
        if (reservation.status === 'pending' && reservation.expiresAt <= at) {
          await expireForEvent(reservation.eventId, at, session);
          return 'expired';
        }
        if (reservation.status !== 'pending') {
          throw new ApiError(
            409,
            'RESERVATION_NOT_PENDING',
            'Reservation cannot be cancelled',
          );
        }
        const changed = await reservationModel.updateOne(
          { _id: reservation._id, status: 'pending', expiresAt: { $gt: at } },
          { $set: { status: 'cancelled' } },
          { session },
        );
        if (changed.modifiedCount !== 1)
          throw new Error('Reservation cancellation conflict');
        const released = await eventModel.updateOne(
          {
            _id: reservation.eventId,
            ticketsReserved: { $gte: reservation.quantity },
          },
          { $inc: { ticketsReserved: -reservation.quantity } },
          { session },
        );
        if (released.modifiedCount !== 1)
          throw new Error('Reservation inventory invariant failed');
        return 'cancelled';
      });
      if (result === 'expired') {
        throw new ApiError(
          409,
          'RESERVATION_EXPIRED',
          'Reservation has expired',
        );
      }
    },
    async expireBatch(limit = 100) {
      const at = now();
      const pending = await reservationModel
        .find({ status: 'pending', expiresAt: { $lte: at } })
        .select('eventId')
        .sort({ expiresAt: 1 })
        .limit(limit);
      const eventIds = [
        ...new Set(pending.map((reservation) => String(reservation.eventId))),
      ];
      let expired = 0;
      for (const eventId of eventIds) {
        expired += await runTransaction((session) =>
          expireForEvent(eventId, at, session),
        );
      }
      return expired;
    },
  };
}
