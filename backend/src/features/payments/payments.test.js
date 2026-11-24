import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { createPaymentService } from './service.js';
import { createPaymentGateway } from './gateway.js';
import { createPaymentRouter, createPaymentWebhookRouter } from './routes.js';

const userId = new mongoose.Types.ObjectId();
const eventId = new mongoose.Types.ObjectId();
const reservationId = new mongoose.Types.ObjectId();
const at = new Date('2026-11-24T08:00:00Z');
const qrSecret = 'a-test-only-qr-secret-with-at-least-32-chars';

test('refund request uses one stable key in header and provider receipt', async () => {
  const gateway = createPaymentGateway(
    { keyId: 'key', keySecret: 'secret' },
    async (_url, options) => {
      assert.equal(options.headers['X-Refund-Idempotency'], 'enr_test_1');
      assert.deepEqual(JSON.parse(options.body), {
        amount: 10000,
        receipt: 'enr_test_1',
      });
      return { ok: true, json: async () => ({ id: 'rfnd_test' }) };
    },
  );
  assert.equal(
    (await gateway.createRefund('pay_test', 10000, 'enr_test_1')).id,
    'rfnd_test',
  );
});

test('payment order converts unit INR price to integer paise before multiplying', async () => {
  const saved = [];
  class PaymentModel {
    constructor(value) {
      Object.assign(this, value);
    }
    async save() {
      saved.push(this);
    }
  }
  const reservation = {
    _id: reservationId,
    userId,
    eventId,
    quantity: 3,
    status: 'pending',
    expiresAt: new Date(at.getTime() + 60000),
  };
  const event = {
    _id: eventId,
    status: 'published',
    ticketPrice: 0.29,
    startDate: new Date(at.getTime() + 3600000),
  };
  const service = createPaymentService({
    keyId: 'rzp_test_key',
    qrSecret,
    gateway: {
      createOrder: async (details) => {
        assert.equal(details.amount, 87);
        return { id: 'order_abc', amount: 87, currency: 'INR' };
      },
    },
    reservationModel: {
      findOne: async () => reservation,
      findOneAndUpdate: async () => reservation,
    },
    eventModel: {
      findOne: async () => event,
      findOneAndUpdate: async () => event,
    },
    paymentModel: PaymentModel,
    runTransaction: (work) => work({}),
    now: () => at,
  });
  const order = await service.createOrder(userId, String(reservationId));
  assert.equal(order.amount, 87);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].amount, 87);
});

function query(value) {
  return {
    session: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
}

test('captured payment issues one ticket and one hashed QR per entry exactly once', async () => {
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    userId,
    eventId,
    reservationId,
    providerOrderId: 'order_abc',
    amount: 20000,
    currency: 'INR',
    status: 'created',
  };
  const reservation = {
    _id: reservationId,
    status: 'pending',
    quantity: 2,
    expiresAt: new Date(at.getTime() + 60000),
  };
  const event = {
    _id: eventId,
    status: 'published',
    ticketsReserved: 2,
    ticketsSold: 0,
    startDate: new Date(at.getTime() + 3600000),
  };
  const tickets = [];
  const credentials = [];
  const service = createPaymentService({
    keyId: 'key',
    qrSecret,
    now: () => at,
    gateway: {
      fetchPayment: async () => ({
        id: 'pay_abc',
        status: 'captured',
        order_id: 'order_abc',
        amount: 20000,
        currency: 'INR',
      }),
    },
    paymentModel: {
      findOne: async () => payment,
      findOneAndUpdate: async () => payment,
      updateOne: async (_filter, update) => {
        Object.assign(payment, update.$set);
        return { modifiedCount: 1 };
      },
    },
    reservationModel: {
      findById: () => query(reservation),
      updateOne: async (_filter, update) => {
        Object.assign(reservation, update.$set);
        return { modifiedCount: 1 };
      },
    },
    eventModel: {
      findOneAndUpdate: async () => event,
      updateOne: async (_filter, update) => {
        event.ticketsReserved += update.$inc.ticketsReserved;
        event.ticketsSold += update.$inc.ticketsSold;
        return { modifiedCount: 1 };
      },
    },
    ticketModel: { create: async (items) => tickets.push(...items) },
    credentialModel: { create: async (items) => credentials.push(...items) },
    runTransaction: (work) => work({}),
  });
  assert.equal(
    (await service.fulfill('order_abc', 'pay_abc')).status,
    'confirmed',
  );
  assert.equal(reservation.status, 'confirmed');
  assert.equal(event.ticketsReserved, 0);
  assert.equal(event.ticketsSold, 2);
  assert.equal(tickets.length, 2);
  assert.equal(credentials.length, 2);
  assert.notEqual(credentials[0].tokenHash, credentials[1].tokenHash);
  assert.match(credentials[0].tokenHash, /^[0-9a-f]{64}$/);
  assert.equal(
    (await service.fulfill('order_abc', 'pay_abc')).status,
    'confirmed',
  );
  assert.equal(tickets.length, 2);
});

test('a failed late refund never reports tickets confirmed', async () => {
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    providerOrderId: 'order_abc',
    providerPaymentId: 'pay_abc',
    amount: 10000,
    currency: 'INR',
    status: 'successful',
    refundStatus: 'failed',
  };
  const service = createPaymentService({
    keyId: 'key',
    qrSecret,
    gateway: {
      fetchPayment: async () => ({
        id: 'pay_abc',
        status: 'captured',
        order_id: 'order_abc',
        amount: 10000,
        currency: 'INR',
      }),
    },
    paymentModel: {
      findOne: async () => payment,
      findOneAndUpdate: async () => payment,
    },
    runTransaction: (work) => work({}),
  });
  assert.equal(
    (await service.fulfill('order_abc', 'pay_abc')).status,
    'refund_failed',
  );
});

test('provider identity, amount and currency mismatch cannot issue tickets', async () => {
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    providerOrderId: 'order_abc',
    amount: 10000,
    currency: 'INR',
    status: 'created',
  };
  for (const mismatch of [
    { order_id: 'order_wrong' },
    { amount: 10001 },
    { currency: 'USD' },
    { status: 'authorized' },
  ]) {
    const service = createPaymentService({
      keyId: 'key',
      qrSecret,
      paymentModel: { findOne: async () => payment },
      gateway: {
        fetchPayment: async () => ({
          id: 'pay_abc',
          order_id: 'order_abc',
          amount: 10000,
          currency: 'INR',
          status: 'captured',
          ...mismatch,
        }),
      },
      runTransaction: () => {
        throw new Error('Must not issue tickets');
      },
    });
    await assert.rejects(
      service.fulfill('order_abc', 'pay_abc'),
      (error) => error.code === 'PAYMENT_NOT_CAPTURED',
    );
  }
});

test('payment.failed records verified failure but ignores stale failure after capture', async () => {
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    providerOrderId: 'order_abc',
    amount: 10000,
    currency: 'INR',
    status: 'created',
  };
  let providerStatus = 'failed';
  const service = createPaymentService({
    keyId: 'key',
    qrSecret,
    paymentModel: {
      findOne: async () => payment,
      updateOne: async () => {
        payment.status = 'failed';
        return { modifiedCount: 1 };
      },
    },
    gateway: {
      fetchPayment: async () => ({
        id: 'pay_abc',
        order_id: 'order_abc',
        amount: 10000,
        currency: 'INR',
        status: providerStatus,
      }),
    },
  });
  assert.equal(
    (await service.recordFailure('order_abc', 'pay_abc')).status,
    'failed',
  );
  assert.equal(payment.status, 'failed');
  providerStatus = 'captured';
  assert.equal(
    (await service.recordFailure('order_abc', 'pay_abc')).status,
    'ignored',
  );
});

test('late captured payment expires hold and records a provider-confirmed full refund without tickets', async () => {
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    userId,
    eventId,
    reservationId,
    providerOrderId: 'order_abc',
    amount: 10000,
    currency: 'INR',
    status: 'created',
  };
  const reservation = {
    _id: reservationId,
    status: 'pending',
    quantity: 1,
    expiresAt: new Date(at.getTime() - 1000),
  };
  const event = {
    _id: eventId,
    status: 'published',
    ticketsReserved: 1,
    ticketsSold: 0,
    startDate: new Date(at.getTime() + 3600000),
  };
  let issued = 0;
  let refundCalls = 0;
  const service = createPaymentService({
    keyId: 'key',
    qrSecret,
    now: () => at,
    gateway: {
      fetchPayment: async () => ({
        id: 'pay_abc',
        status: 'captured',
        order_id: 'order_abc',
        amount: 10000,
        currency: 'INR',
      }),
      createRefund: async (id, amount, key) => {
        refundCalls += 1;
        assert.equal(id, 'pay_abc');
        assert.equal(amount, 10000);
        assert.equal(key, `enr_${payment._id}_0`);
        return {
          id: 'rfnd_abc',
          payment_id: id,
          amount,
          receipt: key,
          status: 'processed',
        };
      },
    },
    paymentModel: {
      findOne: async () => payment,
      findOneAndUpdate: async () => payment,
      findById: () => query(payment),
      updateOne: async (_filter, update) => {
        Object.assign(payment, update.$set);
        return { modifiedCount: 1 };
      },
    },
    reservationModel: {
      findById: () => query(reservation),
      updateOne: async (_filter, update) => {
        Object.assign(reservation, update.$set);
        return { modifiedCount: 1 };
      },
    },
    eventModel: {
      findOneAndUpdate: async () => event,
      updateOne: async (_filter, update) => {
        event.ticketsReserved += update.$inc.ticketsReserved;
        return { modifiedCount: 1 };
      },
    },
    ticketModel: {
      create: async () => {
        issued += 1;
      },
    },
    credentialModel: {
      create: async () => {
        issued += 1;
      },
    },
    runTransaction: (work) => work({}),
  });
  const first = await service.fulfill('order_abc', 'pay_abc');
  assert.equal(first.status, 'refunded');
  assert.equal(reservation.status, 'expired');
  assert.equal(event.ticketsReserved, 0);
  assert.equal(event.ticketsSold, 0);
  assert.equal(payment.status, 'refunded');
  assert.equal(payment.refundStatus, 'processed');
  assert.equal(issued, 0);
  assert.equal(refundCalls, 1);
  assert.equal(
    (await service.fulfill('order_abc', 'pay_abc')).status,
    'refunded',
  );
  assert.equal(refundCalls, 1);
});

test('a failed automatic refund can be retried with a new stable provider key', async () => {
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    userId,
    providerPaymentId: 'pay_abc',
    amount: 10000,
    currency: 'INR',
    status: 'successful',
    refundStatus: 'failed',
    providerRefundId: 'rfnd_failed',
    refundAttempt: 0,
    refundReason: 'expired',
  };
  let created = 0;
  const service = createPaymentService({
    keyId: 'key',
    qrSecret,
    now: () => at,
    gateway: {
      fetchRefund: async () => ({
        id: 'rfnd_failed',
        payment_id: 'pay_abc',
        amount: 10000,
        status: 'failed',
      }),
      createRefund: async (id, amount, key) => {
        created += 1;
        assert.equal(id, 'pay_abc');
        assert.equal(amount, 10000);
        assert.equal(key, `enr_${payment._id}_1`);
        return {
          id: 'rfnd_success',
          payment_id: id,
          amount,
          receipt: key,
          status: 'processed',
        };
      },
    },
    paymentModel: {
      findOne: async () => payment,
      findById: () => query(payment),
      updateOne: async (_filter, update) => {
        if (update.$set) Object.assign(payment, update.$set);
        if (update.$unset) delete payment.providerRefundId;
        if (update.$inc) payment.refundAttempt += update.$inc.refundAttempt;
        return { modifiedCount: 1 };
      },
    },
    runTransaction: (work) => work({}),
  });
  assert.equal(
    (await service.retryRefund(userId, String(payment._id))).status,
    'processed',
  );
  assert.equal(payment.status, 'refunded');
  assert.equal(payment.providerRefundId, 'rfnd_success');
  assert.equal(created, 1);
});

test('delayed webhook from previous failed refund cannot bind over a new attempt', async () => {
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    provider: 'razorpay',
    providerPaymentId: 'pay_abc',
    amount: 10000,
    status: 'successful',
    refundStatus: 'pending',
    refundAttempt: 1,
    refundReason: 'expired',
  };
  const refunds = {
    rfnd_old: {
      id: 'rfnd_old',
      payment_id: 'pay_abc',
      amount: 10000,
      receipt: `enr_${payment._id}_0`,
      status: 'failed',
    },
    rfnd_new: {
      id: 'rfnd_new',
      payment_id: 'pay_abc',
      amount: 10000,
      receipt: `enr_${payment._id}_1`,
      status: 'processed',
    },
  };
  const service = createPaymentService({
    keyId: 'key',
    qrSecret,
    now: () => at,
    gateway: { fetchRefund: async (id) => refunds[id] },
    paymentModel: {
      findOne: async () => ({ ...payment }),
      findById: () => query(payment),
      updateOne: async (filter, update) => {
        if (
          filter.refundAttempt !== undefined &&
          filter.refundAttempt !== payment.refundAttempt
        )
          return { matchedCount: 0, modifiedCount: 0 };
        Object.assign(payment, update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      },
    },
    runTransaction: (work) => work({}),
  });
  assert.equal(
    (await service.acceptRefundWebhook('rfnd_old', 'pay_abc')).status,
    'ignored',
  );
  assert.equal(payment.providerRefundId, undefined);
  assert.equal(payment.refundStatus, 'pending');
  assert.equal(
    (await service.acceptRefundWebhook('rfnd_new', 'pay_abc')).status,
    'processed',
  );
  assert.equal(payment.providerRefundId, 'rfnd_new');
  assert.equal(payment.status, 'refunded');
});

test('refund attempt guard rejects a webhook crossing the retry transition', async () => {
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    providerPaymentId: 'pay_abc',
    amount: 10000,
    refundStatus: 'pending',
    refundAttempt: 0,
  };
  let updates = 0;
  const service = createPaymentService({
    keyId: 'key',
    qrSecret,
    gateway: {
      fetchRefund: async (id) => {
        payment.refundAttempt = 1;
        return {
          id,
          payment_id: 'pay_abc',
          amount: 10000,
          receipt: `enr_${payment._id}_0`,
          status: 'failed',
        };
      },
    },
    paymentModel: {
      findOne: async () => ({ ...payment }),
      updateOne: async (filter) => {
        updates += 1;
        return {
          matchedCount: filter.refundAttempt === payment.refundAttempt ? 1 : 0,
        };
      },
    },
  });
  assert.equal(
    (await service.acceptRefundWebhook('rfnd_old', 'pay_abc')).status,
    'ignored',
  );
  assert.equal(updates, 1);
  assert.equal(payment.providerRefundId, undefined);
});

test('webhook rejects invalid signatures and accepts the exact signed bytes', async (t) => {
  const calls = [];
  const app = express();
  app.use(
    '/api/webhooks/razorpay',
    createPaymentWebhookRouter({
      webhookSecret: 'webhook-secret',
      service: {
        fulfill: async (...args) => {
          calls.push(args);
          return { status: 'confirmed' };
        },
      },
    }),
  );
  app.use((error, _request, response, _next) => {
    response
      .status(error instanceof ApiError ? error.status : 500)
      .json({ error: error.code });
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const body = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: { entity: { order_id: 'order_abc', id: 'pay_abc' } },
    },
  });
  const url = `http://127.0.0.1:${server.address().port}/api/webhooks/razorpay`;
  const invalid = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': 'bad',
    },
    body,
  });
  assert.equal(invalid.status, 400);
  assert.equal(calls.length, 0);
  const signature = createHmac('sha256', 'webhook-secret')
    .update(body)
    .digest('hex');
  const valid = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body,
  });
  assert.equal(valid.status, 200);
  assert.deepEqual(calls, [['order_abc', 'pay_abc']]);
});

test('checkout verification returns 503 when the signing secret is unavailable', async (t) => {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/payments',
    createPaymentRouter({
      service: {},
      readAuth: () => ({ isAuthenticated: true, userId: 'clerk_1' }),
      userModel: {
        findOne: async () => ({
          _id: userId,
          roles: ['attendee'],
          accountStatus: 'active',
          verification: { emailVerified: true },
        }),
      },
    }),
  );
  app.use((error, _request, response, _next) => {
    response
      .status(error instanceof ApiError ? error.status : 500)
      .json({ error: error.code });
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/payments/${new mongoose.Types.ObjectId()}/verify`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerPaymentId: 'pay_abc',
        signature: 'a'.repeat(64),
      }),
    },
  );
  assert.equal(response.status, 503);
});
