import { URL } from 'node:url';

function isSecureImageUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      url.pathname !== '/'
    );
  } catch {
    return false;
  }
}

export function addCoverImageFields(schema) {
  schema.add({
    imageUrl: {
      type: String,
      trim: true,
      validate: {
        validator: isSecureImageUrl,
        message: 'Cover image URL must use HTTPS',
      },
    },
    imagePublicId: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Cover image public ID is required when provided',
      },
    },
  });

  schema.pre('validate', function validateCoverImagePair() {
    if ((this.imageUrl === undefined) !== (this.imagePublicId === undefined)) {
      this.invalidate(
        'imageUrl',
        'Cover image URL and public ID must be set together',
      );
    }
  });
}
