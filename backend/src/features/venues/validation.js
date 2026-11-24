import { ApiError } from '../../apiError.js';

const venueTypes = new Set([
  'bar',
  'club',
  'restaurant',
  'auditorium',
  'outdoor',
  'other',
]);
const venueFields = new Set([
  'name',
  'type',
  'description',
  'address',
  'location',
  'capacity',
]);
const addressFields = new Set([
  'street',
  'city',
  'state',
  'country',
  'postalCode',
]);

function invalid(message) {
  throw new ApiError(400, 'VALIDATION_ERROR', message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkFields(value, allowed, label) {
  if (!isRecord(value)) invalid(`${label} must be an object`);
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) invalid(`Unsupported ${label} field: ${field}`);
  }
}

function string(value, label, required = false) {
  if (value === undefined && !required) return;
  if (typeof value !== 'string' || (required && !value.trim())) {
    invalid(`${label} must be a nonempty string`);
  }
  if (value.length > 5000) invalid(`${label} is too long`);
  return value.trim();
}

export function parseVenueBody(body, { partial = false } = {}) {
  checkFields(body, venueFields, 'venue');
  if (partial && Object.keys(body).length === 0)
    invalid('Venue update is empty');

  const output = {};
  for (const field of ['name', 'description']) {
    if (Object.hasOwn(body, field) || (!partial && field === 'name')) {
      output[field] = string(body[field], field, field === 'name');
    }
  }
  if (Object.hasOwn(body, 'type') || !partial) {
    if (!venueTypes.has(body.type)) invalid('Invalid venue type');
    output.type = body.type;
  }
  if (Object.hasOwn(body, 'capacity') || !partial) {
    if (!Number.isSafeInteger(body.capacity) || body.capacity < 1) {
      invalid('Capacity must be a positive integer');
    }
    output.capacity = body.capacity;
  }
  if (Object.hasOwn(body, 'address') || !partial) {
    checkFields(body.address, addressFields, 'address');
    const address = {};
    for (const field of addressFields) {
      if (
        Object.hasOwn(body.address, field) ||
        (!partial && ['city', 'country'].includes(field))
      ) {
        address[field] = string(
          body.address[field],
          `address.${field}`,
          ['city', 'country'].includes(field),
        );
      }
    }
    if (partial && Object.keys(address).length === 0)
      invalid('Address update is empty');
    output.address = address;
  }
  if (Object.hasOwn(body, 'location') || !partial) {
    checkFields(body.location, new Set(['type', 'coordinates']), 'location');
    const { type, coordinates } = body.location;
    if (
      type !== 'Point' ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      !coordinates.every(Number.isFinite) ||
      coordinates[0] < -180 ||
      coordinates[0] > 180 ||
      coordinates[1] < -90 ||
      coordinates[1] > 90
    ) {
      invalid('Location must be a GeoJSON Point with [longitude, latitude]');
    }
    output.location = { type: 'Point', coordinates };
  }
  return output;
}
