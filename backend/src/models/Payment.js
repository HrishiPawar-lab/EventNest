import mongoose from 'mongoose';
import { isPositiveInteger } from './validators.js';

const paymentSchema = new mongoose.Schema(
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
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketReservation',
      required: true,
    },
    provider: {
      type: String,
      enum: ['razorpay'],
      required: true,
      default: 'razorpay',
    },
    providerOrderId: { type: String, required: true, trim: true },
    providerPaymentId: { type: String, trim: true, minlength: 1 },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: isPositiveInteger,
        message: 'Amount must be a positive integer in paise',
      },
    },
    currency: { type: String, enum: ['INR'], required: true, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'pending', 'successful', 'failed', 'refunded'],
      required: true,
      default: 'created',
    },
    paidAt: { type: Date },
    refundStatus: { type: String, enum: ['pending', 'processed', 'failed'] },
    providerRefundId: { type: String, trim: true, minlength: 1 },
    refundReason: {
      type: String,
      enum: ['expired', 'duplicate', 'event_cancelled'],
    },
    refundAttempt: { type: Number, default: 0, min: 0 },
    refundedAt: { type: Date },
  },
  { collection: 'payments', timestamps: true },
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ eventId: 1, status: 1 });
paymentSchema.index({ reservationId: 1 });
paymentSchema.index({ provider: 1, providerOrderId: 1 }, { unique: true });
paymentSchema.index(
  { provider: 1, providerPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerPaymentId: { $type: 'string' } },
  },
);
paymentSchema.index(
  { provider: 1, providerRefundId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerRefundId: { $type: 'string' } },
  },
);

export const Payment = mongoose.model('Payment', paymentSchema);
