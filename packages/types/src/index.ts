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
