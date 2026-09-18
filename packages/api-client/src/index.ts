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
        throw new ApiError(`Request failed with status ${response.status}`, response.status, body);
      }

      return body as T;
    },
  };
}
