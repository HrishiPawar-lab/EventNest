import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { Event } from '../../models/Event.js';
import { Wishlist } from '../../models/Wishlist.js';

function assertEventId(eventId) {
  if (!mongoose.isObjectIdOrHexString(eventId)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid event ID');
  }
}

export function createWishlistService({
  wishlistModel = Wishlist,
  eventModel = Event,
} = {}) {
  return {
    async add(userId, eventId) {
      assertEventId(eventId);
      if (!(await eventModel.exists({ _id: eventId, status: 'published' }))) {
        throw new ApiError(404, 'NOT_FOUND', 'Event not found');
      }
      try {
        await wishlistModel.updateOne(
          { userId, eventId },
          { $setOnInsert: { userId, eventId } },
          { upsert: true },
        );
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
      return { eventId, saved: true };
    },
    async remove(userId, eventId) {
      assertEventId(eventId);
      await wishlistModel.deleteOne({ userId, eventId });
    },
    async list(userId, { page, limit }) {
      const filter = { userId };
      const [items, total] = await Promise.all([
        wishlistModel
          .find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate({
            path: 'eventId',
            select:
              'name category startDate endDate ticketPrice status location imageUrl',
          }),
        wishlistModel.countDocuments(filter),
      ]);
      return { items, page, limit, total };
    },
  };
}
