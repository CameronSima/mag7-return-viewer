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
 * GET `url` and parse JSON, translating failures into ApiError.
 *
 * @throws ApiError on network failure (status 0) or a non-2xx response, with
 *         the server's `detail` message when present.
 * @throws DOMException (AbortError) when the request is aborted — left to
 *         propagate so React Query can treat it as a cancellation, not an error.
 */
export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    // Coalesce to null: under exactOptionalPropertyTypes an explicit
    // `undefined` isn't assignable to RequestInit.signal.
    response = await fetch(url, { signal: signal ?? null });
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
