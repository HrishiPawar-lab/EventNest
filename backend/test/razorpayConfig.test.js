import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadRazorpayConfig } from '../src/config/razorpay.js';

test('Razorpay configuration is optional until any credential is supplied', () => {
  assert.equal(loadRazorpayConfig({}), null);
});

test('Razorpay credentials load as a complete set without logging values', () => {
  assert.deepEqual(
    loadRazorpayConfig({
      RAZORPAY_KEY_ID: ' key_1 ',
      RAZORPAY_KEY_SECRET: ' secret_1 ',
      RAZORPAY_WEBHOOK_SECRET: ' webhook_1 ',
      TICKET_QR_SECRET: ' 01234567890123456789012345678901 ',
    }),
    {
      keyId: 'key_1',
      keySecret: 'secret_1',
      webhookSecret: 'webhook_1',
      qrSecret: '01234567890123456789012345678901',
    },
  );
  assert.throws(() => loadRazorpayConfig({ RAZORPAY_KEY_ID: 'key_1' }), {
    message: 'RAZORPAY_KEY_SECRET is required when Razorpay is configured',
  });
});
