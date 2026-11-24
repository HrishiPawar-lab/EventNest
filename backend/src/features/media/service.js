import { Buffer } from 'node:buffer';
import { ApiError } from '../../apiError.js';
import { cloudinaryClient } from '../../config/cloudinary.js';
import { Event } from '../../models/Event.js';
import { Venue } from '../../models/Venue.js';

function isImage(bytes, contentType) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length === 0 ||
    bytes.length > 5 * 1024 * 1024
  )
    return false;
  if (contentType === 'image/jpeg')
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  if (contentType === 'image/png')
    return (
      bytes.length >= 8 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    );
  if (contentType === 'image/webp')
    return (
      bytes.length >= 12 &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP'
    );
  return false;
}

function uploadImage(client, bytes, folder) {
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      { folder, resource_type: 'image', overwrite: false, timeout: 10000 },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.on('error', reject);
    stream.end(bytes);
  });
}

export function createMediaService({
  client = cloudinaryClient,
  configured = false,
  venueModel = Venue,
  eventModel = Event,
  logger = console,
} = {}) {
  async function resource(model, id, organizerId) {
    const document = await model.findById(id);
    if (!document) throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    if (String(document.organizerId) !== String(organizerId))
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    return document;
  }

  async function destroyAsset(publicId) {
    const result = await client.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    if (result?.result !== 'ok' && result?.result !== 'not found') {
      throw new ApiError(502, 'MEDIA_PROVIDER_ERROR', 'Media removal failed');
    }
  }

  async function destroyOld(publicId) {
    if (!publicId) return;
    try {
      await destroyAsset(publicId);
    } catch {
      logger.error('EventNest could not remove an old cover image.');
    }
  }

  return {
    async replace(kind, id, organizerId, bytes, contentType) {
      if (!configured)
        throw new ApiError(
          503,
          'MEDIA_UNAVAILABLE',
          'Media service unavailable',
        );
      if (!isImage(bytes, contentType))
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'A JPEG, PNG, or WebP image up to 5 MB is required',
        );
      const model = kind === 'event' ? eventModel : venueModel;
      const document = await resource(model, id, organizerId);
      const uploaded = await uploadImage(client, bytes, `eventnest/${kind}s`);
      if (
        typeof uploaded?.secure_url !== 'string' ||
        !uploaded.secure_url.startsWith('https://') ||
        typeof uploaded.public_id !== 'string' ||
        !uploaded.public_id
      ) {
        if (typeof uploaded?.public_id === 'string' && uploaded.public_id) {
          await destroyOld(uploaded.public_id);
        }
        throw new ApiError(502, 'MEDIA_PROVIDER_ERROR', 'Media upload failed');
      }
      const previousId = document.imagePublicId;
      const expectedImage = previousId
        ? { imagePublicId: previousId }
        : { imagePublicId: { $exists: false } };
      let updated;
      try {
        updated = await model.findOneAndUpdate(
          { _id: id, organizerId, ...expectedImage },
          {
            $set: {
              imageUrl: uploaded.secure_url,
              imagePublicId: uploaded.public_id,
            },
          },
          { new: true, runValidators: true },
        );
      } catch (error) {
        await destroyOld(uploaded.public_id);
        throw error;
      }
      if (!updated) {
        await destroyOld(uploaded.public_id);
        throw new ApiError(
          409,
          'COVER_CHANGED',
          'Cover image changed; retry upload',
        );
      }
      if (previousId !== uploaded.public_id) await destroyOld(previousId);
      return { imageUrl: updated.imageUrl };
    },
  };
}
