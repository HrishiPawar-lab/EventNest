import mongoose from 'mongoose';
import { isE164, isEmail } from './validators.js';

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: { validator: isEmail, message: 'Invalid email address' },
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      validate: { validator: isE164, message: 'Phone number must be E.164' },
    },
    profilePicture: { type: String, trim: true },
    roles: {
      type: [{ type: String, enum: ['attendee', 'organizer'] }],
      required: true,
      default: ['attendee'],
      validate: {
        validator: (roles) =>
          Array.isArray(roles) &&
          roles.length > 0 &&
          new Set(roles).size === roles.length,
        message: 'Roles must be nonempty and unique',
      },
    },
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    verification: {
      emailVerified: { type: Boolean, required: true, default: false },
      phoneVerified: { type: Boolean, required: true, default: false },
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deactivated'],
      required: true,
      default: 'active',
    },
  },
  { collection: 'users', timestamps: true },
);

userSchema.index({ clerkId: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phoneNumber: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
