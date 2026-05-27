import type { ReturnsResponse } from "@/types";

/**
 * Fetch daily returns for the MAG7 over the given date range.
 *
 * @param start ISO date string (YYYY-MM-DD), inclusive.
 * @param end ISO date string (YYYY-MM-DD), inclusive.
 * @throws ApiError when the request fails or the server returns an error status.
 */
export async function fetchReturns(
  start: string,
  end: string,
  signal?: AbortSignal,
): Promise<ReturnsResponse> {
  const url = `/api/returns?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

  let response: Response;
  try {
    // Coalesce to null: under exactOptionalPropertyTypes an explicit
    // `undefined` isn't assignable to RequestInit.signal.
    response = await fetch(url, { signal: signal ?? null });
  } catch (err) {
    // Network failure (DNS, offline, CORS preflight rejection, abort)
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Network request failed. Is the backend running?", 0);
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(response);
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as ReturnsResponse;
}

/**
 * Typed error class so callers can distinguish API errors from generic Errors
 * and read the HTTP status code if useful.
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

async function extractErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    return `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
