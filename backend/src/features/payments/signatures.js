import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';

function matchesDigest(message, signature, secret) {
  if (
    typeof signature !== 'string' ||
    !/^[0-9a-f]{64}$/i.test(signature) ||
    typeof secret !== 'string' ||
    !secret
  )
    return false;
  const expected = createHmac('sha256', secret).update(message).digest();
  const received = Buffer.from(signature, 'hex');
  return timingSafeEqual(expected, received);
}

export function verifyCheckoutSignature(
  orderId,
  paymentId,
  signature,
  keySecret,
) {
  if (
    typeof orderId !== 'string' ||
    !orderId ||
    typeof paymentId !== 'string' ||
    !paymentId
  )
    return false;
  return matchesDigest(`${orderId}|${paymentId}`, signature, keySecret);
}

export function verifyRazorpayWebhookSignature(
  rawBody,
  signature,
  webhookSecret,
) {
  if (!Buffer.isBuffer(rawBody)) return false;
  return matchesDigest(rawBody, signature, webhookSecret);
}
