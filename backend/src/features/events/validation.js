import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';

const bodyFields = new Set([
  'venueId',
  'name',
  'description',
  'category',
  'startDate',
  'endDate',
  'maxAttendees',
  'ticketPrice',
]);
const publicQueryFields = new Set([
  'page',
  'limit',
  'q',
  'city',
  'category',
  'from',
  'to',
  'minPrice',
  'maxPrice',
  'sort',
]);
const organizerQueryFields = new Set(['page', 'limit', 'status']);
const statuses = new Set(['draft', 'published', 'cancelled', 'completed']);
const isoDateTime =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function invalid(message) {
  throw new ApiError(400, 'VALIDATION_ERROR', message);
}

function object(value, allowed, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    invalid(`${label} must be an object`);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) invalid(`Unsupported ${label} field: ${key}`);
  }
}

function text(value, label, { required = false, max = 5000 } = {}) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    invalid(`${label} must be a valid string`);
  return value.trim();
}

function dateTime(value, label) {
  if (typeof value !== 'string' || !isoDateTime.test(value))
    invalid(`Invalid ${label}`);
  const [, year, month, day, hour, minute, second] =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(value);
  const daysInMonth = new Date(
    Date.UTC(Number(year), Number(month), 0),
  ).getUTCDate();
  if (
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(day) < 1 ||
    Number(day) > daysInMonth ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  )
    invalid(`Invalid ${label}`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) invalid(`Invalid ${label}`);
  return date;
}

function integer(value, fallback, maximum, label) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))
    invalid(`Invalid ${label}`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > maximum)
    invalid(`Invalid ${label}`);
  return number;
}

function price(value, label) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value))
    invalid(`Invalid ${label}`);
  const number = Number(value);
  if (!Number.isFinite(number)) invalid(`Invalid ${label}`);
  return number;
}

export function isWholePaisePrice(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    return false;
  const paise = Math.round(value * 100);
  return Number.isSafeInteger(paise) && paise / 100 === value;
}

export function parseEventBody(body, { partial = false } = {}) {
  object(body, bodyFields, 'event');
  if (partial && Object.keys(body).length === 0)
    invalid('Event update is empty');
  const output = {};
  if (Object.hasOwn(body, 'venueId') || !partial) {
    if (!mongoose.isObjectIdOrHexString(body.venueId))
      invalid('Invalid venue ID');
    output.venueId = body.venueId;
  }
  for (const field of ['name', 'description', 'category']) {
    if (Object.hasOwn(body, field) || (!partial && field === 'name')) {
      output[field] = text(body[field], field, { required: field === 'name' });
    }
  }
  for (const field of ['startDate', 'endDate']) {
    if (Object.hasOwn(body, field) || !partial)
      output[field] = dateTime(body[field], field);
  }
  if (output.startDate && output.endDate && output.endDate <= output.startDate)
    invalid('End date must be after start date');
  if (Object.hasOwn(body, 'maxAttendees') || !partial) {
    if (!Number.isSafeInteger(body.maxAttendees) || body.maxAttendees < 1)
      invalid('Capacity must be a positive integer');
    output.maxAttendees = body.maxAttendees;
  }
  if (Object.hasOwn(body, 'ticketPrice') || !partial) {
    if (!isWholePaisePrice(body.ticketPrice))
      invalid('Ticket price must be nonnegative and represent whole paise');
    output.ticketPrice = body.ticketPrice;
  }
  return output;
}

export function parsePublicEventQuery(query) {
  object(query, publicQueryFields, 'query');
  const output = {
    page: integer(query.page, 1, 1000000, 'page'),
    limit: integer(query.limit, 20, 100, 'limit'),
  };
  if (query.sort !== undefined) {
    if (!['date', 'price'].includes(query.sort)) invalid('Invalid sort order');
    output.sort = query.sort;
  }
  for (const field of ['q', 'city', 'category']) {
    if (query[field] !== undefined)
      output[field] = text(query[field], field, { required: true, max: 100 });
  }
  for (const field of ['from', 'to']) {
    if (query[field] !== undefined)
      output[field] = dateTime(query[field], field);
  }
  if (output.from && output.to && output.to < output.from)
    invalid('Invalid date range');
  for (const field of ['minPrice', 'maxPrice']) {
    if (query[field] !== undefined) output[field] = price(query[field], field);
  }
  if (
    output.minPrice !== undefined &&
    output.maxPrice !== undefined &&
    output.maxPrice < output.minPrice
  )
    invalid('Invalid price range');
  return output;
}

export function parseOrganizerEventQuery(query) {
  object(query, organizerQueryFields, 'query');
  const output = {
    page: integer(query.page, 1, 1000000, 'page'),
    limit: integer(query.limit, 20, 100, 'limit'),
  };
  if (query.status !== undefined) {
    if (typeof query.status !== 'string' || !statuses.has(query.status))
      invalid('Invalid status');
    output.status = query.status;
  }
  return output;
}

export function assertEmptyTransitionRequest(body, query) {
  object(body ?? {}, new Set(), 'transition');
  object(query, new Set(), 'query');
}
