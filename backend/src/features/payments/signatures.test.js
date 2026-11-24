import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import {
  verifyCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from './signatures.js';

test('Razorpay checkout signature authenticates the server order ID and payment ID', () => {
  const secret = 'test-secret';
  const signature = createHmac('sha256', secret)
    .update('order_1|pay_1')
    .digest('hex');
  assert.equal(
    verifyCheckoutSignature('order_1', 'pay_1', signature, secret),
    true,
  );
  assert.equal(
    verifyCheckoutSignature('order_2', 'pay_1', signature, secret),
    false,
  );
  assert.equal(
    verifyCheckoutSignature('order_1', 'pay_1', 'bad', secret),
    false,
  );
});

test('Razorpay webhook signature uses the exact raw bytes', () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const signature = createHmac('sha256', 'webhook-secret')
    .update(body)
    .digest('hex');
  assert.equal(
    verifyRazorpayWebhookSignature(body, signature, 'webhook-secret'),
    true,
  );
  assert.equal(
    verifyRazorpayWebhookSignature(
      Buffer.from('{ "event":"payment.captured" }'),
      signature,
      'webhook-secret',
    ),
    false,
  );
  assert.equal(
    verifyRazorpayWebhookSignature(
      { event: 'payment.captured' },
      signature,
      'webhook-secret',
    ),
    false,
  );
});
