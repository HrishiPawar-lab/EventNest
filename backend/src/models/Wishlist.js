import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
  },
  {
    collection: 'wishlists',
    timestamps: { createdAt: true, updatedAt: false },
  },
);

wishlistSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
