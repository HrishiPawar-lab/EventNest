import Razorpay from 'razorpay';

const credentialNames = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'TICKET_QR_SECRET',
];

export function loadRazorpayConfig(env = process.env) {
  if (!credentialNames.some((name) => Boolean(env[name]))) return null;
  for (const name of credentialNames) {
    if (typeof env[name] !== 'string' || !env[name].trim()) {
      throw new Error(`${name} is required when Razorpay is configured`);
    }
  }
  if (env.TICKET_QR_SECRET.trim().length < 32)
    throw new Error('TICKET_QR_SECRET must be at least 32 characters');
  return {
    keyId: env.RAZORPAY_KEY_ID.trim(),
    keySecret: env.RAZORPAY_KEY_SECRET.trim(),
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET.trim(),
    qrSecret: env.TICKET_QR_SECRET.trim(),
  };
}

export function createRazorpayClient(config) {
  return new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
}
