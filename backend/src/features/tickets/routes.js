import { Router } from 'express';
import { createRequireEventNestUser } from '../../middleware/requireEventNestUser.js';
import { User } from '../../models/User.js';
import { parsePagination } from '../../pagination.js';
import { createTicketService } from './service.js';

export function createTicketRouter({
  userModel = User,
  readAuth,
  ticketService = createTicketService(),
} = {}) {
  const router = Router();
  router.use(
    createRequireEventNestUser({
      userModel,
      ...(readAuth ? { readAuth } : {}),
    }),
  );
  router.get('/', async (request, response) => {
    const result = await ticketService.list(
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
  router.get('/:ticketId', async (request, response) => {
    response.json({
      data: await ticketService.get(
        request.eventNestUser._id,
        request.params.ticketId,
      ),
    });
  });
  return router;
}

export function createBookingHistoryRouter({
  userModel = User,
  readAuth,
  ticketService = createTicketService(),
} = {}) {
  const router = Router();
  router.use(
    createRequireEventNestUser({
      userModel,
      ...(readAuth ? { readAuth } : {}),
    }),
  );
  router.get('/', async (request, response) => {
    const result = await ticketService.history(
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
  return router;
}
