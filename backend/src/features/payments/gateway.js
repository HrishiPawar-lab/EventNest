import { Buffer } from 'node:buffer';
import { setTimeout, clearTimeout } from 'node:timers';
import { createRazorpayClient } from '../../config/razorpay.js';

export function createPaymentGateway(config, fetcher = fetch) {
  const client = createRazorpayClient(config);
  // The installed Razorpay SDK uses axios but does not expose a timeout option.
  // Set its axios client timeout so provider reads and order creation are bounded.
  if (!client.api?.rq?.defaults)
    throw new Error('Razorpay SDK timeout unavailable');
  client.api.rq.defaults.timeout = 10000;
  return {
    createOrder: (details) => client.orders.create(details),
    fetchPayment: (id) => client.payments.fetch(id),
    fetchRefund: (id) => client.refunds.fetch(id),
    async createRefund(paymentId, amount, idempotencyKey) {
      const controller = new globalThis.AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetcher(
          `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
              'Content-Type': 'application/json',
              'X-Refund-Idempotency': idempotencyKey,
            },
            body: JSON.stringify({ amount, receipt: idempotencyKey }),
            signal: controller.signal,
          },
        );
        if (!response.ok)
          throw new Error(
            `Razorpay refund request failed (${response.status})`,
          );
        return response.json();
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
