export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PageMeta {
  count: number;
  page: number;
  pageSize: number;
  next: string | null;
  previous: string | null;
}

export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> {
  meta: PageMeta;
}

/** Stable error body returned by every backend endpoint on failure. */
export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors: Record<string, string[]>;
  correlationId: string;
}

export * from './stakeholders';
export * from './partnerships';
export * from './consultations';
export * from './kol';
export * from './microsites';
export * from './international';
export * from './travel';
