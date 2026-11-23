import mongoose from 'mongoose';
import { isNonNegativeAmount } from './validators.js';

const ticketSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketReservation',
      required: true,
    },
    ticketNumber: { type: String, required: true, trim: true },
    pricePaid: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativeAmount,
        message: 'Price paid must be nonnegative',
      },
    },
    status: {
      type: String,
      enum: ['valid', 'used', 'cancelled', 'refunded'],
      required: true,
    },
    issuedAt: { type: Date, required: true },
    usedAt: { type: Date },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { collection: 'tickets', timestamps: true },
);

ticketSchema.index({ ticketNumber: 1 }, { unique: true });
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ eventId: 1, status: 1 });
ticketSchema.index({ reservationId: 1 });

export const Ticket = mongoose.model('Ticket', ticketSchema);
