import express, { Router } from 'express';
import { ApiError } from '../../apiError.js';
import { createRequireEventNestUser } from '../../middleware/requireEventNestUser.js';
import { createUserRateLimit } from '../../middleware/userRateLimit.js';
import { User } from '../../models/User.js';
import {
  verifyCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from './signatures.js';

function fields(body, allowed) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !allowed.includes(key))
  )
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request body');
  for (const key of allowed) {
    if (typeof body[key] !== 'string' || !body[key].trim())
      throw new ApiError(400, 'VALIDATION_ERROR', `${key} is required`);
  }
  return body;
}

function auth(userModel, readAuth) {
  return createRequireEventNestUser({
    userModel,
    ...(readAuth ? { readAuth } : {}),
  });
}

export function createPaymentRouter({
  service,
  keySecret,
  userModel = User,
  readAuth,
} = {}) {
  const router = Router();
  const limit = createUserRateLimit({ limit: 10 });
  router.use(auth(userModel, readAuth));
  router.post('/orders', limit, async (request, response) => {
    const { reservationId } = fields(request.body, ['reservationId']);
    const result = await service.createOrder(
      request.eventNestUser._id,
      reservationId,
    );
    response.status(201).json({ data: result });
  });
  router.post('/:paymentId/verify', limit, async (request, response) => {
    if (!keySecret)
      throw new ApiError(503, 'PAYMENTS_UNAVAILABLE', 'Payments unavailable');
    const { providerPaymentId, signature } = fields(request.body, [
      'providerPaymentId',
      'signature',
    ]);
    const payment = await service.get(
      request.eventNestUser._id,
      request.params.paymentId,
    );
    if (
      !verifyCheckoutSignature(
        payment.providerOrderId,
        providerPaymentId,
        signature,
        keySecret,
      )
    )
      throw new ApiError(
        400,
        'INVALID_SIGNATURE',
        'Invalid checkout signature',
      );
    const result = await service.fulfill(
      payment.providerOrderId,
      providerPaymentId,
    );
    response.json({ data: result });
  });
  router.post('/:paymentId/retry-refund', limit, async (request, response) => {
    if (request.body && Object.keys(request.body).length !== 0)
      throw new ApiError(400, 'VALIDATION_ERROR', 'Body must be empty');
    const result = await service.retryRefund(
      request.eventNestUser._id,
      request.params.paymentId,
    );
    response.json({ data: result });
  });
  router.get('/:paymentId', async (request, response) => {
    const payment = await service.get(
      request.eventNestUser._id,
      request.params.paymentId,
    );
    response.json({
      data: {
        id: payment._id,
        reservationId: payment.reservationId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        refundStatus: payment.refundStatus ?? null,
        paidAt: payment.paidAt ?? null,
        refundedAt: payment.refundedAt ?? null,
      },
    });
  });
  return router;
}

export function createTicketQrRouter({
  service,
  userModel = User,
  readAuth,
} = {}) {
  const router = Router();
  router.use(auth(userModel, readAuth));
  router.get('/:ticketId/qr', async (request, response) => {
    const result = await service.getTicketToken(
      request.eventNestUser._id,
      request.params.ticketId,
    );
    response.set('Cache-Control', 'no-store').json({ data: result });
  });
  return router;
}

export function createPaymentWebhookRouter({ service, webhookSecret } = {}) {
  const router = Router();
  router.post(
    '/',
    express.raw({ type: 'application/json', limit: '100kb' }),
    async (request, response) => {
      if (!service || !webhookSecret)
        throw new ApiError(503, 'WEBHOOK_UNAVAILABLE', 'Webhook unavailable');
      if (
        !verifyRazorpayWebhookSignature(
          request.body,
          request.get('x-razorpay-signature'),
          webhookSecret,
        )
      )
        throw new ApiError(400, 'INVALID_WEBHOOK', 'Invalid webhook signature');
      let event;
      try {
        event = JSON.parse(request.body.toString('utf8'));
      } catch {
        throw new ApiError(400, 'INVALID_WEBHOOK', 'Invalid webhook payload');
      }
      if (
        event?.event === 'payment.captured' ||
        event?.event === 'order.paid'
      ) {
        const payment = event.payload?.payment?.entity;
        if (
          typeof payment?.order_id !== 'string' ||
          typeof payment?.id !== 'string'
        )
          throw new ApiError(400, 'INVALID_WEBHOOK', 'Invalid payment payload');
        const result = await service.fulfill(payment.order_id, payment.id);
        response.json({ status: result.status });
        return;
      }
      if (event?.event === 'payment.failed') {
        const payment = event.payload?.payment?.entity;
        if (
          typeof payment?.order_id !== 'string' ||
          typeof payment?.id !== 'string'
        )
          throw new ApiError(400, 'INVALID_WEBHOOK', 'Invalid payment payload');
        const result = await service.recordFailure(
          payment.order_id,
          payment.id,
        );
        response.json(result);
        return;
      }
      if (
        event?.event === 'refund.processed' ||
        event?.event === 'refund.failed'
      ) {
        const refund = event.payload?.refund?.entity;
        const result = await service.acceptRefundWebhook(
          refund?.id,
          refund?.payment_id,
        );
        response.json(result);
        return;
      }
      response.json({ status: 'ignored' });
    },
  );
  return router;
}
