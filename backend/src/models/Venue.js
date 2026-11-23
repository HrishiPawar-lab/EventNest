import mongoose from 'mongoose';
import { isPositiveInteger } from './validators.js';

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coordinates) =>
          coordinates.length === 2 &&
          Number.isFinite(coordinates[0]) &&
          Number.isFinite(coordinates[1]) &&
          coordinates[0] >= -180 &&
          coordinates[0] <= 180 &&
          coordinates[1] >= -90 &&
          coordinates[1] <= 90,
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false },
);

const venueSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['bar', 'club', 'restaurant', 'auditorium', 'outdoor', 'other'],
      required: true,
    },
    description: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, trim: true },
      country: { type: String, required: true, trim: true },
      postalCode: { type: String, trim: true },
    },
    location: { type: geoPointSchema, required: true },
    capacity: {
      type: Number,
      required: true,
      validate: {
        validator: isPositiveInteger,
        message: 'Capacity must be a positive integer',
      },
    },
  },
  { collection: 'venues', timestamps: true },
);

venueSchema.index({ organizerId: 1 });
venueSchema.index({ 'address.city': 1 });
venueSchema.index({ location: '2dsphere' });

export const Venue = mongoose.model('Venue', venueSchema);
