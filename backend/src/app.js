import express from 'express';
import { verifyWebhook } from '@clerk/express/webhooks';
import { User } from './models/User.js';
import { ApiError } from './apiError.js';
import { createVenueRouter } from './features/venues/routes.js';
import { createWishlistRouter } from './features/wishlist/routes.js';
import { createReservationRouter } from './features/reservations/routes.js';
import {
  createBookingHistoryRouter,
  createTicketRouter,
} from './features/tickets/routes.js';
import { createCheckinRouter } from './features/checkin/routes.js';
import { createOrganizerRouter } from './features/organizer/routes.js';
import { createMediaRouter } from './features/media/routes.js';
import { createMediaService } from './features/media/service.js';
import { createPaymentGateway } from './features/payments/gateway.js';
import {
  createPaymentRouter,
  createPaymentWebhookRouter,
  createTicketQrRouter,
} from './features/payments/routes.js';
import { createPaymentService } from './features/payments/service.js';
import {
  createOrganizerEventRouter,
  createPublicEventRouter,
} from './features/events/routes.js';
import {
  InvalidWebhookPayloadError,
  syncClerkUser,
} from './services/clerkUserSync.js';

export function createApp({
  webhookSigningSecret,
  clerkClient,
  userModel = User,
  clerkSessionMiddleware,
  venueService,
  wishlistService,
  reservationService,
  ticketService,
  checkinService,
  organizerService,
  mediaService,
  mediaConfigured = false,
  eventService,
  razorpayConfig,
  paymentGateway,
  paymentService,
  readAuth,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  const payments =
    paymentService ??
    createPaymentService(
      razorpayConfig
        ? {
            gateway: paymentGateway ?? createPaymentGateway(razorpayConfig),
            keyId: razorpayConfig.keyId,
            qrSecret: razorpayConfig.qrSecret,
          }
        : {},
    );

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
  app.use(
    '/api/webhooks/razorpay',
    createPaymentWebhookRouter({
      service: payments,
      webhookSecret: razorpayConfig?.webhookSecret,
    }),
  );

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use('/api/events', createPublicEventRouter({ eventService }));

  if (clerkSessionMiddleware) app.use(clerkSessionMiddleware);
  app.use(express.json({ limit: '100kb' }));
  app.use(
    '/api/venues',
    createVenueRouter({ userModel, venueService, readAuth }),
  );
  app.use(
    '/api/wishlist',
    createWishlistRouter({ userModel, wishlistService, readAuth }),
  );
  app.use(
    '/api/reservations',
    createReservationRouter({ userModel, reservationService, readAuth }),
  );
  app.use(
    '/api/tickets',
    createTicketRouter({ userModel, readAuth, ticketService }),
  );
  app.use(
    '/api/tickets',
    createTicketQrRouter({ userModel, readAuth, service: payments }),
  );
  app.use(
    '/api/payments',
    createPaymentRouter({
      service: payments,
      keySecret: razorpayConfig?.keySecret,
      userModel,
      readAuth,
    }),
  );
  app.use(
    '/api/bookings',
    createBookingHistoryRouter({ userModel, readAuth, ticketService }),
  );
  app.use(
    '/api/organizer/events',
    createOrganizerEventRouter({ userModel, readAuth, eventService }),
  );
  app.use(
    '/api/organizer/events',
    createCheckinRouter({ userModel, readAuth, checkinService }),
  );
  app.use(
    '/api/organizer',
    createOrganizerRouter({ userModel, readAuth, organizerService }),
  );
  app.use(
    '/api/organizer',
    createMediaRouter({
      userModel,
      readAuth,
      mediaService:
        mediaService ?? createMediaService({ configured: mediaConfigured }),
    }),
  );

  app.use((_request, response) => {
    response
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof ApiError) {
      response
        .status(error.status)
        .json({ error: { code: error.code, message: error.message } });
      return;
    }
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
