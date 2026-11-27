import { Router } from 'express';
import { createRequireEventNestUser } from '../../middleware/requireEventNestUser.js';
import { requireRole } from '../../middleware/authorization.js';
import { User } from '../../models/User.js';
import { parsePagination } from '../../pagination.js';
import { createUserRateLimit } from '../../middleware/userRateLimit.js';
import { ApiError } from '../../apiError.js';
import { createOrganizerService } from './service.js';

export function createOrganizerRouter({
  userModel = User,
  readAuth,
  organizerService = createOrganizerService(),
} = {}) {
  const router = Router();
  router.use(
    createRequireEventNestUser({
      userModel,
      ...(readAuth ? { readAuth } : {}),
    }),
  );
  router.post(
    '/activate',
    createUserRateLimit({ limit: 5 }),
    async (request, response) => {
      if (request.body && Object.keys(request.body).length > 0) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'Activation takes no fields',
        );
      }
      const user = await userModel.findOneAndUpdate(
        {
          _id: request.eventNestUser._id,
          accountStatus: 'active',
          'verification.emailVerified': true,
        },
        { $addToSet: { roles: 'organizer' } },
        { new: true, runValidators: true, projection: { roles: 1 } },
      );
      if (!user) throw new ApiError(403, 'FORBIDDEN', 'Account access denied');
      response.json({ data: { roles: user.roles } });
    },
  );
  router.use(requireRole('organizer'));
  router.get('/dashboard', async (request, response) => {
    response.json({
      data: await organizerService.dashboard(request.eventNestUser._id),
    });
  });
  router.get('/events/:eventId/analytics', async (request, response) => {
    response.json({
      data: await organizerService.eventAnalytics(
        request.eventNestUser._id,
        request.params.eventId,
      ),
    });
  });
  router.get('/events/:eventId/attendees', async (request, response) => {
    const result = await organizerService.attendees(
      request.eventNestUser._id,
      request.params.eventId,
      parsePagination(request.query),
    );
    response.json({
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    });
  });
  return router;
}
