import { ApiError } from './apiError.js';

export function parsePagination(query) {
  for (const field of Object.keys(query)) {
    if (field !== 'page' && field !== 'limit') {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `Unsupported query field: ${field}`,
      );
    }
  }
  const parse = (value, fallback, maximum, label) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Invalid ${label}`);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > maximum) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Invalid ${label}`);
    }
    return number;
  };
  return {
    page: parse(query.page, 1, 1000000, 'page'),
    limit: parse(query.limit, 20, 100, 'limit'),
  };
}
