export interface ApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface ApiClient {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

/** Prefers the server's own `message` (see `ApiErrorBody`) over a bare status line. */
function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return `Request failed with status ${status}`;
}

export function createApiClient({ baseUrl, fetcher = fetch }: ApiClientOptions): ApiClient {
  return {
    async request<T>(path: string, options: RequestOptions = {}) {
      const headers = new Headers(options.headers);
      if (options.body !== undefined) headers.set('Content-Type', 'application/json');

      const response = await fetcher(joinUrl(baseUrl, path), {
        ...options,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: 'include',
        headers,
      });
      const body = await readBody(response);

      if (!response.ok) {
        throw new ApiError(errorMessage(body, response.status), response.status, body);
      }

      return body as T;
    },
  };
}

export * from './stakeholders';
export * from './partnerships';
export * from './consultations';
export * from './kol';
export * from './microsites';
export * from './international';
export * from './travel';
export { queryString } from './query';
