import { Router } from 'express';
import { ApiError } from '../../apiError.js';
import { createRequireEventOwner } from '../../middleware/authorization.js';
import { createRequireEventNestUser } from '../../middleware/requireEventNestUser.js';
import { Event } from '../../models/Event.js';
import { User } from '../../models/User.js';
import { createUserRateLimit } from '../../middleware/userRateLimit.js';
import { createCheckinService } from './service.js';

export function createCheckinRouter({
  userModel = User,
  eventModel = Event,
  readAuth,
  checkinService = createCheckinService(),
} = {}) {
  const router = Router();
  const scanLimit = createUserRateLimit({ limit: 120 });
  router.use(
    createRequireEventNestUser({
      userModel,
      ...(readAuth ? { readAuth } : {}),
    }),
  );
  router.post(
    '/:eventId/check-ins',
    scanLimit,
    createRequireEventOwner({ eventModel }),
    async (request, response) => {
      const body = request.body;
      if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).length !== 1 ||
        typeof body.token !== 'string'
      ) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'QR token is required');
      }
      const result = await checkinService.checkIn(
        request.params.eventId,
        request.eventNestUser._id,
        body.token,
      );
      response.status(200).json({ data: result });
    },
  );
  return router;
}
