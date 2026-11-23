import express from 'express';
import { verifyWebhook } from '@clerk/express/webhooks';
import { User } from './models/User.js';
import {
  InvalidWebhookPayloadError,
  syncClerkUser,
} from './services/clerkUserSync.js';

export function createApp({
  webhookSigningSecret,
  clerkClient,
  userModel = User,
  clerkSessionMiddleware,
} = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.post(
    '/api/webhooks/clerk',
    express.raw({ type: 'application/json', limit: '100kb' }),
    async (request, response, next) => {
      if (!webhookSigningSecret || !clerkClient) {
        response.status(503).json({
          error: {
            code: 'WEBHOOK_UNAVAILABLE',
            message: 'Webhook unavailable',
          },
        });
        return;
      }

      let event;
      try {
        event = await verifyWebhook(request, {
          signingSecret: webhookSigningSecret,
        });
      } catch {
        response.status(400).json({
          error: { code: 'INVALID_WEBHOOK', message: 'Invalid webhook' },
        });
        return;
      }

      try {
        const status = await syncClerkUser(event, {
          getClerkUser: (id) => clerkClient.users.getUser(id),
          userModel,
        });
        response.status(200).json({ status });
      } catch (error) {
        if (error instanceof InvalidWebhookPayloadError) {
          response.status(400).json({
            error: { code: 'INVALID_WEBHOOK', message: 'Invalid webhook' },
          });
          return;
        }
        next(error);
      }
    },
  );

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  if (clerkSessionMiddleware) app.use(clerkSessionMiddleware);
  app.use(express.json({ limit: '100kb' }));

  app.use((_request, response) => {
    response
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use((error, _request, response, _next) => {
    const status = [400, 413, 415].includes(error.status) ? error.status : 500;
    const errors = {
      400: { code: 'BAD_REQUEST', message: 'Invalid request body' },
      413: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' },
      415: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported request encoding',
      },
      500: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    };
    response.status(status).json({ error: errors[status] });
  });

  return app;
}
