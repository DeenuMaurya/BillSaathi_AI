/**
 * The `{ data, error }` response envelope from docs/API.md section 3.
 *
 * Pure data structures only -- no `next/server` import -- so that this module
 * stays unit-testable and usable from both route handlers and server actions.
 */

export const ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'DUPLICATE_CANDIDATE',
  'PROCESSING_FAILED',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiError {
  code: ErrorCode;
  message: string;
  /**
   * Field-level validation messages, for VALIDATION_ERROR only. Never carries
   * internal diagnostics.
   */
  fields?: Record<string, string>;
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

export function ok<T>(data: T): ApiResponse<T> {
  return { data, error: null };
}

export function fail(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): ApiResponse<never> {
  return {
    data: null,
    error: fields === undefined ? { code, message } : { code, message, fields },
  };
}

export const HTTP_STATUS_BY_ERROR_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  // The request was understood and refused because it would create a
  // duplicate; the client is expected to show the existing record.
  DUPLICATE_CANDIDATE: 409,
  CONFLICT: 409,
  PROCESSING_FAILED: 502,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/**
 * Client-safe default messages.
 *
 * NOT_FOUND and FORBIDDEN are phrased so that neither confirms a record
 * exists: probing UUIDs must not reveal which ones are real
 * (docs/APP_FLOW.md section 8, docs/SECURITY.md section 5).
 */
export const SAFE_ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested record is not available.',
  VALIDATION_ERROR: 'Please check the submitted fields.',
  DUPLICATE_CANDIDATE: 'A possible duplicate was found. Review it before continuing.',
  PROCESSING_FAILED: 'Processing could not be completed. You can retry.',
  CONFLICT: 'This record changed since you loaded it. Refresh and try again.',
  RATE_LIMITED: 'Too many requests. Please wait and try again.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
};

/** Builds an error response using the safe default message for the code. */
export function failSafe(code: ErrorCode): ApiResponse<never> {
  return fail(code, SAFE_ERROR_MESSAGES[code]);
}
