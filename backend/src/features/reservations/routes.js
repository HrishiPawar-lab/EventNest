import { Router } from 'express';
import { ApiError } from '../../apiError.js';
import { createRequireEventNestUser } from '../../middleware/requireEventNestUser.js';
import { User } from '../../models/User.js';
import { createUserRateLimit } from '../../middleware/userRateLimit.js';
import { createReservationService } from './service.js';

function parseReservationBody(body) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !['eventId', 'quantity'].includes(key))
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid reservation body');
  }
  if (
    typeof body.eventId !== 'string' ||
    !Number.isSafeInteger(body.quantity) ||
    body.quantity < 1 ||
    body.quantity > 10
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Event ID and quantity from 1 to 10 are required',
    );
  }
  return { eventId: body.eventId, quantity: body.quantity };
}

export function createReservationRouter({
  userModel = User,
  readAuth,
  reservationService = createReservationService(),
} = {}) {
  const router = Router();
  const createLimit = createUserRateLimit({ limit: 10 });
  router.use(
    createRequireEventNestUser({
      userModel,
      ...(readAuth ? { readAuth } : {}),
    }),
  );
  router.post('/', createLimit, async (request, response) => {
    const reservation = await reservationService.create(
      request.eventNestUser._id,
      parseReservationBody(request.body),
    );
    response.status(201).json({ data: reservation });
  });
  router.get('/:reservationId', async (request, response) => {
    const reservation = await reservationService.get(
      request.eventNestUser._id,
      request.params.reservationId,
    );
    response.json({ data: reservation });
  });
  router.delete('/:reservationId', async (request, response) => {
    await reservationService.cancel(
      request.eventNestUser._id,
      request.params.reservationId,
    );
    response.status(204).end();
  });
  return router;
}
