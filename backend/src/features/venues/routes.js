import { Router } from 'express';
import { createRequireEventNestUser } from '../../middleware/requireEventNestUser.js';
import { requireRole } from '../../middleware/authorization.js';
import { User } from '../../models/User.js';
import { parsePagination } from '../../pagination.js';
import { createVenueService } from './service.js';
import { parseVenueBody } from './validation.js';

export function createVenueRouter({
  userModel = User,
  readAuth,
  venueService = createVenueService(),
} = {}) {
  const router = Router();
  router.use(
    createRequireEventNestUser({
      userModel,
      ...(readAuth ? { readAuth } : {}),
    }),
  );
  router.use(requireRole('organizer'));

  router.post('/', async (request, response) => {
    const venue = await venueService.create(
      request.eventNestUser._id,
      parseVenueBody(request.body),
    );
    response.status(201).json({ data: venue });
  });
  router.get('/', async (request, response) => {
    const result = await venueService.list(
      request.eventNestUser._id,
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
  router.get('/:venueId', async (request, response) => {
    const venue = await venueService.get(
      request.eventNestUser._id,
      request.params.venueId,
    );
    response.json({ data: venue });
  });
  router.patch('/:venueId', async (request, response) => {
    const venue = await venueService.update(
      request.eventNestUser._id,
      request.params.venueId,
      parseVenueBody(request.body, { partial: true }),
    );
    response.json({ data: venue });
  });
  router.delete('/:venueId', async (request, response) => {
    await venueService.remove(
      request.eventNestUser._id,
      request.params.venueId,
    );
    response.status(204).end();
  });
  return router;
}
