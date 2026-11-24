import mongoose from 'mongoose';
import { isPositiveInteger } from './validators.js';

const ticketReservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: isPositiveInteger,
        message: 'Quantity must be a positive integer',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'expired', 'cancelled'],
      required: true,
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
    cleanupAt: { type: Date },
  },
  { collection: 'ticketReservations', timestamps: true },
);

ticketReservationSchema.index({ userId: 1, createdAt: -1 });
ticketReservationSchema.index({ eventId: 1, status: 1, expiresAt: 1 });
ticketReservationSchema.index({ status: 1, expiresAt: 1 });

export const TicketReservation = mongoose.model(
  'TicketReservation',
  ticketReservationSchema,
);
