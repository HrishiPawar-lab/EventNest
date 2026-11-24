import { rateLimit } from 'express-rate-limit';

export function createUserRateLimit({ limit, windowMs = 60000 }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (request) => String(request.eventNestUser._id),
    handler: (_request, response) => {
      response.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests; try again later',
        },
      });
    },
  });
}
