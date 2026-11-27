import { createHash, createHmac, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { Event } from '../../models/Event.js';
import { Payment } from '../../models/Payment.js';
import { QRCredential } from '../../models/QRCredential.js';
import { Ticket } from '../../models/Ticket.js';
import { TicketReservation } from '../../models/TicketReservation.js';

function assertId(value, label) {
  if (!mongoose.isObjectIdOrHexString(value))
    throw new ApiError(400, 'VALIDATION_ERROR', `Invalid ${label} ID`);
}

function amountInPaise(ticketPrice, quantity) {
  const exactUnit = ticketPrice * 100;
  const unit = Math.round(exactUnit);
  const amount = unit * quantity;
  if (
    !Number.isSafeInteger(unit) ||
    unit <= 0 ||
    Math.abs(exactUnit - unit) > 1e-6 ||
    !Number.isSafeInteger(amount)
  )
    throw new ApiError(
      409,
      'INVALID_PRICE',
      'Event needs a positive INR ticket price',
    );
  if (amount < 100)
    throw new ApiError(
      409,
      'ORDER_AMOUNT_TOO_LOW',
      'Order total must be at least INR 1',
    );
  return amount;
}

function qrToken(secret, ticketId) {
  return createHmac('sha256', secret)
    .update(String(ticketId))
    .digest('base64url');
}

function matchesProviderPayment(providerPayment, payment, paymentId) {
  return (
    providerPayment?.id === paymentId &&
    providerPayment.order_id === payment.providerOrderId &&
    providerPayment.amount === payment.amount &&
    providerPayment.currency === payment.currency
  );
}

export function createPaymentService({
  gateway,
  keyId,
  qrSecret,
  paymentModel = Payment,
  reservationModel = TicketReservation,
  eventModel = Event,
  ticketModel = Ticket,
  credentialModel = QRCredential,
  runTransaction = (operation) => mongoose.connection.transaction(operation),
  now = () => new Date(),
} = {}) {
  function requireConfigured() {
    if (
      !gateway ||
      !keyId ||
      typeof qrSecret !== 'string' ||
      qrSecret.length < 32
    )
      throw new ApiError(503, 'PAYMENTS_UNAVAILABLE', 'Payments unavailable');
  }

  async function reconcileRefund(paymentId) {
    const payment = await paymentModel.findById(paymentId);
    if (
      !payment ||
      payment.refundStatus !== 'pending' ||
      !payment.providerPaymentId
    )
      return payment;
    const attempt = payment.refundAttempt ?? 0;
    const receipt = `enr_${payment._id}_${attempt}`;
    const refund = payment.providerRefundId
      ? await gateway.fetchRefund(payment.providerRefundId)
      : await gateway.createRefund(
          payment.providerPaymentId,
          payment.amount,
          receipt,
        );
    if (
      typeof refund?.id !== 'string' ||
      refund.payment_id !== payment.providerPaymentId ||
      refund.amount !== payment.amount
    )
      throw new Error('Razorpay refund response does not match payment');
    if (!['pending', 'processed', 'failed'].includes(refund.status))
      throw new Error('Unknown Razorpay refund status');
    if (!payment.providerRefundId && refund.receipt !== receipt)
      throw new Error('Razorpay refund receipt does not match current attempt');
    return runTransaction(async (session) => {
      const current = await paymentModel.findById(paymentId).session(session);
      if (!current || current.refundStatus !== 'pending') return current;
      if ((current.refundAttempt ?? 0) !== attempt) return current;
      if (current.providerRefundId && current.providerRefundId !== refund.id)
        throw new Error('Refund identity mismatch');
      if (refund.status === 'failed') {
        await paymentModel.updateOne(
          { _id: current._id, refundStatus: 'pending' },
          { $set: { providerRefundId: refund.id, refundStatus: 'failed' } },
          { session },
        );
        return paymentModel.findById(paymentId).session(session);
      }
      if (refund.status === 'pending') {
        await paymentModel.updateOne(
          { _id: current._id, refundStatus: 'pending' },
          { $set: { providerRefundId: refund.id } },
          { session },
        );
        return paymentModel.findById(paymentId).session(session);
      }
      await paymentModel.updateOne(
        { _id: current._id, refundStatus: 'pending' },
        {
          $set: {
            providerRefundId: refund.id,
            refundStatus: 'processed',
            status: 'refunded',
            refundedAt: now(),
          },
        },
        { session },
      );
      return paymentModel.findById(paymentId).session(session);
    });
  }

  return {
    async createOrder(userId, reservationId) {
      requireConfigured();
      assertId(reservationId, 'reservation');
      const reservation = await reservationModel.findOne({
        _id: reservationId,
        userId,
      });
      if (!reservation)
        throw new ApiError(404, 'NOT_FOUND', 'Reservation not found');
      const at = now();
      if (reservation.status !== 'pending' || reservation.expiresAt <= at)
        throw new ApiError(
          409,
          'RESERVATION_EXPIRED',
          'Reservation is no longer active',
        );
      const event = await eventModel.findOne({
        _id: reservation.eventId,
        status: 'published',
        startDate: { $gt: at },
      });
      if (!event)
        throw new ApiError(409, 'EVENT_UNAVAILABLE', 'Event is unavailable');
      const amount = amountInPaise(event.ticketPrice, reservation.quantity);
      const paymentId = new mongoose.Types.ObjectId();
      let order;
      try {
        order = await gateway.createOrder({
          amount,
          currency: 'INR',
          receipt: `eventnest_${paymentId}`,
        });
        if (
          typeof order?.id !== 'string' ||
          order.amount !== amount ||
          order.currency !== 'INR'
        )
          throw new Error('Razorpay order response does not match request');
      } catch (error) {
        const providerStatus = Number.isInteger(error?.statusCode)
          ? error.statusCode
          : Number.isInteger(error?.status)
            ? error.status
            : undefined;
        console.error('Payment provider order creation failed', {
          providerStatus,
        });
        if (providerStatus === 401 || providerStatus === 403)
          throw new ApiError(
            502,
            'PAYMENT_PROVIDER_AUTH_ERROR',
            'Payment service is temporarily unavailable',
          );
        throw new ApiError(
          502,
          'PAYMENT_PROVIDER_ERROR',
          'Payment provider could not create an order',
        );
      }
      try {
        await runTransaction(async (session) => {
          const current = await reservationModel.findOneAndUpdate(
            {
              _id: reservationId,
              userId,
              status: 'pending',
              expiresAt: { $gt: now() },
            },
            { $inc: { __v: 1 } },
            { new: true, session },
          );
          if (!current)
            throw new ApiError(
              409,
              'RESERVATION_EXPIRED',
              'Reservation is no longer active',
            );
          const lockedEvent = await eventModel.findOneAndUpdate(
            {
              _id: current.eventId,
              status: 'published',
              startDate: { $gt: now() },
            },
            { $inc: { __v: 1 } },
            { new: true, session },
          );
          if (!lockedEvent)
            throw new ApiError(
              409,
              'EVENT_UNAVAILABLE',
              'Event is unavailable',
            );
          if (
            amountInPaise(lockedEvent.ticketPrice, current.quantity) !== amount
          )
            throw new ApiError(409, 'PRICE_CHANGED', 'Event price changed');
          await new paymentModel({
            _id: paymentId,
            userId,
            eventId: current.eventId,
            reservationId,
            providerOrderId: order.id,
            amount,
            currency: 'INR',
            status: 'created',
          }).save({ session });
        });
      } catch (error) {
        if (!(error instanceof ApiError))
          console.error('Payment order persistence failed');
        throw error;
      }
      return {
        paymentId,
        providerOrderId: order.id,
        amount,
        currency: 'INR',
        keyId,
      };
    },

    async fulfill(orderId, providerPaymentId) {
      requireConfigured();
      if (
        typeof orderId !== 'string' ||
        typeof providerPaymentId !== 'string' ||
        !/^order_[A-Za-z0-9]+$/.test(orderId) ||
        !/^pay_[A-Za-z0-9]+$/.test(providerPaymentId)
      )
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'Invalid provider identifiers',
        );
      const payment = await paymentModel.findOne({
        provider: 'razorpay',
        providerOrderId: orderId,
      });
      if (!payment)
        throw new ApiError(404, 'NOT_FOUND', 'Payment order not found');
      const providerPayment = await gateway.fetchPayment(providerPaymentId);
      if (
        !matchesProviderPayment(providerPayment, payment, providerPaymentId) ||
        providerPayment.status !== 'captured'
      )
        throw new ApiError(
          409,
          'PAYMENT_NOT_CAPTURED',
          'Payment has not been captured for this order',
        );
      const outcome = await runTransaction(async (session) => {
        const current = await paymentModel.findOneAndUpdate(
          { _id: payment._id },
          { $inc: { __v: 1 } },
          { new: true, session },
        );
        if (
          current.providerPaymentId &&
          current.providerPaymentId !== providerPaymentId
        )
          throw new ApiError(
            409,
            'PAYMENT_MISMATCH',
            'Order is linked to a different payment',
          );
        if (current.status === 'refunded')
          return { status: 'refunded', paymentId: current._id };
        if (current.status === 'successful') {
          const status =
            current.refundStatus === 'pending'
              ? 'refund_pending'
              : current.refundStatus === 'failed'
                ? 'refund_failed'
                : 'confirmed';
          return { status, paymentId: current._id };
        }
        const at = now();
        const reservation = await reservationModel
          .findById(current.reservationId)
          .session(session);
        if (!reservation) throw new Error('Payment reservation missing');
        const event = await eventModel.findOneAndUpdate(
          { _id: current.eventId },
          { $inc: { __v: 1 } },
          { new: true, session },
        );
        if (!event) throw new Error('Payment event missing');
        const active =
          reservation.status === 'pending' &&
          reservation.expiresAt > at &&
          event.status === 'published' &&
          event.startDate > at;
        const update = { providerPaymentId, status: 'successful', paidAt: at };
        if (!active) {
          update.refundStatus = 'pending';
          update.refundReason =
            reservation.status === 'confirmed'
              ? 'duplicate'
              : event.status !== 'published'
                ? 'event_cancelled'
                : 'expired';
          if (reservation.status === 'pending' && reservation.expiresAt <= at) {
            const expired = await reservationModel.updateOne(
              {
                _id: reservation._id,
                status: 'pending',
                expiresAt: { $lte: at },
              },
              { $set: { status: 'expired' } },
              { session },
            );
            if (expired.modifiedCount !== 1)
              throw new Error('Reservation expiry conflict');
            const released = await eventModel.updateOne(
              {
                _id: event._id,
                ticketsReserved: { $gte: reservation.quantity },
              },
              { $inc: { ticketsReserved: -reservation.quantity } },
              { session },
            );
            if (released.modifiedCount !== 1)
              throw new Error('Reservation inventory invariant failed');
          }
        } else {
          const confirmed = await reservationModel.updateOne(
            { _id: reservation._id, status: 'pending', expiresAt: { $gt: at } },
            { $set: { status: 'confirmed' } },
            { session },
          );
          if (confirmed.modifiedCount !== 1)
            throw new Error('Reservation confirmation conflict');
          const converted = await eventModel.updateOne(
            {
              _id: event._id,
              status: 'published',
              ticketsReserved: { $gte: reservation.quantity },
            },
            {
              $inc: {
                ticketsReserved: -reservation.quantity,
                ticketsSold: reservation.quantity,
              },
            },
            { session },
          );
          if (converted.modifiedCount !== 1)
            throw new Error('Reservation inventory invariant failed');
          const tickets = Array.from({ length: reservation.quantity }, () => ({
            _id: new mongoose.Types.ObjectId(),
            eventId: current.eventId,
            userId: current.userId,
            reservationId: reservation._id,
            ticketNumber: `EN-${randomUUID().replaceAll('-', '').toUpperCase()}`,
            pricePaid: current.amount / (100 * reservation.quantity),
            status: 'valid',
            issuedAt: at,
          }));
          await ticketModel.create(tickets, { session });
          await credentialModel.create(
            tickets.map((ticket) => ({
              ticketId: ticket._id,
              tokenHash: createHash('sha256')
                .update(qrToken(qrSecret, ticket._id))
                .digest('hex'),
              status: 'active',
            })),
            { session },
          );
        }
        await paymentModel.updateOne(
          { _id: current._id },
          { $set: update },
          { session },
        );
        return {
          status: active ? 'confirmed' : 'refund_pending',
          paymentId: current._id,
        };
      });
      if (outcome.status === 'refund_pending') {
        const refunded = await reconcileRefund(outcome.paymentId);
        outcome.status =
          refunded?.refundStatus === 'processed'
            ? 'refunded'
            : refunded?.refundStatus === 'failed'
              ? 'refund_failed'
              : 'refund_pending';
      }
      return outcome;
    },

    async get(userId, paymentId) {
      assertId(paymentId, 'payment');
      const payment = await paymentModel.findOne({ _id: paymentId, userId });
      if (!payment) throw new ApiError(404, 'NOT_FOUND', 'Payment not found');
      return payment;
    },

    async recordFailure(orderId, providerPaymentId) {
      requireConfigured();
      if (
        typeof orderId !== 'string' ||
        typeof providerPaymentId !== 'string' ||
        !/^order_[A-Za-z0-9]+$/.test(orderId) ||
        !/^pay_[A-Za-z0-9]+$/.test(providerPaymentId)
      )
        throw new ApiError(
          400,
          'INVALID_WEBHOOK',
          'Invalid payment identifiers',
        );
      const payment = await paymentModel.findOne({
        provider: 'razorpay',
        providerOrderId: orderId,
      });
      if (!payment)
        throw new ApiError(404, 'NOT_FOUND', 'Payment order not found');
      const providerPayment = await gateway.fetchPayment(providerPaymentId);
      if (!matchesProviderPayment(providerPayment, payment, providerPaymentId))
        throw new ApiError(
          409,
          'PAYMENT_NOT_FAILED',
          'Provider has not confirmed payment failure',
        );
      if (providerPayment.status !== 'failed') return { status: 'ignored' };
      const result = await paymentModel.updateOne(
        { _id: payment._id, status: { $in: ['created', 'pending'] } },
        { $set: { status: 'failed' } },
      );
      return { status: result.modifiedCount === 1 ? 'failed' : 'ignored' };
    },

    async retryRefund(userId, paymentId) {
      requireConfigured();
      assertId(paymentId, 'payment');
      const payment = await paymentModel.findOne({ _id: paymentId, userId });
      if (!payment) throw new ApiError(404, 'NOT_FOUND', 'Payment not found');
      if (!['pending', 'failed'].includes(payment.refundStatus))
        throw new ApiError(
          409,
          'REFUND_NOT_RETRYABLE',
          'No refund needs reconciliation',
        );
      if (payment.refundStatus === 'failed') {
        const existing = await gateway.fetchRefund(payment.providerRefundId);
        if (
          existing?.payment_id !== payment.providerPaymentId ||
          existing.amount !== payment.amount
        )
          throw new Error('Razorpay refund does not match payment');
        if (existing.status !== 'failed') {
          await paymentModel.updateOne(
            { _id: payment._id, refundStatus: 'failed' },
            { $set: { refundStatus: 'pending' } },
          );
        } else {
          await paymentModel.updateOne(
            { _id: payment._id, refundStatus: 'failed' },
            {
              $set: { refundStatus: 'pending' },
              $unset: { providerRefundId: '' },
              $inc: { refundAttempt: 1 },
            },
          );
        }
      }
      const result = await reconcileRefund(payment._id);
      return { status: result?.refundStatus ?? 'unknown' };
    },

    async getTicketToken(userId, ticketId) {
      requireConfigured();
      assertId(ticketId, 'ticket');
      const ticket = await ticketModel.findOne({
        _id: ticketId,
        userId,
        status: 'valid',
      });
      if (!ticket)
        throw new ApiError(404, 'NOT_FOUND', 'Active ticket not found');
      const token = qrToken(qrSecret, ticket._id);
      const hash = createHash('sha256').update(token).digest('hex');
      const credential = await credentialModel.exists({
        ticketId,
        tokenHash: hash,
        status: 'active',
      });
      if (!credential)
        throw new ApiError(404, 'NOT_FOUND', 'Active QR credential not found');
      return { token };
    },

    async acceptRefundWebhook(refundId, providerPaymentId) {
      requireConfigured();
      if (typeof refundId !== 'string' || typeof providerPaymentId !== 'string')
        throw new ApiError(400, 'INVALID_WEBHOOK', 'Invalid refund payload');
      const payment = await paymentModel.findOne({
        provider: 'razorpay',
        providerPaymentId,
      });
      if (!payment || payment.refundStatus !== 'pending')
        return { status: 'ignored' };
      const refund = await gateway.fetchRefund(refundId);
      if (
        refund?.id !== refundId ||
        refund.payment_id !== providerPaymentId ||
        refund.amount !== payment.amount
      )
        throw new Error('Razorpay refund does not match payment');
      const attempt = payment.refundAttempt ?? 0;
      const receipt = `enr_${payment._id}_${attempt}`;
      if (payment.providerRefundId !== refundId && refund.receipt !== receipt)
        return { status: 'ignored' };
      const bound = await paymentModel.updateOne(
        {
          _id: payment._id,
          refundStatus: 'pending',
          refundAttempt: attempt,
          $or: [
            { providerRefundId: { $exists: false } },
            { providerRefundId: refundId },
          ],
        },
        { $set: { providerRefundId: refundId } },
      );
      if (bound.matchedCount !== 1) return { status: 'ignored' };
      const result = await reconcileRefund(payment._id);
      return { status: result?.refundStatus ?? 'ignored' };
    },

    reconcileRefund,
  };
}
