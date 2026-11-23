import mongoose from 'mongoose';

const qrCredentialSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    tokenHash: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      required: true,
      default: 'active',
    },
  },
  { collection: 'qrCredentials', timestamps: true },
);

qrCredentialSchema.index({ ticketId: 1 }, { unique: true });
qrCredentialSchema.index({ tokenHash: 1 }, { unique: true });

export const QRCredential = mongoose.model('QRCredential', qrCredentialSchema);
