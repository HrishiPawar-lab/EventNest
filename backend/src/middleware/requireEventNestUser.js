import { getAuth } from '@clerk/express';
import { User } from '../models/User.js';

export function createRequireEventNestUser({
  userModel = User,
  readAuth = getAuth,
} = {}) {
  return async function requireEventNestUser(request, response, next) {
    try {
      const auth = readAuth(request);
      if (
        !auth?.isAuthenticated ||
        typeof auth.userId !== 'string' ||
        !auth.userId.trim()
      ) {
        response.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const user = await userModel.findOne({ clerkId: auth.userId });
      if (!user) {
        response.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      if (user.accountStatus !== 'active') {
        response.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Account access denied' },
        });
        return;
      }

      if (
        user.verification?.emailVerified !== true ||
        user.verification?.phoneVerified !== true
      ) {
        response.status(403).json({
          error: {
            code: 'VERIFICATION_REQUIRED',
            message: 'Account verification required',
          },
        });
        return;
      }

      request.eventNestUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireEventNestUser = createRequireEventNestUser();
