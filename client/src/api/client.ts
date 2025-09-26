import { qaLog, qaError } from '../utils/devQa';

export type ApiResult<T> =
  | { kind: 'success'; data: T; status: number }
  | { kind: 'server_error'; status: number; body?: unknown }
  | { kind: 'client_error'; status: number; body?: unknown }
  | { kind: 'network_error'; error: Error }
  | { kind: 'parse_error'; error: Error }
  | { kind: 'schema_error'; status: number; issues: string[] };

interface FetchOptions {
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
}

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_RETRIES = 2;

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async fetchJson<T>(
    path: string,
    options: FetchOptions = {}
  ): Promise<ApiResult<T>> {
    const {
      signal,
      timeout = DEFAULT_TIMEOUT,
      retries = DEFAULT_RETRIES,
      method = 'GET',
      headers = {},
      body,
    } = options;

    const url = `${this.baseUrl}${path}`;
    const isIdempotent = method === 'GET' || method === 'HEAD';

    qaLog(`API request: ${method} ${url}`, { retries, timeout });

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Combine abort signals
        const combinedSignal = signal
          ? this.combineAbortSignals([signal, controller.signal])
          : controller.signal;

        const requestInit: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          signal: combinedSignal,
        };

        if (body && method !== 'GET' && method !== 'HEAD') {
          requestInit.body = JSON.stringify(body);
        }

        const response = await fetch(url, requestInit);
        clearTimeout(timeoutId);

        return await this.classifyResponse<T>(response, attempt, retries);
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            qaLog(`API request aborted: ${method} ${url}`);
            return {
              kind: 'network_error',
              error: new Error('Request was aborted'),
            };
          }

          // Network error (DNS, connection, etc.)
          if (attempt < retries && isIdempotent) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            qaLog(`Network error, retrying in ${delay}ms: ${error.message}`);
            await this.delay(delay);
            continue;
          }

          qaError(`Network error after ${attempt + 1} attempts: ${error.message}`);
          return {
            kind: 'network_error',
            error,
          };
        }

        qaError(`Unexpected error: ${error}`);
        return {
          kind: 'network_error',
          error: new Error('An unexpected error occurred'),
        };
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      kind: 'network_error',
      error: new Error('Maximum retries exceeded'),
    };
  }

  private async classifyResponse<T>(
    response: Response,
    attempt: number,
    maxRetries: number
  ): Promise<ApiResult<T>> {
    const { status, statusText } = response;

    qaLog(`API response: ${status} ${statusText}`, { attempt, maxRetries });

    // Server errors (5xx) - retry for idempotent requests
    if (status >= 500) {
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        qaLog(`Server error ${status}, retrying in ${delay}ms`);
        await this.delay(delay);
        throw new Error(`Server error ${status}, retrying`);
      }

      qaError(`Server error after ${attempt + 1} attempts: ${status} ${statusText}`);
      return {
        kind: 'server_error',
        status,
        body: await this.safeParseBody(response),
      };
    }

    // Client errors (4xx) - don't retry
    if (status >= 400) {
      qaLog(`Client error: ${status} ${statusText}`);
      return {
        kind: 'client_error',
        status,
        body: await this.safeParseBody(response),
      };
    }

    // Success (2xx) - parse response
    if (status >= 200 && status < 300) {
      try {
        const data = await response.json();
        qaLog(`API success: ${status}`, { dataType: typeof data });
        return {
          kind: 'success',
          data,
          status,
        };
      } catch (error) {
        qaError(`Parse error: ${error}`);
        return {
          kind: 'parse_error',
          error: error instanceof Error ? error : new Error('Failed to parse JSON'),
        };
      }
    }

    // Other status codes
    qaError(`Unexpected status: ${status} ${statusText}`);
    return {
      kind: 'client_error',
      status,
      body: await this.safeParseBody(response),
    };
  }

  private async safeParseBody(response: Response): Promise<unknown> {
    try {
      const text = await response.text();
      if (!text) return null;
      
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch {
      return null;
    }
  }

  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }

      signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }

    return controller.signal;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Convenience methods
export const fetchJson = <T>(path: string, options?: FetchOptions) =>
  apiClient.fetchJson<T>(path, options);

export const get = <T>(path: string, options?: Omit<FetchOptions, 'method'>) =>
  apiClient.fetchJson<T>(path, { ...options, method: 'GET' });

export const post = <T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
  apiClient.fetchJson<T>(path, { ...options, method: 'POST', body });

export const put = <T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
  apiClient.fetchJson<T>(path, { ...options, method: 'PUT', body });

export const del = <T>(path: string, options?: Omit<FetchOptions, 'method'>) =>
  apiClient.fetchJson<T>(path, { ...options, method: 'DELETE' });
