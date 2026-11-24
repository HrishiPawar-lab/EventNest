import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { Event } from '../../models/Event.js';
import { Venue } from '../../models/Venue.js';

function assertId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid venue ID');
  }
}

async function ownedVenue(venueModel, id, organizerId, session) {
  assertId(id);
  const query = venueModel.findById(id);
  const venue = await (session ? query.session(session) : query);
  if (!venue) throw new ApiError(404, 'NOT_FOUND', 'Venue not found');
  if (String(venue.organizerId) !== String(organizerId)) {
    throw new ApiError(403, 'FORBIDDEN', 'Access denied');
  }
  return venue;
}

export function createVenueService({
  venueModel = Venue,
  eventModel = Event,
  runTransaction = (operation) => mongoose.connection.transaction(operation),
} = {}) {
  return {
    async create(organizerId, input) {
      const venue = new venueModel({ ...input, organizerId });
      await venue.save();
      return venue;
    },
    async list(organizerId, { page, limit }) {
      const filter = { organizerId };
      const [items, total] = await Promise.all([
        venueModel
          .find(filter)
          .sort({ _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        venueModel.countDocuments(filter),
      ]);
      return { items, page, limit, total };
    },
    async get(organizerId, id) {
      return ownedVenue(venueModel, id, organizerId);
    },
    async update(organizerId, id, input) {
      return runTransaction(async (session) => {
        const venue = await ownedVenue(venueModel, id, organizerId, session);
        const address = input.address
          ? { ...venue.address.toObject(), ...input.address }
          : null;
        const locationChanged =
          address &&
          ['city', 'state', 'country'].some(
            (field) => address[field] !== venue.address[field],
          );
        if (locationChanged) {
          const query = eventModel.exists({ venueId: venue._id });
          if (await (session ? query.session(session) : query)) {
            throw new ApiError(
              409,
              'VENUE_IN_USE',
              'Venue location cannot change while events use it',
            );
          }
        }
        if (input.capacity !== undefined && input.capacity < venue.capacity) {
          const query = eventModel.exists({
            venueId: venue._id,
            maxAttendees: { $gt: input.capacity },
          });
          if (await (session ? query.session(session) : query)) {
            throw new ApiError(
              409,
              'CAPACITY_CONFLICT',
              'Event capacity exceeds venue capacity',
            );
          }
        }
        venue.set({ ...input, ...(address ? { address } : {}) });
        await venue.save({ session });
        return venue;
      });
    },
    async remove(organizerId, id) {
      return runTransaction(async (session) => {
        const venue = await ownedVenue(venueModel, id, organizerId, session);
        const query = eventModel.exists({ venueId: venue._id });
        if (await (session ? query.session(session) : query)) {
          throw new ApiError(409, 'VENUE_IN_USE', 'Venue has events');
        }
        await venue.deleteOne({ session });
      });
    },
  };
}
