import mongoose from 'mongoose';
import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';

const allowedRoles = new Set(['attendee', 'organizer']);

function authenticatedUser(request, response) {
  const user = request.eventNestUser;
  if (user?._id) return user;

  response.status(401).json({
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
  });
  return null;
}

function hasRole(user, role) {
  return Array.isArray(user.roles) && user.roles.includes(role);
}

function forbid(response) {
  response.status(403).json({
    error: { code: 'FORBIDDEN', message: 'Access denied' },
  });
}

export function requireRole(role) {
  if (!allowedRoles.has(role)) {
    throw new TypeError('Unsupported EventNest role');
  }

  return function checkRole(request, response, next) {
    const user = authenticatedUser(request, response);
    if (!user) return;
    if (!hasRole(user, role)) {
      forbid(response);
      return;
    }
    next();
  };
}

function createOwnerGuard(model, paramName) {
  return async function requireOwner(request, response, next) {
    const user = authenticatedUser(request, response);
    if (!user) return;
    if (!hasRole(user, 'organizer')) {
      forbid(response);
      return;
    }

    const resourceId = request.params?.[paramName];
    if (!mongoose.isObjectIdOrHexString(resourceId)) {
      response.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid resource ID' },
      });
      return;
    }

    try {
      const resource = await model.findById(resourceId, { organizerId: 1 });
      if (!resource) {
        response.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
        });
        return;
      }
      if (String(resource.organizerId) !== String(user._id)) {
        forbid(response);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createRequireVenueOwner({ venueModel = Venue } = {}) {
  return createOwnerGuard(venueModel, 'venueId');
}

export function createRequireEventOwner({ eventModel = Event } = {}) {
  return createOwnerGuard(eventModel, 'eventId');
}

export const requireVenueOwner = createRequireVenueOwner();
export const requireEventOwner = createRequireEventOwner();
