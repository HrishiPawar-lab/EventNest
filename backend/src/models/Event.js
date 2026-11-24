import mongoose from 'mongoose';
import { addCoverImageFields } from './coverImage.js';
import {
  isNonNegativeAmount,
  isNonNegativeInteger,
  isPositiveInteger,
} from './validators.js';

const eventSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    eventType: {
      type: String,
      enum: ['in-person'],
      required: true,
      default: 'in-person',
    },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startDate || value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    maxAttendees: {
      type: Number,
      required: true,
      validate: {
        validator: isPositiveInteger,
        message: 'Capacity must be a positive integer',
      },
    },
    ticketPrice: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativeAmount,
        message: 'Ticket price must be nonnegative',
      },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      required: true,
      default: 'draft',
    },
    location: {
      city: { type: String, required: true, trim: true },
      state: { type: String, trim: true },
      country: { type: String, required: true, trim: true },
    },
    ticketsSold: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: isNonNegativeInteger,
        message: 'Sold count must be nonnegative',
      },
    },
    ticketsReserved: {
      type: Number,
      required: true,
      default: 0,
      validate: [
        {
          validator: isNonNegativeInteger,
          message: 'Reserved count must be nonnegative',
        },
        {
          validator(value) {
            return (
              this.maxAttendees == null ||
              this.ticketsSold == null ||
              this.ticketsSold + value <= this.maxAttendees
            );
          },
          message: 'Sold and reserved counts cannot exceed capacity',
        },
      ],
    },
  },
  { collection: 'events', timestamps: true },
);

addCoverImageFields(eventSchema);

eventSchema.index({ organizerId: 1, createdAt: -1 });
eventSchema.index({ venueId: 1 });
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ 'location.city': 1, status: 1, startDate: 1 });

export const Event = mongoose.model('Event', eventSchema);
