import { ApiError } from '@partner-crm/api-client';

/** Server body shape for rejected commands: `{ code, message, fieldErrors, correlationId }`. */
interface ErrorBody {
  code?: unknown;
  fieldErrors?: unknown;
}

function bodyOf(error: unknown): ErrorBody | null {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    return error.body as ErrorBody;
  }
  return null;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function errorCode(error: unknown): string | null {
  const code = bodyOf(error)?.code;
  return typeof code === 'string' ? code : null;
}

/** Field-level messages from a `422`, flattened to strings. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  const raw = bodyOf(error)?.fieldErrors;
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') result[field] = value;
    else if (Array.isArray(value)) result[field] = value.filter((item) => typeof item === 'string').join(' ');
  }
  return result;
}

/** A restricted site the visitor has not unlocked yet. */
export function isLockedError(error: unknown): boolean {
  return (
    (error instanceof ApiError && error.status === 401) || errorCode(error) === 'MICROSITE_LOCKED'
  );
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
