export const isPositiveInteger = (value) =>
  Number.isSafeInteger(value) && value > 0;

export const isNonNegativeInteger = (value) =>
  Number.isSafeInteger(value) && value >= 0;

export const isNonNegativeAmount = (value) =>
  Number.isFinite(value) && value >= 0;

export const isPositiveAmount = (value) => Number.isFinite(value) && value > 0;

export const isE164 = (value) => /^\+[1-9]\d{1,14}$/.test(value);

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
