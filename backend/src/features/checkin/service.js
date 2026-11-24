import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { QRCredential } from '../../models/QRCredential.js';
import { Ticket } from '../../models/Ticket.js';
import { Event } from '../../models/Event.js';

function validateToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid QR token');
  }
}

export function createCheckinService({
  credentialModel = QRCredential,
  ticketModel = Ticket,
  eventModel = Event,
  runTransaction = (operation) => mongoose.connection.transaction(operation),
  now = () => new Date(),
} = {}) {
  return {
    async checkIn(eventId, organizerId, token) {
      if (!mongoose.isObjectIdOrHexString(eventId)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid event ID');
      }
      validateToken(token);
      const checkedAt = now();
      const tokenHash = createHash('sha256').update(token).digest('hex');
      return runTransaction(async (session) => {
        const credential = await credentialModel.findOneAndUpdate(
          { tokenHash, status: 'active' },
          { $inc: { __v: 1 } },
          { new: true, session },
        );
        if (!credential) {
          throw new ApiError(422, 'INVALID_QR', 'QR credential is not valid');
        }
        const event = await eventModel.findOneAndUpdate(
          {
            _id: eventId,
            status: 'published',
            startDate: {
              $lte: new Date(checkedAt.getTime() + 2 * 60 * 60 * 1000),
            },
            endDate: { $gte: checkedAt },
          },
          { $inc: { __v: 1 } },
          { new: true, session },
        );
        if (!event) {
          const existingEvent = await eventModel.findById(
            eventId,
            { status: 1 },
            { session },
          );
          if (!existingEvent)
            throw new ApiError(404, 'NOT_FOUND', 'Event not found');
          throw new ApiError(
            409,
            'EVENT_NOT_OPEN',
            'Event is not open for check-in',
          );
        }
        const ticket = await ticketModel.findOneAndUpdate(
          { _id: credential.ticketId, eventId, status: 'valid' },
          {
            $set: {
              status: 'used',
              usedAt: checkedAt,
              checkedInBy: organizerId,
            },
          },
          { new: true, session },
        );
        if (ticket)
          return {
            ticketId: ticket._id,
            status: ticket.status,
            usedAt: ticket.usedAt,
          };
        const existing = await ticketModel.findById(
          credential.ticketId,
          { eventId: 1, status: 1 },
          { session },
        );
        if (
          existing &&
          String(existing.eventId) === String(eventId) &&
          existing.status === 'used'
        ) {
          throw new ApiError(
            409,
            'ALREADY_USED',
            'Ticket has already been checked in',
          );
        }
        throw new ApiError(422, 'INVALID_QR', 'QR credential is not valid');
      });
    },
  };
}
