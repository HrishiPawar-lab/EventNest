import { Router } from 'express';
import { createRequireEventNestUser } from '../../middleware/requireEventNestUser.js';
import { requireRole } from '../../middleware/authorization.js';
import { User } from '../../models/User.js';
import { createEventService } from './service.js';
import {
  assertEmptyTransitionRequest,
  parseEventBody,
  parseOrganizerEventQuery,
  parsePublicEventQuery,
} from './validation.js';

function sendList(response, result) {
  response.json({
    data: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  });
}

export function createPublicEventRouter({
  eventService = createEventService(),
} = {}) {
  const router = Router();
  router.get('/', async (request, response) => {
    sendList(
      response,
      await eventService.listPublic(parsePublicEventQuery(request.query)),
    );
  });
  router.get('/:eventId', async (request, response) => {
    response.json({
      data: await eventService.getPublic(request.params.eventId),
    });
  });
  return router;
}

export function createOrganizerEventRouter({
  userModel = User,
  readAuth,
  eventService = createEventService(),
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
    const event = await eventService.create(
      request.eventNestUser._id,
      parseEventBody(request.body),
    );
    response.status(201).json({ data: event });
  });
  router.get('/', async (request, response) => {
    const result = await eventService.listOrganizer(
      request.eventNestUser._id,
      parseOrganizerEventQuery(request.query),
    );
    sendList(response, result);
  });
  router.get('/:eventId', async (request, response) => {
    response.json({
      data: await eventService.getOrganizer(
        request.eventNestUser._id,
        request.params.eventId,
      ),
    });
  });
  router.patch('/:eventId', async (request, response) => {
    response.json({
      data: await eventService.update(
        request.eventNestUser._id,
        request.params.eventId,
        parseEventBody(request.body, { partial: true }),
      ),
    });
  });
  router.post('/:eventId/publish', async (request, response) => {
    assertEmptyTransitionRequest(request.body, request.query);
    response.json({
      data: await eventService.publish(
        request.eventNestUser._id,
        request.params.eventId,
      ),
    });
  });
  router.post('/:eventId/cancel', async (request, response) => {
    assertEmptyTransitionRequest(request.body, request.query);
    response.json({
      data: await eventService.cancel(
        request.eventNestUser._id,
        request.params.eventId,
      ),
    });
  });
  return router;
}
