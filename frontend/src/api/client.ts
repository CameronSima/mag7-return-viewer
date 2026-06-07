/**
 * Shared HTTP client helpers.
 *
 * One place for the error type and the fetch/parse/translate-errors dance so
 * every endpoint module (compare, returns, …) behaves identically.
 */

/**
 * Typed error so callers can distinguish API errors from generic Errors and
 * read the HTTP status code (e.g. 422 means "don't retry, the input is wrong").
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Base URL for the API. Empty in dev (calls stay relative and hit the Vite
 * proxy), and an absolute origin in the Cloudflare Pages build — set via the
 * `VITE_API_BASE_URL` build var — so the static frontend can reach the backend
 * cross-origin. Trailing slash trimmed so `${API_BASE}/api/...` is well-formed.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

/**
 * GET `path` and parse JSON, translating failures into ApiError.
 *
 * `path` is a root-relative path beginning with `/api`; it's prefixed with
 * `API_BASE` so the same call works against the dev proxy and a remote backend.
 *
 * @throws ApiError on network failure (status 0) or a non-2xx response, with
 *         the server's `detail` message when present.
 * @throws DOMException (AbortError) when the request is aborted — left to
 *         propagate so React Query can treat it as a cancellation, not an error.
 */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    // Coalesce to null: under exactOptionalPropertyTypes an explicit
    // `undefined` isn't assignable to RequestInit.signal.
    response = await fetch(`${API_BASE}${path}`, { signal: signal ?? null });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Network request failed. Is the backend running?", 0);
  }

  if (!response.ok) {
    throw new ApiError(await extractErrorDetail(response), response.status);
  }

  return (await response.json()) as T;
}

async function extractErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    return `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
