import express, { Router } from 'express';
import { ApiError } from '../../apiError.js';
import {
  createRequireEventOwner,
  createRequireVenueOwner,
} from '../../middleware/authorization.js';
import { createRequireEventNestUser } from '../../middleware/requireEventNestUser.js';
import { User } from '../../models/User.js';
import { createUserRateLimit } from '../../middleware/userRateLimit.js';
import { createMediaService } from './service.js';

const parseImage = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: '5mb',
});

export function createMediaRouter({
  userModel = User,
  readAuth,
  mediaService = createMediaService(),
  eventModel,
  venueModel,
} = {}) {
  const router = Router();
  const uploadLimit = createUserRateLimit({
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  router.use(
    createRequireEventNestUser({
      userModel,
      ...(readAuth ? { readAuth } : {}),
    }),
  );
  for (const [kind, path, ownerGuard] of [
    [
      'venue',
      '/venues/:venueId/cover',
      createRequireVenueOwner({ venueModel }),
    ],
    [
      'event',
      '/events/:eventId/cover',
      createRequireEventOwner({ eventModel }),
    ],
  ]) {
    const param = kind === 'venue' ? 'venueId' : 'eventId';
    router.put(
      path,
      ownerGuard,
      uploadLimit,
      parseImage,
      async (request, response) => {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(
            request.headers['content-type'],
          )
        ) {
          throw new ApiError(
            415,
            'UNSUPPORTED_MEDIA_TYPE',
            'Unsupported image type',
          );
        }
        response.json({
          data: await mediaService.replace(
            kind,
            request.params[param],
            request.eventNestUser._id,
            request.body,
            request.headers['content-type'],
          ),
        });
      },
    );
  }
  return router;
}
