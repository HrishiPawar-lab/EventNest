import { Router } from 'express';
import { createRequireEventNestUser } from '../../middleware/requireEventNestUser.js';
import { User } from '../../models/User.js';
import { parsePagination } from '../../pagination.js';
import { createWishlistService } from './service.js';

export function createWishlistRouter({
  userModel = User,
  readAuth,
  wishlistService = createWishlistService(),
} = {}) {
  const router = Router();
  router.use(
    createRequireEventNestUser({
      userModel,
      ...(readAuth ? { readAuth } : {}),
    }),
  );

  router.get('/', async (request, response) => {
    const result = await wishlistService.list(
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
  router.put('/:eventId', async (request, response) => {
    const result = await wishlistService.add(
      request.eventNestUser._id,
      request.params.eventId,
    );
    response.json({ data: result });
  });
  router.delete('/:eventId', async (request, response) => {
    await wishlistService.remove(
      request.eventNestUser._id,
      request.params.eventId,
    );
    response.status(204).end();
  });
  return router;
}
